/**
 * Instalment and plan status (docs/BACKEND.md → v1.2a → Pure helpers). Pure and
 * client-safe. Status is never stored: it depends on "today", which is always
 * **passed in** — the server's `todayISO()` (Riyadh), W8. Nothing here reads a
 * clock, so a status can never disagree with the page that computed "today".
 */

export type InstalmentStatus = "PAID" | "OVERDUE" | "PARTIAL" | "DUE" | "UPCOMING";
export type PlanStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED" | "CANCELLED";
export type PlanStateValue = "OPEN" | "ARCHIVED" | "CANCELLED";

const DAY_MS = 86_400_000;

function utcDay(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
}

/** due − today in whole days: 0 = due today, 1 = tomorrow, −1 = yesterday. */
export function dayOffset(dueDateISO: string, todayISO: string): number {
  return Math.round(utcDay(dueDateISO) - utcDay(todayISO));
}

/** First match wins: PAID, OVERDUE, PARTIAL, DUE (within the reminder window), UPCOMING. */
export function instalmentStatus(
  row: { dueDate: string; amountDueHalalas: number; paidHalalas: number },
  todayISO: string,
  reminderDays: number,
): InstalmentStatus {
  if (row.paidHalalas >= row.amountDueHalalas) return "PAID";
  const offset = dayOffset(row.dueDate, todayISO);
  if (offset < 0) return "OVERDUE";
  if (row.paidHalalas > 0) return "PARTIAL";
  if (offset <= reminderDays) return "DUE";
  return "UPCOMING";
}

/**
 * CANCELLED / ARCHIVED from the stored state; otherwise every instalment paid →
 * COMPLETED; before the start with nothing paid → UPCOMING; else ACTIVE.
 */
export function planStatus(
  plan: {
    state: PlanStateValue;
    startDate: string;
    instalments: { amountDueHalalas: number; paidHalalas: number }[];
  },
  todayISO: string,
): PlanStatus {
  if (plan.state === "CANCELLED") return "CANCELLED";
  if (plan.state === "ARCHIVED") return "ARCHIVED";
  const rows = plan.instalments;
  if (rows.length > 0 && rows.every((r) => r.paidHalalas >= r.amountDueHalalas)) {
    return "COMPLETED";
  }
  const nothingPaid = rows.every((r) => r.paidHalalas === 0);
  if (todayISO < plan.startDate && nothingPaid) return "UPCOMING";
  return "ACTIVE";
}
