import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma";

/**
 * CP2 guards: which `requireX` each attendance / deduction entry point calls —
 * the owner's with `requireOwner` (staff `canEdit` never applies, spec §3.3),
 * self-service with `requireStaff` — that nothing is written when the guard
 * refuses, and the two P2002 races (Z3, Z6) the real database cannot stage on
 * one PGlite connection.
 */

const h = vi.hoisted(() => ({
  guards: [] as string[],
  refuse: null as string | null,
  writes: [] as string[],
  answers: new Map<string, unknown>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => {
  const guard = (name: string) => async () => {
    h.guards.push(name);
    if (h.refuse === name) throw new Error("NEXT_REDIRECT");
    return { user: { id: "u_1", role: name === "requireStaff" ? "STAFF" : "OWNER" }, establishmentId: "est_1" };
  };
  return {
    requireUser: guard("requireUser"),
    requireMember: guard("requireMember"),
    requireOwner: guard("requireOwner"),
    requireStaff: guard("requireStaff"),
    requireCanEdit: guard("requireCanEdit"),
  };
});
vi.mock("@/lib/db", () => {
  const model = (name: string) =>
    new Proxy({}, {
      get: (_t, method) => async () => {
        const key = `${name}.${String(method)}`;
        if (/create|update|delete/i.test(String(method))) h.writes.push(key);
        const a = h.answers.get(key);
        if (a instanceof Error) throw a;
        if (h.answers.has(key)) return a;
        if (String(method) === "findMany" || String(method) === "groupBy") return [];
        if (/Many$/.test(String(method))) return { count: 1 };
        if (String(method) === "aggregate") return { _sum: {} };
        if (String(method) === "count") return 0;
        if (String(method) === "create") return { id: `${name}_new` };
        return null;
      },
    });
  const db: Record<string, unknown> = {};
  for (const m of ["establishment", "employee", "attendanceRecord", "salaryPeriod", "salaryDeduction", "instalment", "plan", "transaction", "auditLog"]) {
    db[m] = model(m);
  }
  db.$transaction = async (fn: (tx: unknown) => unknown) => fn(db);
  return { db };
});

const { saveAttendanceDay } = await import("./actions");
const { checkIn, checkOut } = await import("./self");
const { getMySelf, getMyMonth, getMyPayslips, getMyPayslip, getMySalaryInstalments } = await import("./mine");
const { addDeduction, deleteDeduction } = await import("@/features/payroll/deductions");

const P2002 = () => new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "7" });
const EMPLOYEE = {
  id: "emp_1", status: "ACTIVE", startDate: new Date("2020-01-01T00:00:00Z"), endDate: null, workDays: 127,
  workStart: null, workEnd: null, graceMinutes: null, party: { name: "أحمد" },
};

function dayForm(): FormData {
  const f = new FormData();
  f.append("date", "2020-01-02");
  f.append("rows", JSON.stringify([{ employeeId: "emp_1", status: "ABSENT" }]));
  return f;
}
function deductionForm(): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries({ periodYm: "2020-01", amountHalalas: "1", reason: "غياب" })) f.append(k, v);
  return f;
}

beforeEach(() => {
  h.guards = [];
  h.refuse = null;
  h.writes = [];
  h.answers.clear();
  h.answers.set("employee.findFirst", EMPLOYEE);
  h.answers.set("employee.findMany", [EMPLOYEE]);
});

describe("owner entry points call requireOwner and nothing weaker", () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ["saveAttendanceDay", () => saveAttendanceDay(null, dayForm())],
    ["addDeduction", () => addDeduction("emp_1", null, deductionForm())],
    ["deleteDeduction", () => deleteDeduction("ded_1")],
  ];
  it.each(calls)("%s", async (_n, call) => {
    await call();
    expect(h.guards).toEqual(["requireOwner"]);
  });
  it.each(calls)("%s writes nothing when requireOwner refuses", async (_n, call) => {
    h.refuse = "requireOwner";
    await expect(call()).rejects.toThrow("NEXT_REDIRECT");
    expect(h.writes).toEqual([]);
  });
});

describe("self-service calls requireStaff (the link is read from the DB after it)", () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ["checkIn", () => checkIn()],
    ["checkOut", () => checkOut()],
    ["getMySelf", () => getMySelf()],
    ["getMyMonth", () => getMyMonth("2020-01")],
    ["getMyPayslips", () => getMyPayslips()],
    ["getMyPayslip", () => getMyPayslip("2020-01")],
    ["getMySalaryInstalments", () => getMySalaryInstalments()],
  ];
  it.each(calls)("%s", async (_n, call) => {
    await call();
    expect(h.guards[0]).toBe("requireStaff");
    expect(h.guards.every((g) => g === "requireStaff")).toBe(true);
  });
  it.each(calls)("%s writes nothing when requireStaff refuses", async (_n, call) => {
    h.refuse = "requireStaff";
    await expect(call()).rejects.toThrow("NEXT_REDIRECT");
    expect(h.writes).toEqual([]);
  });
});

describe("the P2002 races", () => {
  it("Z3: a day-save create racing another create is err.concurrentChange", async () => {
    h.answers.set("attendanceRecord.createMany", P2002());
    expect(await saveAttendanceDay(null, dayForm())).toEqual({ ok: false, error: "err.concurrentChange" });
  });

  it("Z6: a check-in create racing another is err.alreadyCheckedIn", async () => {
    h.answers.set("attendanceRecord.create", P2002());
    expect(await checkIn()).toEqual({ ok: false, error: "err.alreadyCheckedIn" });
  });

  it("any other database error is not disguised", async () => {
    h.answers.set("attendanceRecord.create", new Error("boom"));
    await expect(checkIn()).rejects.toThrow("boom");
  });
});
