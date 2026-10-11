/**
 * v1.5 (docs/V15-SPEC.md B3, D15, D21, D40): the salary pick list's pure rules —
 * the row shape, where a row leads, and the `?pick` parser. No `server-only`
 * and no database, so a component (even a client one) may import it; the reads
 * stay in the server-only salaryPick.ts.
 */

export type SalaryPickRow = {
  employeeId: string;
  name: string;
  jobTitle: string | null;
  /** This month's salary instalment — the id «صرف راتب» pays. */
  instalmentId: string;
  remainingHalalas: number;
  /** The employee page's rule (Y7): plan OPEN and something left this month. */
  payable: boolean;
};

/** Where a pick row leads: the payment screen when payable, else the employee page (D15). */
export function salaryPickHref(row: Pick<SalaryPickRow, "employeeId" | "instalmentId" | "payable">): string {
  return row.payable
    ? `/owner/transactions/new?instalmentId=${encodeURIComponent(row.instalmentId)}`
    : `/owner/staff/${encodeURIComponent(row.employeeId)}`;
}

/** Only the exact single value `?pick=salary` turns the employees list into the pick list. */
export function isSalaryPick(raw: string | string[] | undefined): boolean {
  return raw === "salary";
}
