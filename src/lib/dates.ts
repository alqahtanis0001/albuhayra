/**
 * All dates are Gregorian in the database. Hijri is display-only.
 * The business timezone is Asia/Riyadh (UTC+3, no DST).
 */

export const TIMEZONE = "Asia/Riyadh";

/** `YYYY-MM-DD` for "today" in Riyadh — the max value every date input accepts. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * v1.2b: "HH:MM" (24-hour, Western digits) for the Riyadh wall clock at `now` —
 * the server clock that self check-in/out records (D11). Pass the same `now`
 * to `todayISO()` so the date and the time come from one instant.
 */
export function nowRiyadhHHMM(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

/**
 * `YYYY-MM-DD` → a UTC-midnight Date, which is what Postgres `@db.Date` stores.
 * Building it this way keeps the calendar day stable regardless of server TZ.
 */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** A `@db.Date` value back to `YYYY-MM-DD` (read in UTC, never local). */
export function dateToISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The year/month a transaction belongs to. Month is 1-12. */
export function monthKey(date: Date): { year: number; month: number } {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** The current year/month in Riyadh — used to block locking the open month. */
export function currentMonthKey(now: Date = new Date()): {
  year: number;
  month: number;
} {
  const [y, m] = todayISO(now).split("-").map(Number);
  return { year: y, month: m };
}

/** First day of a month as a UTC-midnight Date (inclusive range start). */
export function monthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Last day of a month as a UTC-midnight Date (inclusive range end). */
export function monthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0));
}

/** `{year, month}` → `"2026-09"`, the key the dashboard chart groups by. */
export function ymString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** The last `count` months ending with the given one, oldest first. */
export function lastMonths(
  count: number,
  from: { year: number; month: number } = currentMonthKey(),
): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(from.year, from.month - 1 - i, 1));
    out.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }
  return out;
}

const hijriFormatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `"1448/04/07 هـ"` — Western digits, display only, never stored or compared. */
export function toHijri(date: Date): string {
  const parts = hijriFormatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year").replace(/\D/g, "");
  return `${year}/${get("month")}/${get("day")} هـ`;
}

/** `"2026-09-29"` — Gregorian, Western digits, shown above the Hijri date. */
export function toGregorian(date: Date): string {
  return dateToISO(date);
}

/** Arabic month names for the report/lock month pickers. */
export const MONTH_NAMES_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

export function monthNameAr(month: number): string {
  return MONTH_NAMES_AR[month - 1] ?? "";
}
