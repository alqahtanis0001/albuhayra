import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The owner's attendance on real Postgres (spec §3.3; D10, Y6, Z1–Z3). The
 * auth mock is role-aware — `requireOwner` refuses a STAFF session exactly as
 * the real one redirects — so "staff canEdit does not apply" is a real case.
 * The clock is fixed (Date only). 2026-10-04 is a Sunday; 10-09 a Friday.
 */

const OWNER = { user: { id: "u_owner", role: "OWNER", status: "ACTIVE", canEdit: true, establishmentId: "est1" }, establishmentId: "est1" };
const STAFF_CAN_EDIT = { user: { id: "u_staff", role: "STAFF", status: "ACTIVE", canEdit: true, establishmentId: "est1" }, establishmentId: "est1" };

const h = vi.hoisted(() => ({ lite: null as PGlite | null, ctx: null as unknown as typeof OWNER }));

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
const { saveAttendanceDay } = await import("./actions");
const { getDaySheet, getMonthGrid, getLastRecordedDate } = await import("./queries");
const { getEmployeeMonth } = await import("./month");

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await h.lite!.query<T>(sql, params)).rows;
}

function day(date: string, rows: unknown[]): FormData {
  const f = new FormData();
  f.append("date", date);
  f.append("rows", JSON.stringify(rows));
  return f;
}

async function record(employeeId: string, date: string) {
  const [row] = await q<{ status: string; statusOverridden: boolean; checkIn: string | null }>(
    `SELECT "status", "statusOverridden", "checkIn" FROM "AttendanceRecord" WHERE "employeeId" = $1 AND "date" = $2`,
    [employeeId, date],
  );
  return row;
}

/** What the page echoes back: the sheet's own `updatedAt` (a raw PGlite read would parse the timestamp in local time). */
const loaded = async (employeeId: string, date: string) =>
  (await getDaySheet("est1", date)).rows.find((r) => r.employeeId === employeeId)!.record!.updatedAt;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T09:00:00Z"));
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8"));
  await h.lite!.exec(`
    INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'منشأة', 'ABCD2345'), ('est2', 'أخرى', 'WXYZ6789');
    INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId", "firstName", "lastName", "canEdit") VALUES
      ('u_owner', 'o@example.com', 'h', 'OWNER', 'ACTIVE', 'est1', 'سالم', 'الشهري', true),
      ('u_staff', 's@example.com', 'h', 'STAFF', 'ACTIVE', 'est1', 'فهد', 'العتيبي', true);
    INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt") VALUES
      ('p_a', 'est1', 'أحمد', 'EMPLOYEE', now()), ('p_b', 'est1', 'بدر', 'EMPLOYEE', now()),
      ('p_new', 'est1', 'جديد', 'EMPLOYEE', now()), ('p_old', 'est1', 'سابق', 'EMPLOYEE', now()),
      ('p_x', 'est2', 'غريب', 'EMPLOYEE', now());
    INSERT INTO "Employee" ("id", "establishmentId", "partyId", "startDate", "endDate", "status", "workStart", "graceMinutes", "updatedAt") VALUES
      ('emp_a', 'est1', 'p_a', '2026-09-01', NULL, 'ACTIVE', '08:00', 10, now()),
      ('emp_b', 'est1', 'p_b', '2026-09-01', NULL, 'ACTIVE', NULL, NULL, now()),
      ('emp_new', 'est1', 'p_new', '2026-10-20', NULL, 'ACTIVE', NULL, NULL, now()),
      ('emp_old', 'est1', 'p_old', '2026-09-01', '2026-09-30', 'ENDED', NULL, NULL, now()),
      ('emp_x', 'est2', 'p_x', '2026-09-01', NULL, 'ACTIVE', NULL, NULL, now());
  `);
}, 60_000);

beforeEach(() => void (h.ctx = OWNER));
afterAll(() => vi.useRealTimers());

describe("the day sheet and its save (D10, Z1, Z2)", () => {
  it("lists those employed that day (Z2): hired later and ended before are left out, even ENDED ones in range", async () => {
    expect((await getDaySheet("est1", "2026-10-05")).rows.map((r) => r.employeeId)).toEqual(["emp_a", "emp_b"]);
    expect((await getDaySheet("est1", "2026-09-28")).rows.map((r) => r.employeeId)).toEqual(["emp_a", "emp_b", "emp_old"]);
    const friday = await getDaySheet("est1", "2026-10-02");
    expect(friday.rows[0]).toMatchObject({ workDay: false, prefill: "HOLIDAY", record: null });
  });

  it("creates rows; the server decides overrides (Z1)", async () => {
    const result = await saveAttendanceDay(null, day("2026-10-05", [
      { employeeId: "emp_a", status: "PRESENT", checkIn: "08:05", statusOverridden: true },
      { employeeId: "emp_b", status: "ABSENT" },
    ]));
    expect(result).toEqual({ ok: true, data: { saved: 2 } });
    expect(await record("emp_a", "2026-10-05")).toMatchObject({ status: "PRESENT", statusOverridden: false, checkIn: "08:05" });
    expect(await record("emp_b", "2026-10-05")).toMatchObject({ status: "ABSENT", statusOverridden: true });
    const sheet = await getDaySheet("est1", "2026-10-05");
    expect(sheet.rows[0]).toMatchObject({ record: { status: "PRESENT" }, derived: "PRESENT" });
    expect(await q(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "action" = 'ATTENDANCE_SET'`)).toEqual([{ n: 2 }]);
  });

  it("an unchanged second save writes nothing (idempotent)", async () => {
    const again = await saveAttendanceDay(null, day("2026-10-05", [
      { employeeId: "emp_a", status: "PRESENT", checkIn: "08:05", updatedAt: await loaded("emp_a", "2026-10-05") },
    ]));
    expect(again).toEqual({ ok: true, data: { saved: 0 } });
    expect(await q(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "action" = 'ATTENDANCE_SET'`)).toEqual([{ n: 2 }]);
  });

  it("an update: a posted status equal to the derived one is not an override; a different one is", async () => {
    const lateIn = [{ employeeId: "emp_a", status: "LATE", checkIn: "08:30", updatedAt: await loaded("emp_a", "2026-10-05") }];
    expect(await saveAttendanceDay(null, day("2026-10-05", lateIn))).toEqual({ ok: true, data: { saved: 1 } });
    expect(await record("emp_a", "2026-10-05")).toMatchObject({ status: "LATE", statusOverridden: false });
    const forgiven = [{ employeeId: "emp_a", status: "PRESENT", checkIn: "08:30", updatedAt: await loaded("emp_a", "2026-10-05") }];
    expect(await saveAttendanceDay(null, day("2026-10-05", forgiven))).toEqual({ ok: true, data: { saved: 1 } });
    expect(await record("emp_a", "2026-10-05")).toMatchObject({ status: "PRESENT", statusOverridden: true });
  });

  it("Y6/Z3: a stale updatedAt, or none for a row that now exists, is err.concurrentChange and writes nothing", async () => {
    const stale = [{ employeeId: "emp_a", status: "ABSENT", updatedAt: "2026-01-01T00:00:00.000Z" }];
    expect(await saveAttendanceDay(null, day("2026-10-05", stale))).toEqual({ ok: false, error: "err.concurrentChange" });
    expect(await saveAttendanceDay(null, day("2026-10-05", [{ employeeId: "emp_b", status: "LEAVE" }])))
      .toEqual({ ok: false, error: "err.concurrentChange" });
    expect(await record("emp_a", "2026-10-05")).toMatchObject({ status: "PRESENT" });
    expect(await record("emp_b", "2026-10-05")).toMatchObject({ status: "ABSENT" });
  });

  it("Z2 + rule 11: not yet hired, ended before, or another establishment's employee — all err.employeeInvalid", async () => {
    for (const employeeId of ["emp_new", "emp_old", "emp_x"]) {
      expect(await saveAttendanceDay(null, day("2026-10-05", [{ employeeId, status: "PRESENT" }])), employeeId)
        .toMatchObject({ ok: false, fieldErrors: { rows: "err.employeeInvalid" } });
    }
    // An ENDED employee's own past day is still editable.
    expect(await saveAttendanceDay(null, day("2026-09-28", [{ employeeId: "emp_old", status: "LEAVE" }]))).toEqual({ ok: true, data: { saved: 1 } });
  });

  it("the future is refused by the schema; the day stays unsaved", async () => {
    expect(await saveAttendanceDay(null, day("2026-10-07", [{ employeeId: "emp_a", status: "PRESENT" }])))
      .toMatchObject({ ok: false, fieldErrors: { date: "err.dateFuture" } });
  });

  it("lead's Z1 ruling: «حاضر» on a Friday without times is kept as the owner's override, not reset to عطلة", async () => {
    expect(await saveAttendanceDay(null, day("2026-10-02", [{ employeeId: "emp_b", status: "PRESENT" }]))).toEqual({ ok: true, data: { saved: 1 } });
    expect(await record("emp_b", "2026-10-02")).toMatchObject({ status: "PRESENT", statusOverridden: true });
  });

  it("getLastRecordedDate: the latest earlier day with any record, or null", async () => {
    expect(await getLastRecordedDate("est1", "2026-10-05")).toBe("2026-10-02");
    expect(await getLastRecordedDate("est1", "2026-10-06")).toBe("2026-10-05");
    expect(await getLastRecordedDate("est1", "2026-09-01")).toBeNull();
    expect(await getLastRecordedDate("est2", "2026-12-31")).toBeNull();
  });

  it("spec §3.3: STAFF with canEdit cannot save attendance", async () => {
    h.ctx = STAFF_CAN_EDIT as typeof OWNER;
    await expect(saveAttendanceDay(null, day("2026-10-06", [{ employeeId: "emp_a", status: "ABSENT" }]))).rejects.toThrow("NEXT_REDIRECT");
    expect(await record("emp_a", "2026-10-06")).toBeUndefined();
  });
});

describe("the monthly grid and the monthly sheet", () => {
  it("counts statuses and hours per employee; days outside the employment have no status", async () => {
    await saveAttendanceDay(null, day("2026-10-04", [{ employeeId: "emp_a", status: "PRESENT", checkIn: "08:00", checkOut: "16:30", note: "مهمة" }]));
    const grid = await getMonthGrid("est1", "2026-10");
    expect(grid.days).toHaveLength(31);
    expect(grid.rows.map((r) => r.employeeId)).toEqual(["emp_a", "emp_b", "emp_new"]);
    const a = grid.rows[0]!;
    expect(a.totals).toMatchObject({ PRESENT: 2, ABSENT: 0 });
    expect(a.minutes).toBe(510);
    expect(grid.rows[2]!.cells.find((c) => c.date === "2026-10-05")).toMatchObject({ employed: false, status: null });
  });

  it("the owner's monthly sheet keeps notes and shows no salary without a period", async () => {
    const month = await getEmployeeMonth("est1", "emp_a", "2026-10");
    expect(month?.days.find((d) => d.date === "2026-10-04")?.record).toMatchObject({ note: "مهمة", minutes: 510 });
    expect(month?.salary).toBeNull();
    expect(await getEmployeeMonth("est1", "emp_x", "2026-10")).toBeNull();
  });
});
