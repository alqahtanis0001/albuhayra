import type { Metadata } from "next";

import { EmptyState } from "@/components/EmptyState";
import { Tabs } from "@/components/Tabs";
import { saveAttendanceDay } from "@/features/attendance/actions";
import { DayPicker, MonthPicker } from "@/features/attendance/components/AttendancePickers";
import { DaySheetForm } from "@/features/attendance/components/DaySheetForm";
import { AttendanceLegend, MonthGrid } from "@/features/attendance/components/MonthGrid";
import { sheetRowOf } from "@/features/attendance/components/sheetDraft";
import { getDaySheet, getLastRecordedDate, getMonthGrid } from "@/features/attendance/queries";
import { periodLabel } from "@/features/plans/components/PlanBits";
import { PrintButton } from "@/features/reports/components/PrintButton";
import { PrintFooter } from "@/features/reports/components/PrintFooter";
import { PrintHeader } from "@/features/reports/components/PrintHeader";
import { errorMessage, t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { currentMonthKey, dateToISO, isoToDate, todayISO, ymString } from "@/lib/dates";
import type { AttendanceStatusValue } from "@/lib/validation";

export const metadata: Metadata = { title: t.attendance.title };

type Search = Record<string, string | string[] | undefined>;
/** A real calendar day: the shape, and it survives a round trip (no 2026-02-31). */
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && dateToISO(isoToDate(v)) === v;
const isMonth = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
/**
 * A requested ?date= / ?ym= that cannot be shown: which fallback fired and why
 * (a fallback says that it fired). Absent → nothing to say.
 */
function refusal(raw: string | string[] | undefined, valid: (v: string) => boolean, max: string): string | null {
  if (raw === undefined) return null;
  if (typeof raw !== "string" || !valid(raw)) return "err.dateInvalid";
  return raw > max ? "err.dateFuture" : null;
}

function FallbackNotice({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <p role="status" className="no-print rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      {errorMessage(reason)}
    </p>
  );
}

/** The latest earlier day with any record, however far back: its statuses by employee (Z6). */
async function lastRecordedStatuses(
  establishmentId: string,
  date: string,
): Promise<Record<string, AttendanceStatusValue> | null> {
  const last = await getLastRecordedDate(establishmentId, date);
  if (!last) return null;
  const sheet = await getDaySheet(establishmentId, last);
  const recorded = sheet.rows.filter((r) => r.record !== null);
  return recorded.length > 0 ? Object.fromEntries(recorded.map((r) => [r.employeeId, r.record!.status])) : null;
}

/**
 * الحضور (spec §3.3): يومي — the day sheet saved in one action (default: the
 * server's today; a malformed or future ?date= falls back to it); شهري — the
 * employees × days grid with the legend, printable. Owner only; staff canEdit
 * does not apply.
 */
export default async function AttendancePage({ searchParams }: { searchParams: Promise<Search> }) {
  const { user, establishmentId } = await requireOwner();
  const sp = await searchParams;
  const today = todayISO();
  const monthly = sp.view === "monthly";
  const { year, month } = currentMonthKey();
  const thisMonth = ymString(year, month);

  const tabs = (
    <Tabs
      label={t.attendance.title}
      active={monthly ? "monthly" : "daily"}
      tabs={[
        { key: "daily", label: t.attendance.dailyTab, href: "/owner/staff/attendance" },
        { key: "monthly", label: t.attendance.monthlyTab, href: "/owner/staff/attendance?view=monthly" },
      ]}
    />
  );

  if (monthly) {
    const refused = refusal(sp.ym, isMonth, thisMonth);
    const ym = typeof sp.ym === "string" && !refused ? sp.ym : thisMonth;
    const grid = await getMonthGrid(establishmentId, ym);
    return (
      <div className="flex flex-col gap-4">
        <PrintHeader
          establishmentName={user.establishmentName}
          title={`${t.attendance.printTitle} — ${periodLabel(ym)}`}
          printedAt={today}
        />
        <h1 className="no-print text-xl font-semibold text-gray-900">{t.attendance.title}</h1>
        {tabs}
        <FallbackNotice reason={refused} />
        <MonthPicker ym={ym} />
        {grid.rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white">
            <EmptyState title={t.attendance.empty} />
          </div>
        ) : (
          <>
            <MonthGrid ym={ym} days={grid.days} rows={grid.rows} />
            <AttendanceLegend />
            <div className="no-print">
              <PrintButton />
            </div>
          </>
        )}
        <PrintFooter />
      </div>
    );
  }

  const refused = refusal(sp.date, isDay, today);
  const date = typeof sp.date === "string" && !refused ? sp.date : today;
  const [sheet, copySource] = await Promise.all([
    getDaySheet(establishmentId, date),
    lastRecordedStatuses(establishmentId, date),
  ]);
  const rows = sheet.rows.map(sheetRowOf);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.attendance.title}</h1>
      {tabs}
      <FallbackNotice reason={refused} />
      <DayPicker date={date} today={today} />
      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState title={t.attendance.empty} />
        </div>
      ) : (
        <DaySheetForm key={date} action={saveAttendanceDay} date={date} rows={rows} copySource={copySource} />
      )}
    </div>
  );
}
