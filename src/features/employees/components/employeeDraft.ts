/**
 * Pure helpers for the employee profile form (client-safe, no hooks).
 *
 * Work days are one integer on the wire (Y9): Sun=1, Mon=2 … Sat=64, the bit
 * order of `t.weekday`; the day chips compute the mask. Allowances post as one
 * JSON `allowances` field of `{ type, label, amountHalalas }`; the rows here
 * keep the typed text so a refused submit shows exactly what was typed.
 */
import { AllowanceRowSchema, type AllowanceTypeValue } from "@/lib/validation";
import { parseSAR } from "@/lib/money";

export const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const dayBit = (day: Weekday): number => 1 << WEEKDAYS.indexOf(day);

export function toggleDay(mask: number, day: Weekday): number {
  return mask ^ dayBit(day);
}

export function hasDay(mask: number, day: Weekday): boolean {
  return (mask & dayBit(day)) !== 0;
}

export type AllowanceDraft = {
  /** React key only; never posted. */
  key: string;
  type: AllowanceTypeValue;
  label: string;
  amount: string;
};

const isBlank = (row: AllowanceDraft) => row.amount.trim() === "" && row.label.trim() === "";

/**
 * The JSON the action parses. A row left wholly blank is dropped (nothing was
 * entered, so nothing is lost); an unparseable amount posts as null → refused.
 */
export function allowancesJson(rows: AllowanceDraft[]): string {
  return JSON.stringify(
    rows.filter((row) => !isBlank(row)).map((row) => ({
      type: row.type,
      label: row.type === "OTHER" ? row.label : "",
      amountHalalas: parseSAR(row.amount),
    })),
  );
}

/** Per-row `err.*` keys (label / amount), from the contract's own row schema. */
export function allowanceRowErrors(row: AllowanceDraft): { label?: string; amount?: string } {
  if (isBlank(row)) return {};
  const parsed = AllowanceRowSchema.safeParse({
    type: row.type,
    label: row.type === "OTHER" ? row.label : "",
    amountHalalas: parseSAR(row.amount) ?? Number.NaN,
  });
  if (parsed.success) return {};
  const out: { label?: string; amount?: string } = {};
  for (const issue of parsed.error.issues) {
    if (issue.path[0] === "label") out.label ??= issue.message;
    else out.amount ??= issue.path[0] === "amountHalalas" ? issue.message : "err.amountInvalid";
  }
  return out;
}

/** Basic + every parseable allowance, or null when the basic is not a valid amount. */
export function grossHalalas(basic: string, rows: AllowanceDraft[]): number | null {
  const base = parseSAR(basic);
  if (base === null) return null;
  return rows.reduce((sum, row) => sum + (parseSAR(row.amount) ?? 0), base);
}
