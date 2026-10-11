import "server-only";

import { todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { ymOf } from "@/lib/payroll";

import type { SalaryPickRow } from "./salaryPickRules";

/**
 * v1.5 (docs/V15-SPEC.md B3, D15, D21): the «صرف راتب» flag and the salary pick
 * list. Owned by `nav`. Owner pages call these after `requireOwner()` (and
 * `ensureSalaryInstalments`) with the session's establishment; every query is
 * scoped by it at the top level of `where`. The pure, client-safe parts (the
 * row type, its link, the `?pick` parser) live in salaryPickRules.ts.
 */

/** D21: an ACTIVE employee holds an OPEN salary plan — gates the «+» sheet's «صرف راتب» row. */
export async function hasSalaryEmployees(establishmentId: string): Promise<boolean> {
  const plan = await db.plan.findFirst({
    where: { establishmentId, kind: "SALARY", state: "OPEN", employee: { is: { status: "ACTIVE" } } },
    select: { id: true },
  });
  return plan !== null;
}

/**
 * One batched read: this month's salary period of every ACTIVE employee whose
 * salary plan is OPEN, with its instalment — the same period → instalment path
 * as the employee page's `thisMonth` (employees/queries.ts `monthSummaries`).
 * An employee with no salary period this month is left out. Name order, as the
 * employees list.
 */
export async function listSalaryPick(establishmentId: string, today: string = todayISO()): Promise<SalaryPickRow[]> {
  const periods = await db.salaryPeriod.findMany({
    where: {
      establishmentId,
      periodYm: ymOf(today),
      employee: { status: "ACTIVE" },
      instalment: { plan: { kind: "SALARY", state: "OPEN" } },
    },
    select: {
      employeeId: true,
      instalmentId: true,
      employee: { select: { jobTitle: true, party: { select: { name: true } } } },
      instalment: { select: { amountDueHalalas: true, paidHalalas: true } },
    },
    orderBy: [{ employee: { party: { name: "asc" } } }, { id: "asc" }],
  });
  return periods.map((p) => {
    const remainingHalalas = Math.max(0, p.instalment.amountDueHalalas - p.instalment.paidHalalas);
    return {
      employeeId: p.employeeId,
      name: p.employee.party.name,
      jobTitle: p.employee.jobTitle,
      instalmentId: p.instalmentId,
      remainingHalalas,
      payable: remainingHalalas > 0,
    };
  });
}
