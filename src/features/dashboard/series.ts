/**
 * v1.3 (docs/V13-SPEC.md items 2, 3, 5): the dashboard's derived series, built
 * in JS from rows `getOwnerDashboard` already reads. Pure and client-safe — no
 * `server-only`, no Prisma — so every number here is unit-tested on its own.
 * Dates are `YYYY-MM-DD` strings (Riyadh calendar days, as `@db.Date` stores
 * them); money is integer halalas.
 */

export type SeriesRow = {
  /** `YYYY-MM-DD`. */
  date: string;
  direction: "IN" | "OUT";
  amountHalalas: number;
};

export type DayPoint = {
  date: string;
  inHalalas: number;
  outHalalas: number;
  /** The all-time running balance at the end of this day. */
  balanceHalalas: number;
};

function isoOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function msOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

/** The `count` calendar days ending with `todayIso`, oldest first. */
export function lastDays(todayIso: string, count: number): string[] {
  const end = msOf(todayIso);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(isoOf(end - i * 86_400_000));
  return out;
}

function signed(row: SeriesRow): number {
  return row.direction === "IN" ? row.amountHalalas : -row.amountHalalas;
}

/**
 * Every one of the last `days` days, zero-filled. `balanceBefore` is the
 * balance of everything dated before the earliest row in `rows`; rows before
 * the first day are folded into the opening, rows after today are ignored.
 */
export function dailySeries(
  rows: SeriesRow[],
  balanceBefore: number,
  todayIso: string,
  days = 30,
): DayPoint[] {
  const dates = lastDays(todayIso, days);
  const first = dates[0]!;
  const buckets = new Map(dates.map((d) => [d, { inHalalas: 0, outHalalas: 0 }]));
  let balance = balanceBefore;

  for (const row of rows) {
    if (row.date < first) {
      balance += signed(row);
      continue;
    }
    const bucket = buckets.get(row.date);
    if (!bucket) continue;
    if (row.direction === "IN") bucket.inHalalas += row.amountHalalas;
    else bucket.outHalalas += row.amountHalalas;
  }

  return dates.map((date) => {
    const { inHalalas, outHalalas } = buckets.get(date)!;
    balance += inHalalas - outHalalas;
    return { date, inHalalas, outHalalas, balanceHalalas: balance };
  });
}

/**
 * Buckets rows into the chart's months (`"2026-09"` keys, oldest first) in JS.
 * A SQL `date_trunc` would need `$queryRaw`, which carries no `where` object
 * for the scoping test to inspect, and this window is a few thousand rows for a
 * business this size. Rows outside the given months are ignored.
 */
export function bucketByMonth(
  rows: SeriesRow[],
  yms: string[],
): Array<{ ym: string; inHalalas: number; outHalalas: number }> {
  const buckets = new Map(yms.map((ym) => [ym, { ym, inHalalas: 0, outHalalas: 0 }]));
  for (const row of rows) {
    const bucket = buckets.get(row.date.slice(0, 7));
    if (!bucket) continue;
    if (row.direction === "IN") bucket.inHalalas += row.amountHalalas;
    else bucket.outHalalas += row.amountHalalas;
  }
  return yms.map((ym) => buckets.get(ym)!);
}

/** Each month's opening balance: `balanceBefore` plus every earlier month's net. */
export function monthOpenings(
  months: Array<{ inHalalas: number; outHalalas: number }>,
  balanceBefore: number,
): number[] {
  let running = balanceBefore;
  return months.map((m) => {
    const opening = running;
    running += m.inHalalas - m.outHalalas;
    return opening;
  });
}

/**
 * Last month's net from its 1st to the same day-of-month as today, clamped to
 * its last day (31 March compares with 1–28/29 February). Lead ruling S9: the
 * momentum compares like with like, not a whole month with a partial one.
 */
export function prevMonthToDateNet(rows: SeriesRow[], todayIso: string): number {
  const [y, m, d] = todayIso.split("-").map(Number);
  const start = isoOf(Date.UTC(y!, m! - 2, 1));
  const lastDay = new Date(Date.UTC(y!, m! - 1, 0)).getUTCDate();
  const end = isoOf(Date.UTC(y!, m! - 2, Math.min(d!, lastDay)));

  let net = 0;
  for (const row of rows) {
    if (row.date >= start && row.date <= end) net += signed(row);
  }
  return net;
}
