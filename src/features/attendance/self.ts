"use server";

/**
 * «حضوري» self check-in/out (spec §3.3; X7, D11, Y5, Z5, Z6). A STAFF login
 * linked to an employee records **times only, on its own row, from the server
 * clock** — one `now` gives both the date and the time. Nothing posted is
 * read: the employee comes from the session, the time from the server. The
 * status is derived from the check-in unless the owner overrode it.
 */
import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma";
import { derivedStatus } from "@/lib/attendance";
import { writeAudit } from "@/lib/audit";
import { isoToDate, nowRiyadhHHMM, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/validation";

import { canClock, ownEmployee } from "./own";

export type ClockState = ActionResult<{ at: string }> | null;

function revalidateSelf(): void {
  revalidatePath("/staff", "layout");
  revalidatePath("/owner/staff", "layout");
}

async function clockContext() {
  const { establishmentId, userId, employee } = await ownEmployee();
  if (!employee) return { error: "err.notLinkedEmployee" as const };
  const now = new Date();
  const today = todayISO(now);
  // Not yet started or already ended: one neutral key (R-L9 note 3).
  if (!canClock(employee, today)) return { error: "err.outsideEmployment" as const };
  const record = await db.attendanceRecord.findFirst({
    where: { establishmentId, employeeId: employee.id, date: isoToDate(today) },
    select: { id: true, checkIn: true, checkOut: true, statusOverridden: true, status: true },
  });
  return { establishmentId, userId, employee, today, time: nowRiyadhHHMM(now), record };
}

/** Anything posted (an `employeeId` included) is ignored — Z6. */
export async function checkIn(_prev?: ClockState, _formData?: FormData): Promise<ActionResult<{ at: string }>> {
  const ctx = await clockContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { establishmentId, userId, employee, today, time, record } = ctx;
  if (record?.checkIn) return { ok: false, error: "err.alreadyCheckedIn" };
  const derived = derivedStatus(time, employee, today)!;

  try {
    await db.$transaction(async (tx) => {
      // Z6: update the owner's row for today if there is one, else create ours.
      let recordId = record?.id;
      if (record) {
        // Compare-and-set on what was read, the override flag included (R-L9
        // note 1): an owner override landing in between is never overwritten.
        const { count } = await tx.attendanceRecord.updateMany({
          where: {
            establishmentId, employeeId: employee.id, date: isoToDate(today),
            checkIn: null, statusOverridden: record.statusOverridden,
          },
          data: { checkIn: time, ...(record.statusOverridden ? {} : { status: derived }) },
        });
        if (count === 0) throw new RaceError();
      } else {
        const created = await tx.attendanceRecord.create({
          data: {
            establishmentId, employeeId: employee.id, date: isoToDate(today), status: derived,
            statusOverridden: false, checkIn: time, recordedById: userId,
          },
          select: { id: true },
        });
        recordId = created.id;
      }
      await writeAudit({
        establishmentId, userId, action: "CHECK_IN", entity: "AttendanceRecord", entityId: recordId!,
        after: { date: today, checkIn: time, status: record?.statusOverridden ? record.status : derived },
        client: tx,
      });
    });
  } catch (error) {
    if (error instanceof RaceError) {
      // Lost to another write: already checked in, or the owner changed the row.
      const now = await db.attendanceRecord.findFirst({
        where: { establishmentId, employeeId: employee.id, date: isoToDate(today) },
        select: { checkIn: true },
      });
      return { ok: false, error: now?.checkIn ? "err.alreadyCheckedIn" : "err.concurrentChange" };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "err.alreadyCheckedIn" };
    }
    throw error;
  }
  revalidateSelf();
  return { ok: true, data: { at: time } };
}

export async function checkOut(_prev?: ClockState, _formData?: FormData): Promise<ActionResult<{ at: string }>> {
  const ctx = await clockContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { establishmentId, userId, employee, today, time, record } = ctx;
  if (!record?.checkIn) return { ok: false, error: "err.notCheckedIn" };
  if (record.checkOut) return { ok: false, error: "err.alreadyCheckedOut" };
  // Z5/N1: strictly later — the same minute is a time-order error.
  if (time <= record.checkIn) return { ok: false, error: "err.timeOrder" };

  const changed = await db.$transaction(async (tx) => {
    const { count } = await tx.attendanceRecord.updateMany({
      where: { establishmentId, employeeId: employee.id, date: isoToDate(today), checkIn: record.checkIn, checkOut: null },
      data: { checkOut: time },
    });
    if (count === 0) return 0;
    await writeAudit({
      establishmentId, userId, action: "CHECK_OUT", entity: "AttendanceRecord", entityId: record.id,
      after: { date: today, checkOut: time }, client: tx,
    });
    return count;
  });
  if (changed === 0) return { ok: false, error: "err.alreadyCheckedOut" };
  revalidateSelf();
  return { ok: true, data: { at: time } };
}

/** The check-in compare-and-set matched no row (sorted out after the rollback). */
class RaceError extends Error {
  constructor() {
    super("attendance row changed");
    this.name = "RaceError";
  }
}
