"use client";

/**
 * «حضوري» today (spec §3.3; X7): the day's status in words, the recorded
 * times, and one button — «تسجيل الحضور», then «تسجيل الانصراف», then none.
 * The time is the server's, never the phone's: the actions post nothing and
 * the note says so. Status beyond PRESENT/LATE is the owner's to set.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { Toast } from "@/components/Toast";
import type { MySelf } from "@/features/attendance/mine";
import { checkIn, checkOut } from "@/features/attendance/self";
import { errorMessage, t } from "@/i18n/ar";

import { LiveClock, type ClockRing } from "./LiveClock";

/** Which ring: the check once checked in; the grace ring only on a clockable work day with a start and a grace. */
function ringOf(self: MySelf): ClockRing {
  if (self.record?.checkIn) return { kind: "checked", at: self.record.checkIn };
  if (!self.canClock || !self.workDay) return { kind: "none", note: false };
  const { workStart, graceMinutes } = self.schedule;
  if (!workStart || graceMinutes === null) return { kind: "none", note: true };
  return { kind: "grace", workStart, graceMinutes };
}

export function ClockCard({ self }: { self: MySelf }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const record = self.record;
  const status = record?.status ?? self.derived;

  const clock = (action: typeof checkIn) =>
    start(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  return (
    <Card title={t.myAttendance.today}>
      <div className="flex flex-col gap-3 text-sm">
        <DateText date={self.today} className="items-start" />
        <LiveClock serverNowMs={self.nowMs} ring={ringOf(self)} />
        {self.workDay ? null : <p className="text-gray-600">{t.myAttendance.notWorkDay}</p>}
        <p className="font-medium text-gray-900">
          {status ? t.attendanceStatus[status] : t.attendance.notRecorded}
        </p>
        {record?.checkOut ? (
          <p>
            {t.myAttendance.checkedOutAt}{" "}
            <bdi dir="ltr" className="font-semibold tabular-nums">
              {record.checkOut}
            </bdi>
          </p>
        ) : null}

        {!self.canClock ? (
          <p className="text-gray-600">{t.myAttendance.cannotClock}</p>
        ) : !record?.checkIn ? (
          <div>
            <Button block pending={pending} onClick={() => clock(checkIn)}>
              {t.myAttendance.checkIn}
            </Button>
          </div>
        ) : !record.checkOut ? (
          <div>
            <Button block pending={pending} onClick={() => clock(checkOut)}>
              {t.myAttendance.checkOut}
            </Button>
          </div>
        ) : null}
        {self.canClock ? <p className="text-xs text-gray-600">{t.myAttendance.serverTimeNote}</p> : null}
      </div>
      {error ? <Toast message={errorMessage(error)} onDismiss={() => setError(null)} /> : null}
    </Card>
  );
}

export default ClockCard;
