/**
 * The only way a date reaches the screen: Gregorian on top, Hijri beneath in
 * smaller text (docs/FRONTEND.md). Both use Western digits. Accepts an ISO
 * `YYYY-MM-DD` string or the Date a `@db.Date` column returns.
 */
import { dateToISO, isoToDate, toHijri } from "@/lib/dates";

export type DateTextProps = {
  date: string | Date;
  /** One line, Gregorian only — for dense table columns. */
  compact?: boolean;
  className?: string;
};

export function DateText({ date, compact = false, className = "" }: DateTextProps) {
  const value = typeof date === "string" ? isoToDate(date) : date;
  const gregorian = typeof date === "string" ? date : dateToISO(value);

  if (compact) {
    return <bdi className={`tabular-nums ${className}`}>{gregorian}</bdi>;
  }

  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <bdi className="tabular-nums text-gray-900">{gregorian}</bdi>
      <bdi className="tabular-nums text-xs text-gray-500">{toHijri(value)}</bdi>
    </span>
  );
}

export default DateText;
