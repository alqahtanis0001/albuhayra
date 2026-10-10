/**
 * v1.4 (docs/V14-SPEC.md C3) — the open agreement's view rules, pure so they
 * can be unit-tested without a DOM: the progress bar's percentage and tone
 * (green → gold at ≥ 80 % → full at 100 %), the card's link in pick mode, and
 * where a recorded payment returns to.
 */
import type { PlanStatus } from "@/lib/instalments";
import type { PaymentMethodValue } from "@/lib/validation";

/**
 * The payment form's methods, in `PaymentMethodEnum`'s order (pinned to it by
 * a test). Listed here so the client leaf never imports the validation barrel.
 */
export const METHODS = ["CASH", "BANK_TRANSFER", "MADA", "STC_PAY", "OTHER"] as const satisfies readonly PaymentMethodValue[];

export type ProgressTone = "green" | "gold" | "full";

/** null without a ceiling. `pct` is floored, so 99.9 % reads 99 and only a reached total reads 100. */
export function progressOf(receivedHalalas: number, totalHalalas: number | null): { pct: number; tone: ProgressTone } | null {
  if (totalHalalas === null || totalHalalas <= 0) return null;
  const pct = Math.min(100, Math.floor((receivedHalalas / totalHalalas) * 100));
  return { pct, tone: pct >= 100 ? "full" : pct >= 80 ? "gold" : "green" };
}

/** C6 / P11: in pick mode an open card lands on its payment form, a fixed one on its instalments. */
export function planHref(row: { id: string; kind: string }, pick: boolean): string {
  const base = `/owner/plans/${row.id}`;
  if (!pick) return base;
  return row.kind === "OPEN_ENDED" ? `${base}#pay` : `${base}#instalments`;
}

/** P11: only agreements something can still be paid on. */
export function payable(status: PlanStatus): boolean {
  return status !== "ARCHIVED" && status !== "CANCELLED" && status !== "COMPLETED";
}

/** The list page's rows: in pick mode (`?pick=payment`) only the payable ones; otherwise every row, untouched. */
export function pickRows<T extends { status: PlanStatus }>(rows: T[], pick: boolean): T[] {
  return pick ? rows.filter((r) => payable(r.status)) : rows;
}

/** After «تسجيل دفعة»: back to the detail with the `?paid=` marker (v1.3's pattern) and `closed=1` on an auto-close. */
export function recordedHref(planId: string, transactionId: string, autoClosed: boolean): string {
  return `/owner/plans/${planId}?paid=${encodeURIComponent(transactionId)}${autoClosed ? "&closed=1" : ""}`;
}
