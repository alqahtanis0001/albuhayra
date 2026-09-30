"use server";

/**
 * الحضور — the owner's day save (spec §3.3; D10, Y6, Z1–Z3). OWNER only:
 * staff `canEdit` does not apply to attendance, and month locks do not either.
 * Only changed rows are posted (Z3); each is compare-and-set on the
 * `updatedAt` it was loaded with, inside one transaction.
 */
import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma";
import { employedOn, settleStatus } from "@/lib/attendance";
import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { AttendanceDaySchema, invalid, type ActionResult } from "@/lib/validation";

export type AttendanceState = ActionResult<{ saved: number }> | null;

/** Thrown inside the transaction when a row moved since it was loaded (Y6/Z3). */
class StaleRowError extends Error {
  constructor() {
    super("attendance row changed");
    this.name = "StaleRowError";
  }
}

type RowData = { checkIn: string | null; checkOut: string | null; note: string | null };

function formError(key: string) {
  return { ok: false as const, error: key, fieldErrors: { rows: key } };
}

export async function saveAttendanceDay(_prev: AttendanceState, formData: FormData): Promise<ActionResult<{ saved: number }>> {
  const { user, establishmentId } = await requireOwner();
  let rows: unknown;
  try {
    rows = JSON.parse(String(formData.get("rows") ?? ""));
  } catch {
    return formError("err.invalidInput");
  }
  const parsed = AttendanceDaySchema.safeParse({ date: formData.get("date"), rows });
  if (!parsed.success) return invalid(parsed.error);
  const { date, rows: posted } = parsed.data;
  if (posted.length === 0) return { ok: true, data: { saved: 0 } };

  const ids = posted.map((r) => r.employeeId);
  const [employees, existing] = await Promise.all([
    db.employee.findMany({
      where: { establishmentId, id: { in: ids } },
      select: { id: true, startDate: true, endDate: true, workDays: true, workStart: true, graceMinutes: true },
    }),
    db.attendanceRecord.findMany({
      where: { establishmentId, date: isoToDate(date), employeeId: { in: ids } },
      select: { id: true, employeeId: true, status: true, statusOverridden: true, checkIn: true, checkOut: true, note: true, updatedAt: true },
    }),
  ]);

  // Rule 11 + Z2: a foreign, unknown or not-employed-that-day employee reads the same.
  type Before = (typeof existing)[number];
  type Change = { employeeId: string; data: ReturnType<typeof settleStatus> & RowData; before: Before | null };
  const plan: Change[] = [];
  for (const row of posted) {
    const e = employees.find((x) => x.id === row.employeeId);
    if (!e || !employedOn(date, dateToISO(e.startDate), e.endDate ? dateToISO(e.endDate) : null)) {
      return formError("err.employeeInvalid");
    }
    const settled = settleStatus(row.status, row.checkIn, e, date);
    const data = { ...settled, checkIn: row.checkIn ?? null, checkOut: row.checkOut ?? null, note: row.note ?? null };
    const before = existing.find((x) => x.employeeId === e.id);
    // Y6: the client must echo the row it loaded — a record it did not see, or a newer one, is a conflict.
    if (before ? row.updatedAt !== before.updatedAt.toISOString() : row.updatedAt !== undefined) {
      return { ok: false, error: "err.concurrentChange" };
    }
    const same =
      before &&
      before.status === data.status && before.statusOverridden === data.statusOverridden &&
      before.checkIn === data.checkIn && before.checkOut === data.checkOut && before.note === data.note;
    if (!same) plan.push({ employeeId: e.id, data, before: before ?? null });
  }
  if (plan.length === 0) return { ok: true, data: { saved: 0 } };

  try {
    await db.$transaction(async (tx) => {
      const fresh = plan.filter((p) => p.before === null);
      if (fresh.length > 0) {
        await tx.attendanceRecord.createMany({
          data: fresh.map((p) => ({ establishmentId, employeeId: p.employeeId, date: isoToDate(date), recordedById: user.id, ...p.data })),
        });
      }
      for (const p of plan.filter((x) => x.before !== null)) {
        const { count } = await tx.attendanceRecord.updateMany({
          where: { establishmentId, employeeId: p.employeeId, date: isoToDate(date), updatedAt: p.before!.updatedAt },
          data: { ...p.data, recordedById: user.id },
        });
        if (count === 0) throw new StaleRowError();
      }
      const saved = await tx.attendanceRecord.findMany({
        where: { establishmentId, date: isoToDate(date), employeeId: { in: plan.map((p) => p.employeeId) } },
        select: { id: true, employeeId: true },
      });
      for (const p of plan) {
        const b = p.before;
        await writeAudit({
          establishmentId, userId: user.id, action: "ATTENDANCE_SET", entity: "AttendanceRecord",
          entityId: saved.find((s) => s.employeeId === p.employeeId)?.id ?? p.employeeId,
          before: b
            ? { date, status: b.status, statusOverridden: b.statusOverridden, checkIn: b.checkIn, checkOut: b.checkOut, note: b.note }
            : undefined,
          after: { date, employeeId: p.employeeId, ...p.data },
          client: tx,
        });
      }
    });
  } catch (error) {
    if (error instanceof StaleRowError) return { ok: false, error: "err.concurrentChange" };
    // Z3: a create racing another create of the same employee-day.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "err.concurrentChange" };
    }
    throw error;
  }

  revalidatePath("/owner/staff", "layout");
  revalidatePath("/staff", "layout");
  return { ok: true, data: { saved: plan.length } };
}
