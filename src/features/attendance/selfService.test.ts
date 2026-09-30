import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * «حضوري» on real Postgres (spec §3.1, §3.3, §3.5; X3, X7, D11, Y5, Y11, Z5,
 * Z6). The self-service isolation test: a linked STAFF session reads and
 * writes only its own employee — row, month, payslips, salary months — and
 * never another's; an unlinked login gets nothing. The auth mock is
 * role-aware; the clock is fixed per step (Date only).
 */

const ctxOf = (id: string, role: "OWNER" | "STAFF") => ({
  user: { id, role, status: "ACTIVE", canEdit: true, establishmentId: "est1" },
  establishmentId: "est1",
});
const OWNER = ctxOf("u_owner", "OWNER");

const h = vi.hoisted(() => ({ lite: null as PGlite | null, ctx: null as unknown as ReturnType<typeof ctxOf> }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => {
  const as = (role?: string) => async () => {
    if (role && h.ctx.user.role !== role) throw new Error("NEXT_REDIRECT");
    return h.ctx;
  };
  return { requireUser: as(), requireMember: as(), requireOwner: as("OWNER"), requireStaff: as("STAFF"), requireCanEdit: as() };
});
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgliteClient } = await import("@/lib/testing/pgliteClient");
  h.lite = new PGlite();
  return { db: pgliteClient(h.lite) };
});

await import("@/lib/db");
const { createEmployee } = await import("@/features/employees/actions");
const { saveAttendanceDay } = await import("./actions");
const { checkIn, checkOut } = await import("./self");
const { getMySelf, getMyMonth, getMyPayslips, getMyPayslip, getMySalaryInstalments } = await import("./mine");
const { hasEmployeeLink, canClock } = await import("./own");
const { ensureSalaryInstalments } = await import("@/features/payroll/generate");

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
/** Riyadh wall clock on a given day. */
const at = (iso: string, hhmm: string) => vi.setSystemTime(new Date(`${iso}T${hhmm}:00+03:00`));
const as = (userId: string, role: "OWNER" | "STAFF" = "STAFF") => void (h.ctx = ctxOf(userId, role));

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await h.lite!.query<T>(sql, params)).rows;
}
const row = async (employeeId: string, date: string) =>
  (await q<{ status: string; statusOverridden: boolean; checkIn: string | null; checkOut: string | null }>(
    `SELECT "status", "statusOverridden", "checkIn", "checkOut" FROM "AttendanceRecord" WHERE "employeeId" = $1 AND "date" = $2`,
    [employeeId, date],
  ))[0];

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

let empA = "";
let empB = "";

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  at("2026-10-05", "09:00");
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8"));
  await h.lite!.exec(`
    INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'منشأة', 'ABCD2345');
    INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId", "firstName", "lastName") VALUES
      ('u_owner', 'o@example.com', 'h', 'OWNER', 'ACTIVE', 'est1', 'سالم', 'الشهري'),
      ('u_a', 'a@example.com', 'h', 'STAFF', 'ACTIVE', 'est1', 'أحمد', 'ع'),
      ('u_b', 'b@example.com', 'h', 'STAFF', 'ACTIVE', 'est1', 'بدر', 'ع'),
      ('u_c', 'c@example.com', 'h', 'STAFF', 'ACTIVE', 'est1', 'جابر', 'ع'),
      ('u_old', 'x@example.com', 'h', 'STAFF', 'ACTIVE', 'est1', 'سابق', 'ع'),
      ('u_new', 'n@example.com', 'h', 'STAFF', 'ACTIVE', 'est1', 'قادم', 'ع');
    INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES ('cat_sal', 'est1', 'رواتب', 'OUT');
    INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt") VALUES
      ('p_old', 'est1', 'موظف سابق', 'EMPLOYEE', now()), ('p_new', 'est1', 'موظف قادم', 'EMPLOYEE', now());
    INSERT INTO "Employee" ("id", "establishmentId", "partyId", "userId", "startDate", "endDate", "status", "updatedAt")
      VALUES ('emp_old', 'est1', 'p_old', 'u_old', '2026-09-01', '2026-09-30', 'ENDED', now()),
             ('emp_new', 'est1', 'p_new', 'u_new', '2026-12-01', NULL, 'ACTIVE', now());
    INSERT INTO "AttendanceRecord" ("id", "establishmentId", "employeeId", "date", "status", "note", "recordedById", "updatedAt")
      VALUES ('att_old', 'est1', 'emp_old', '2026-09-15', 'LEAVE', 'ملاحظة المالك', 'u_owner', now());
  `);
  as("u_owner", "OWNER");
  const make = async (name: string, userId: string, payDay: string) => {
    const r = await createEmployee(null, form({
      name, startDate: "2026-09-01", basicSalaryHalalas: "400000", payDay, userId, workStart: "08:00", graceMinutes: "10",
    }));
    return (r as { data: { id: string } }).data.id;
  };
  empA = await make("أحمد العامل", "u_a", "27");
  empB = await make("بدر العامل", "u_b", "28");
}, 60_000);

beforeEach(() => as("u_owner", "OWNER"));
afterAll(() => vi.useRealTimers());

describe("self check-in / check-out (X7, D11, Y5, Z5)", () => {
  it("an unlinked login is refused and reads nothing", async () => {
    as("u_c");
    expect(await checkIn()).toEqual({ ok: false, error: "err.notLinkedEmployee" });
    expect(await getMySelf()).toBeNull();
    expect(await getMyPayslips()).toBeNull();
    expect(await getMySalaryInstalments()).toBeNull();
    expect(await hasEmployeeLink("est1", "u_c")).toBe(false);
    expect(await hasEmployeeLink("est1", "u_a")).toBe(true);
  });

  it("times only, own row, server clock; late derived past start + grace; a posted employeeId is ignored (Z6)", async () => {
    at("2026-10-05", "08:25");
    as("u_a");
    expect(await checkIn(null, form({ employeeId: empB, time: "07:00" }))).toEqual({ ok: true, data: { at: "08:25" } });
    expect(await row(empA, "2026-10-05")).toEqual({ status: "LATE", statusOverridden: false, checkIn: "08:25", checkOut: null });
    expect(await row(empB, "2026-10-05")).toBeUndefined();
    expect(await checkIn()).toEqual({ ok: false, error: "err.alreadyCheckedIn" });
    // R-L9 note 2: a created row's audit names the record, not the employee.
    const [audit] = await q<{ entityId: string }>(`SELECT "entityId" FROM "AuditLog" WHERE "action" = 'CHECK_IN'`);
    const [rec] = await q<{ id: string }>(`SELECT "id" FROM "AttendanceRecord" WHERE "employeeId" = $1 AND "date" = '2026-10-05'`, [empA]);
    expect(audit!.entityId).toBe(rec!.id);
  });

  it("check-out: the same minute is err.timeOrder (Z5); later saves once; a second is refused", async () => {
    as("u_a");
    expect(await checkOut()).toEqual({ ok: false, error: "err.timeOrder" });
    at("2026-10-05", "16:40");
    expect(await checkOut()).toEqual({ ok: true, data: { at: "16:40" } });
    expect(await checkOut()).toEqual({ ok: false, error: "err.alreadyCheckedOut" });
    const self = await getMySelf();
    expect(self?.record).toMatchObject({ checkIn: "08:25", checkOut: "16:40", minutes: 495, note: null });
  });

  it("out before in is err.notCheckedIn; a non-work day checks in PRESENT, never late", async () => {
    at("2026-10-09", "11:00"); // Friday
    as("u_b");
    expect(await checkOut()).toEqual({ ok: false, error: "err.notCheckedIn" });
    expect(await checkIn()).toEqual({ ok: true, data: { at: "11:00" } });
    expect(await row(empB, "2026-10-09")).toMatchObject({ status: "PRESENT", statusOverridden: false });
  });

  it("lead's Z1 ruling: the owner's early «حاضر» (no times) stays open — a later late check-in derives LATE", async () => {
    at("2026-10-12", "07:00");
    expect(await saveAttendanceDay(null, form({ date: "2026-10-12", rows: JSON.stringify([{ employeeId: empA, status: "PRESENT" }]) })))
      .toEqual({ ok: true, data: { saved: 1 } });
    expect(await row(empA, "2026-10-12")).toMatchObject({ status: "PRESENT", statusOverridden: false });
    at("2026-10-12", "08:40");
    as("u_a");
    expect(await checkIn()).toEqual({ ok: true, data: { at: "08:40" } });
    expect(await row(empA, "2026-10-12")).toMatchObject({ status: "LATE", statusOverridden: false, checkIn: "08:40" });
  });

  it("the owner's override is kept: a check-in on a day marked إجازة sets the time only", async () => {
    at("2026-10-11", "07:30");
    expect(await saveAttendanceDay(null, form({ date: "2026-10-11", rows: JSON.stringify([{ employeeId: empB, status: "LEAVE" }]) })))
      .toEqual({ ok: true, data: { saved: 1 } });
    at("2026-10-11", "09:10");
    as("u_b");
    expect(await checkIn()).toEqual({ ok: true, data: { at: "09:10" } });
    expect(await row(empB, "2026-10-11")).toMatchObject({ status: "LEAVE", statusOverridden: true, checkIn: "09:10" });
  });

  it("Z5: an ENDED employee cannot clock but still reads its own past month, without the owner's notes (Z6)", async () => {
    as("u_old");
    expect(await checkIn()).toEqual({ ok: false, error: "err.outsideEmployment" });
    // Not yet started reads the same neutral key (R-L9 note 3).
    as("u_new");
    expect(await checkIn()).toEqual({ ok: false, error: "err.outsideEmployment" });
    as("u_old");
    // The status is checked as well as the dates (belt and braces — ENDED always has a past end today).
    const ended = { id: "e", name: "x", status: "ENDED" as const, startDate: "2026-09-01", endDate: null,
      workDays: 31, workStart: null, workEnd: null, graceMinutes: null };
    expect(canClock(ended, "2026-10-01")).toBe(false);
    expect(canClock({ ...ended, status: "ACTIVE" }, "2026-10-01")).toBe(true);
    expect(canClock({ ...ended, status: "ACTIVE" }, "2026-08-31")).toBe(false);
    const month = await getMyMonth("2026-09");
    expect(month?.employee.id).toBe("emp_old");
    expect(month?.days.find((d) => d.date === "2026-09-15")?.record).toMatchObject({ status: "LEAVE", note: null });
  });
});

describe("the isolation test: own data only (spec §3.1, §3.5)", () => {
  it("month, payslips and salary months are the session's own — never the other employee's", async () => {
    at("2026-10-12", "10:00");
    as("u_a");
    const month = await getMyMonth("2026-10");
    expect(month?.employee.id).toBe(empA);
    expect(month?.days.some((d) => d.record?.checkIn === "09:10")).toBe(false); // B's check-in
    const slips = await getMyPayslips();
    const ownPeriods = await q<{ periodYm: string }>(`SELECT "periodYm" FROM "SalaryPeriod" WHERE "employeeId" = $1 ORDER BY 1 DESC`, [empA]);
    expect(slips?.map((s) => s.periodYm)).toEqual(ownPeriods.map((p) => p.periodYm));
    expect((await getMyPayslip("2026-10"))?.employee).toMatchObject({ id: empA, name: "أحمد العامل" });
    const mine = await getMySalaryInstalments();
    const ownRows = await q<{ n: number }>(
      `SELECT count(*)::int AS n FROM "Instalment" i JOIN "Plan" p ON p."id" = i."planId" WHERE p."employeeId" = $1`, [empA],
    );
    expect(mine).toHaveLength(ownRows[0]!.n);
    expect(mine?.every((m) => m.dueDate.endsWith("-27"))).toBe(true); // A's pay day; B's is the 28th
  });

  it("Y11: a STAFF session's generation is forced to its own employee, whatever id it passes", async () => {
    at("2026-11-02", "10:00"); // December is now due for both
    as("u_a");
    await ensureSalaryInstalments("est1", empB);
    const months = async (id: string) =>
      (await q<{ periodYm: string }>(`SELECT "periodYm" FROM "SalaryPeriod" WHERE "employeeId" = $1 ORDER BY 1`, [id])).map((r) => r.periodYm);
    expect(await months(empA)).toContain("2026-12");
    expect(await months(empB)).not.toContain("2026-12");
    as("u_c");
    await ensureSalaryInstalments("est1", empB);
    expect(await months(empB)).not.toContain("2026-12");
  });
});
