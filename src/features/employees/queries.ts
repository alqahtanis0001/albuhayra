import "server-only";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { dateToISO, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { fullName, NAME_SELECT } from "@/lib/names";
import { grossOf, ymOf } from "@/lib/payroll";
import { AllowanceTypeEnum, type AllowanceTypeValue } from "@/lib/validation";

/**
 * الموظفون — reads (docs/V12B-DESIGN.md §4, D12, Y7, Y9). Owner pages call
 * these after `requireOwner()` (and `ensureSalaryInstalments`) with the
 * session's establishment; every query is scoped by it, and a foreign id reads
 * as missing (rule 11). No `Date` crosses the boundary — ISO strings only.
 */

export type AllowanceLine = { type: AllowanceTypeValue; label: string | null; amountHalalas: number };

export type EmployeeRow = {
  id: string;
  partyId: string;
  name: string;
  jobTitle: string | null;
  startDate: string;
  endDate: string | null;
  status: "ACTIVE" | "ENDED";
  grossHalalas: number | null;
  payDay: number | null;
  hasLogin: boolean;
};

const ROW_SELECT = {
  id: true, partyId: true, jobTitle: true, startDate: true, endDate: true, status: true,
  basicSalaryHalalas: true, payDay: true, userId: true,
  party: { select: { name: true } },
  allowances: { select: { type: true, label: true, amountHalalas: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.EmployeeSelect;

type RowShape = {
  id: string; partyId: string; jobTitle: string | null; startDate: Date; endDate: Date | null;
  status: "ACTIVE" | "ENDED"; basicSalaryHalalas: number | null; payDay: number | null; userId: string | null;
  party: { name: string }; allowances: AllowanceLine[];
};

function toRow(e: RowShape): EmployeeRow {
  return {
    id: e.id,
    partyId: e.partyId,
    name: e.party.name,
    jobTitle: e.jobTitle,
    startDate: dateToISO(e.startDate),
    endDate: e.endDate ? dateToISO(e.endDate) : null,
    status: e.status,
    grossHalalas: e.basicSalaryHalalas === null ? null : grossOf(e.basicSalaryHalalas, e.allowances),
    payDay: e.payDay,
    hasLogin: e.userId !== null,
  };
}

export async function listEmployees(
  establishmentId: string,
  filter: { status?: "ACTIVE" | "ENDED" } = {},
): Promise<EmployeeRow[]> {
  const rows = await db.employee.findMany({
    where: { establishmentId, ...(filter.status ? { status: filter.status } : {}) },
    select: ROW_SELECT,
    orderBy: [{ party: { name: "asc" } }, { id: "asc" }],
  });
  return rows.map(toRow);
}

export type SalaryMonthSummary = {
  periodYm: string;
  instalmentId: string;
  dueDate: string;
  grossHalalas: number;
  deductionsHalalas: number;
  netHalalas: number;
  paidHalalas: number;
  remainingHalalas: number;
  /** Y7: «صرف راتب» is offered only when this is true (plan OPEN, something left). */
  payable: boolean;
};

export type EmployeeDetail = EmployeeRow & {
  phone: string | null;
  email: string | null;
  notes: string | null;
  workDays: number;
  workStart: string | null;
  workEnd: string | null;
  graceMinutes: number | null;
  basicSalaryHalalas: number | null;
  allowances: AllowanceLine[];
  userId: string | null;
  loginName: string | null;
  /** The OPEN «راتب شهري» plan, if any. */
  salaryPlanId: string | null;
  /** Y7: the current month only; null when none was generated. */
  thisMonth: SalaryMonthSummary | null;
  /** The latest 12 salary months, newest first — links to their payslips. */
  months: SalaryMonthSummary[];
};

async function monthSummaries(establishmentId: string, employeeId: string, where: { periodYm?: string }, take: number) {
  const periods = await db.salaryPeriod.findMany({
    where: { establishmentId, employeeId, ...where },
    select: { id: true, periodYm: true, instalmentId: true, grossHalalas: true },
    orderBy: { periodYm: "desc" },
    take,
  });
  if (periods.length === 0) return [];
  const [instalments, deductions] = await Promise.all([
    db.instalment.findMany({
      where: { establishmentId, id: { in: periods.map((p) => p.instalmentId) } },
      select: { id: true, dueDate: true, amountDueHalalas: true, paidHalalas: true, plan: { select: { state: true } } },
    }),
    db.salaryDeduction.groupBy({
      by: ["salaryPeriodId"],
      where: { establishmentId, salaryPeriodId: { in: periods.map((p) => p.id) } },
      _sum: { amountHalalas: true },
    }),
  ]);
  return periods.flatMap((p): SalaryMonthSummary[] => {
    const inst = instalments.find((i) => i.id === p.instalmentId);
    if (!inst) return [];
    const deductionsHalalas = Number(deductions.find((d) => d.salaryPeriodId === p.id)?._sum.amountHalalas ?? 0);
    const remainingHalalas = Math.max(0, inst.amountDueHalalas - inst.paidHalalas);
    return [{
      periodYm: p.periodYm,
      instalmentId: inst.id,
      dueDate: dateToISO(inst.dueDate),
      grossHalalas: p.grossHalalas,
      deductionsHalalas,
      netHalalas: inst.amountDueHalalas,
      paidHalalas: inst.paidHalalas,
      remainingHalalas,
      payable: inst.plan.state === "OPEN" && remainingHalalas > 0,
    }];
  });
}

export async function getEmployee(
  establishmentId: string,
  employeeId: string,
  today: string = todayISO(),
): Promise<EmployeeDetail | null> {
  const e = await db.employee.findFirst({
    where: { establishmentId, id: employeeId },
    select: {
      ...ROW_SELECT,
      notes: true, workDays: true, workStart: true, workEnd: true, graceMinutes: true,
      party: { select: { name: true, phone: true, email: true } },
      user: { select: NAME_SELECT },
    },
  });
  if (!e) return null;
  const [plan, months] = await Promise.all([
    db.plan.findFirst({
      where: { establishmentId, employeeId: e.id, kind: "SALARY", state: "OPEN" },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }),
    monthSummaries(establishmentId, e.id, {}, 12),
  ]);
  return {
    ...toRow(e),
    phone: e.party.phone,
    email: e.party.email,
    notes: e.notes,
    workDays: e.workDays,
    workStart: e.workStart,
    workEnd: e.workEnd,
    graceMinutes: e.graceMinutes,
    basicSalaryHalalas: e.basicSalaryHalalas,
    allowances: e.allowances,
    userId: e.userId,
    loginName: e.user ? fullName(e.user) : null,
    salaryPlanId: plan?.id ?? null,
    thisMonth: months.find((m) => m.periodYm === ymOf(today)) ?? null,
    months,
  };
}

/** Y9: ACTIVE STAFF of this establishment with no linked employee, plus the current link. */
export async function listLinkableStaff(
  establishmentId: string,
  currentUserId: string | null = null,
): Promise<Array<{ id: string; name: string; email: string }>> {
  const users = await db.user.findMany({
    where: {
      establishmentId,
      role: "STAFF",
      OR: [{ status: "ACTIVE", employee: { is: null } }, ...(currentUserId ? [{ id: currentUserId }] : [])],
    },
    select: { id: true, email: true, ...NAME_SELECT },
    orderBy: [{ firstName: "asc" }, { id: "asc" }],
  });
  return users.map((u) => ({ id: u.id, name: fullName(u), email: u.email }));
}

/** D14: active موظف parties no employee holds yet — the adoption choices. */
export async function listAdoptableParties(
  establishmentId: string,
): Promise<Array<{ id: string; name: string; phone: string | null; email: string | null }>> {
  return db.party.findMany({
    where: { establishmentId, type: "EMPLOYEE", active: true, employee: { is: null } },
    select: { id: true, name: true, phone: true, email: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

/** D6: the open salary plan's months not fully paid — listed by the end form. */
export async function getUnpaidSalaryMonths(
  establishmentId: string,
  employeeId: string,
): Promise<Array<{ instalmentId: string; periodYm: string; dueDate: string; amountDueHalalas: number; paidHalalas: number; remainingHalalas: number }>> {
  const rows = await db.instalment.findMany({
    where: {
      establishmentId,
      plan: { employeeId, kind: "SALARY", state: "OPEN" },
      paidHalalas: { lt: db.instalment.fields.amountDueHalalas },
    },
    select: { id: true, periodYm: true, dueDate: true, amountDueHalalas: true, paidHalalas: true },
    orderBy: [{ dueDate: "asc" }, { seq: "asc" }, { id: "asc" }],
  });
  return rows.map((r) => ({
    instalmentId: r.id,
    periodYm: r.periodYm ?? ymOf(dateToISO(r.dueDate)),
    dueDate: dateToISO(r.dueDate),
    amountDueHalalas: r.amountDueHalalas,
    paidHalalas: r.paidHalalas,
    remainingHalalas: r.amountDueHalalas - r.paidHalalas,
  }));
}

/** D14 — one definition, in the party rules. */
export { employeeIdOfParty } from "@/features/parties/rules";

/** N4: the snapshot is JSON — parsed on read, never trusted as typed. */
export const AllowanceSnapshotSchema = z.array(
  z.object({ type: AllowanceTypeEnum, label: z.string().nullable(), amountHalalas: z.number().int().positive() }),
);
