"use client";

/**
 * جدول الدفعات (docs/FRONTEND.md, plans new/edit). Two ways to fill the
 * editable preview: «دفعات متساوية» runs the shared `buildSchedule` from the
 * start date, «تواريخ ومبالغ مخصصة» starts from the rows as they are. Either
 * way every row stays editable, and the live sum line says whether the rows
 * match the total — the form keeps حفظ disabled until they do.
 *
 * On edit, rows with a payment (`fixed`) are read-only and equal mode is off
 * (W4), since regenerating would replace them. The rows live in the parent,
 * which posts them as one JSON `instalments` field.
 *
 * Every control here carries `form="__none"` — an id no element has — which
 * detaches it from the surrounding <form>, so FormData holds only the contract
 * fields (the builder's count, frequency and per-row inputs are UI state).
 */
import { useState } from "react";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { MoneyText } from "@/components/MoneyText";
import { Select } from "@/components/Select";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { errorMessage, t } from "@/i18n/ar";
import { buildSchedule, MAX_EVERY_DAYS } from "@/lib/schedule";
import { MAX_INSTALMENTS, type ScheduleFrequency } from "@/lib/validation";

import { ScheduleRows } from "./ScheduleRows";
import { draftSum, fromSchedule, newKey, type DraftRow } from "./scheduleDraft";

const FREQUENCIES: ScheduleFrequency[] = ["MONTHLY", "WEEKLY", "EVERY_N_DAYS"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function ScheduleBuilder({
  totalHalalas,
  startDate,
  rows,
  onRows,
  equalDisabled,
  error,
}: {
  totalHalalas: number | null;
  startDate: string;
  rows: DraftRow[];
  onRows: (rows: DraftRow[]) => void;
  equalDisabled: boolean;
  /** `fieldErrors.instalments` from the action (an err.* key). */
  error?: string;
}) {
  const [mode, setMode] = useState<"equal" | "custom">(equalDisabled ? "custom" : "equal");
  const [count, setCount] = useState("12");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("MONTHLY");
  const [everyDays, setEveryDays] = useState("30");
  const [problem, setProblem] = useState<string | null>(null);

  // V6: more rows than halalas would leave a row at 0.
  const maxCount = totalHalalas ? Math.min(MAX_INSTALMENTS, totalHalalas) : MAX_INSTALMENTS;

  function generate() {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1) return setProblem(errorMessage("err.scheduleInvalid"));
    if (n > MAX_INSTALMENTS) return setProblem(errorMessage("err.scheduleTooLong"));
    if (totalHalalas !== null && n > totalHalalas) {
      setCount(String(maxCount));
      return setProblem(t.schedule.countCapped.replace("{n}", String(maxCount)));
    }
    const built =
      totalHalalas === null
        ? null
        : buildSchedule({
            totalHalalas,
            count: n,
            frequency,
            everyDays: frequency === "EVERY_N_DAYS" ? Number(everyDays) : undefined,
            firstDueDate: startDate,
          });
    if (!built) return setProblem(errorMessage("err.scheduleInvalid"));
    setProblem(null);
    onRows(fromSchedule(built));
  }

  const update = (key: string, patch: Partial<DraftRow>) =>
    onRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const { sumHalalas, complete } = draftSum(rows);
  const difference = totalHalalas === null ? null : sumHalalas - totalHalalas;

  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <legend className="px-1 text-base font-semibold text-gray-900">{t.schedule.title}</legend>

      <div role="radiogroup" className="grid grid-cols-2 overflow-hidden rounded-lg border border-gray-300">
        {(["equal", "custom"] as const).map((m) => {
          const disabled = m === "equal" && equalDisabled;
          return (
            <label
              key={m}
              className={`flex min-h-11 items-center justify-center px-2 text-center text-sm font-medium ${
                mode === m ? "bg-accent text-white" : "bg-white text-gray-700"
              } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} has-focus-visible:outline-2 has-focus-visible:outline-accent`}
            >
              <input
                type="radio"
                name="scheduleMode"
                value={m}
                checked={mode === m}
                disabled={disabled}
                onChange={() => setMode(m)}
                className="sr-only"
                form="__none"
              />
              {m === "equal" ? t.schedule.modeEqual : t.schedule.modeCustom}
            </label>
          );
        })}
      </div>

      {mode === "equal" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label={t.schedule.count}
            name="scheduleCount"
            form="__none"
            type="number"
            inputMode="numeric"
            dir="ltr"
            min={1}
            max={maxCount}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
          <Select
            label={t.schedule.frequency}
            id="scheduleFrequency"
            form="__none"
            options={FREQUENCIES.map((f) => ({ value: f, label: t.schedule[f] }))}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
          />
          {frequency === "EVERY_N_DAYS" ? (
            <Input
              label={t.schedule.everyDays}
              name="scheduleEveryDays"
              form="__none"
              type="number"
              inputMode="numeric"
              dir="ltr"
              min={1}
              max={MAX_EVERY_DAYS}
              value={everyDays}
              onChange={(e) => setEveryDays(e.target.value)}
            />
          ) : null}
          <div className="sm:col-span-3">
            <Button
              variant="secondary"
              onClick={generate}
              disabled={totalHalalas === null || !ISO.test(startDate)}
            >
              {t.schedule.generate}
            </Button>
          </div>
          {problem ? (
            <p role="alert" className="text-sm font-medium text-money-out sm:col-span-3">
              {problem}
            </p>
          ) : null}
        </div>
      ) : null}

      <ScheduleRows
        rows={rows}
        startDate={startDate}
        onUpdate={update}
        onRemove={(key) => onRows(rows.filter((r) => r.key !== key))}
      />

      <div>
        <Button
          variant="secondary"
          size="sm"
          disabled={rows.length >= MAX_INSTALMENTS}
          onClick={() => onRows([...rows, { key: newKey(), dueDate: "", amount: "", fixed: false }])}
        >
          <PlusIcon size={18} />
          {t.schedule.addRow}
        </Button>
      </div>

      <div aria-live="polite" className="flex flex-col gap-1 rounded-lg bg-gray-50 p-3 text-sm">
        <p>
          {t.schedule.sum}: <MoneyText halalas={sumHalalas} />
        </p>
        {difference === null || !complete ? null : difference === 0 ? (
          <p className="inline-flex items-center gap-1 font-medium text-money-in">
            <CheckIcon size={16} />
            {t.schedule.matches}
          </p>
        ) : (
          <p className="font-medium text-money-out">
            {t.schedule.difference}: <MoneyText halalas={difference} signed />
          </p>
        )}
      </div>

      {error ? <p className="text-sm font-medium text-money-out">{errorMessage(error)}</p> : null}
    </fieldset>
  );
}

export default ScheduleBuilder;
