/**
 * Payment allocation (docs/BACKEND.md → v1.2a → Pure helpers). Pure and
 * deterministic: the same rows always give the same result, so re-allocation
 * after any edit is "recompute from scratch", never an incremental patch.
 *
 * Each payment fills **the instalment it was recorded against** first, then
 * rolls forward through the later ones, then wraps to the earliest still
 * unpaid; whatever is left is `overpaidHalalas` (zero whenever the action
 * rules held — the UI shows it as a warning if not).
 */

export type AllocInstalment = {
  id: string;
  dueDate: string;
  seq: number;
  amountDueHalalas: number;
};

export type AllocPayment = {
  id: string;
  instalmentId: string;
  /** ISO calendar date of the entry. */
  date: string;
  /** Tie-break within a day; an ISO instant or anything that sorts the same way. */
  createdAt: string;
  amountHalalas: number;
};

export type Allocation = {
  paid: Record<string, number>;
  overpaidHalalas: number;
};

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function allocate(instalments: AllocInstalment[], payments: AllocPayment[]): Allocation {
  const rows = [...instalments].sort(
    (a, b) => byText(a.dueDate, b.dueDate) || a.seq - b.seq || byText(a.id, b.id),
  );
  const ordered = [...payments].sort(
    (a, b) => byText(a.date, b.date) || byText(a.createdAt, b.createdAt) || byText(a.id, b.id),
  );

  const paid: Record<string, number> = Object.fromEntries(rows.map((r) => [r.id, 0]));
  let overpaidHalalas = 0;

  for (const payment of ordered) {
    let left = payment.amountHalalas;
    const start = rows.findIndex((r) => r.id === payment.instalmentId);
    // Its own instalment and the later ones, then the earlier ones (the wrap).
    const visit = start < 0 ? rows : [...rows.slice(start), ...rows.slice(0, start)];
    for (const row of visit) {
      if (left <= 0) break;
      const take = Math.min(left, row.amountDueHalalas - paid[row.id]!);
      if (take <= 0) continue;
      paid[row.id]! += take;
      left -= take;
    }
    overpaidHalalas += left;
  }

  return { paid, overpaidHalalas };
}
