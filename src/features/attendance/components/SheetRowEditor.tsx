"use client";

/**
 * One employee on the owner's day sheet: the six statuses as radio chips (a
 * word each — the letter codes are only for the monthly grid), check-in and
 * check-out (`dir="ltr"`), the «محسوب / معدّل يدويًا» badge previewed with the
 * server's own rule, worked hours, and a note. The controls carry
 * `form="__none"`: the sheet posts one JSON `rows` field.
 */
import { Badge } from "@/components/Badge";
import { Input } from "@/components/Input";
import { errorMessage, t } from "@/i18n/ar";
import { AttendanceStatusEnum, type AttendanceStatusValue } from "@/lib/validation";

import {
  hoursText,
  previewOverridden,
  withCheckIn,
  workedMinutes,
  type DraftRow,
  type SheetRow,
} from "./sheetDraft";

export function SheetRowEditor({
  row,
  draft,
  date,
  onChange,
  error,
}: {
  row: SheetRow;
  draft: DraftRow;
  date: string;
  onChange: (next: DraftRow) => void;
  /** A client-side `err.*` key for this row (a changed row needs a status). */
  error?: string;
}) {
  const overridden = previewOverridden(draft, row, date);
  const minutes = workedMinutes(draft);
  const timeError =
    draft.checkOut && !draft.checkIn
      ? "err.notCheckedIn"
      : draft.checkIn && draft.checkOut && minutes === null
        ? "err.timeOrder"
        : undefined;
  const id = (field: string) => `att-${field}-${row.employeeId}`;

  return (
    <li className="report-card flex flex-col gap-3 border-b border-gray-200 p-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-gray-900">{row.name}</span>
        <span className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          {overridden === null ? (
            <span>{t.attendance.notRecorded}</span>
          ) : (
            <Badge tone={overridden ? "warn" : "neutral"}>
              {overridden ? t.attendance.overridden : t.attendance.computed}
            </Badge>
          )}
          {minutes !== null ? (
            <span>
              {t.attendance.hours}: <bdi className="tabular-nums">{hoursText(t.attendance.hoursValue, minutes)}</bdi>
            </span>
          ) : null}
        </span>
      </div>

      <fieldset aria-describedby={error ? id("status-error") : undefined}>
        <legend className="sr-only">{`${t.attendance.title} — ${row.name}`}</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {AttendanceStatusEnum.options.map((status: AttendanceStatusValue) => {
            const checked = draft.status === status;
            return (
              <label
                key={status}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm font-medium transition-[scale] duration-[80ms] ease-out active:scale-[0.97] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${
                  checked
                    ? "border-accent bg-accent-soft text-accent-dark"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <input
                  type="radio"
                  form="__none"
                  name={id("status")}
                  value={status}
                  checked={checked}
                  onChange={() => onChange({ ...draft, status, manual: true })}
                  className="sr-only"
                />
                {t.attendanceStatus[status]}
              </label>
            );
          })}
        </div>
        {error ? (
          <p id={id("status-error")} className="mt-1 text-xs font-medium text-money-out">
            {errorMessage(error)}
          </p>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t.attendance.checkIn}
          id={id("in")}
          name={id("in")}
          form="__none"
          type="time"
          step={60}
          dir="ltr"
          value={draft.checkIn}
          onChange={(e) => onChange(withCheckIn(draft, e.target.value, row, date))}
        />
        <Input
          label={t.attendance.checkOut}
          id={id("out")}
          name={id("out")}
          form="__none"
          type="time"
          step={60}
          dir="ltr"
          value={draft.checkOut}
          onChange={(e) => onChange({ ...draft, checkOut: e.target.value })}
          error={timeError}
        />
      </div>
      <Input
        label={`${t.attendance.note} (${t.common.optional})`}
        id={id("note")}
        name={id("note")}
        form="__none"
        value={draft.note}
        maxLength={200}
        onChange={(e) => onChange({ ...draft, note: e.target.value })}
      />
    </li>
  );
}

export default SheetRowEditor;
