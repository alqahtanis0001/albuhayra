/**
 * The plan form's editable schedule, as the owner types it (amounts as SAR
 * text), and its conversion to the rows `PlanInputSchema` accepts. Pure and
 * client-safe. The server re-validates everything; this only decides what the
 * preview says and whether حفظ is enabled.
 */
import { parseSAR } from "@/lib/money";
import type { ScheduleRow } from "@/lib/schedule";
import type { InstalmentRow } from "@/lib/validation";

export type DraftRow = {
  /** React key; stable across edits. */
  key: string;
  /** Existing instalment (plan edit) — posted back so the server can match it. */
  id?: string;
  dueDate: string;
  /** SAR text, e.g. "1500.00". */
  amount: string;
  /** Has a payment or a reference: shown read-only, posted back unchanged (W4). */
  fixed: boolean;
};

let seed = 0;
export const newKey = () => `r${++seed}`;

export const toAmountText = (halalas: number) => (halalas / 100).toFixed(2);

export function fromSchedule(rows: ScheduleRow[]): DraftRow[] {
  return rows.map((r) => ({
    key: newKey(),
    dueDate: r.dueDate,
    amount: toAmountText(r.amountDueHalalas),
    fixed: false,
  }));
}

/** Σ of the rows whose amount parses; `complete` is false if any does not. */
export function draftSum(rows: DraftRow[]): { sumHalalas: number; complete: boolean } {
  let sumHalalas = 0;
  let complete = true;
  for (const row of rows) {
    const h = parseSAR(row.amount);
    if (h === null) complete = false;
    else sumHalalas += h;
  }
  return { sumHalalas, complete };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The rows to post, or null while the schedule cannot be submitted: an empty
 * list, an unparseable amount, a missing date or one before the start, or a
 * sum that differs from the total.
 */
export function draftToRows(
  rows: DraftRow[],
  totalHalalas: number | null,
  startDate: string,
): InstalmentRow[] | null {
  if (rows.length === 0 || totalHalalas === null) return null;
  const out: InstalmentRow[] = [];
  for (const row of rows) {
    const amountDueHalalas = parseSAR(row.amount);
    if (amountDueHalalas === null || !ISO.test(row.dueDate)) return null;
    if (startDate && row.dueDate < startDate) return null;
    out.push(row.id ? { id: row.id, dueDate: row.dueDate, amountDueHalalas } : { dueDate: row.dueDate, amountDueHalalas });
  }
  const sum = out.reduce((s, r) => s + r.amountDueHalalas, 0);
  return sum === totalHalalas ? out : null;
}
