/**
 * One employee's month (spec §3.4) — shared by the owner's monthly sheet and
 * «حضوري» (which reads without notes, Z6): totals per status and hours, then
 * one row per day — date with Hijri, the status in words (or «غير مسجل»,
 * «ليس يوم عمل»; blank outside the employment), in/out, hours, note.
 */
import type { ReactNode } from "react";

import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import type { MonthDay } from "@/features/attendance/month";
import type { StatusTotals } from "@/features/attendance/queries";
import { t } from "@/i18n/ar";
import { AttendanceStatusEnum } from "@/lib/validation";

import { hoursText } from "./sheetDraft";

export function MonthTotals({
  totals,
  minutes,
  title = t.attendance.totals,
  action,
}: {
  totals: StatusTotals;
  minutes: number;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <Card title={title} action={action} className="report-card">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {AttendanceStatusEnum.options.map((s) => (
          <div key={s} className="flex justify-between gap-2">
            <dt className="text-gray-600">{t.attendanceStatus[s]}</dt>
            <dd className="font-medium tabular-nums">{totals[s]}</dd>
          </div>
        ))}
        <div className="col-span-2 flex justify-between gap-2">
          <dt className="text-gray-600">{t.attendance.totalHours}</dt>
          <dd className="font-medium">
            <bdi className="tabular-nums">{hoursText(t.attendance.hoursValue, minutes)}</bdi>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function statusWord(day: MonthDay): string {
  if (!day.employed) return "";
  const status = day.record?.status ?? day.prefill;
  if (status) return t.attendanceStatus[status];
  return day.workDay ? t.attendance.notRecorded : t.attendance.notWorkDay;
}

export function MonthDays({ days, withNotes }: { days: MonthDay[]; withNotes: boolean }) {
  return (
    <Card className="report-card" bodyClassName="">
      <Table
        caption={t.attendance.printTitle}
        head={
          <Tr>
            <Th>{t.attendance.date}</Th>
            <Th>{t.attendance.title}</Th>
            <Th>{t.attendance.checkIn}</Th>
            <Th>{t.attendance.checkOut}</Th>
            <Th>{t.attendance.hours}</Th>
            {withNotes ? <Th>{t.attendance.note}</Th> : null}
          </Tr>
        }
      >
        <TBody>
          {days.map((day) => (
            <Tr key={day.date} className={day.workDay ? "" : "bg-gray-50"}>
              <Td>
                <DateText date={day.date} className="items-start" />
              </Td>
              <Td>{statusWord(day)}</Td>
              <Td>
                <bdi dir="ltr" className="tabular-nums">
                  {day.record?.checkIn ?? ""}
                </bdi>
              </Td>
              <Td>
                <bdi dir="ltr" className="tabular-nums">
                  {day.record?.checkOut ?? ""}
                </bdi>
              </Td>
              <Td className="whitespace-nowrap">
                {day.record?.minutes ? (
                  <bdi className="tabular-nums">{hoursText(t.attendance.hoursValue, day.record.minutes)}</bdi>
                ) : null}
              </Td>
              {withNotes ? <Td className="text-xs text-gray-600">{day.record?.note ?? ""}</Td> : null}
            </Tr>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
