"use client";

/**
 * The schedule preview's editable rows (ScheduleBuilder): row number, due date
 * with its Hijri beneath, amount, and a remove button — or, for a row that
 * already has a payment, read-only fields and the lock hint (W4). Inputs carry
 * `form="__none"` so they never reach FormData (see ScheduleBuilder).
 */
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { LockIcon, TrashIcon } from "@/components/icons";
import { t } from "@/i18n/ar";
import { isoToDate, toHijri } from "@/lib/dates";

import type { DraftRow } from "./scheduleDraft";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function ScheduleRows({
  rows,
  startDate,
  onUpdate,
  onRemove,
}: {
  rows: DraftRow[];
  startDate: string;
  onUpdate: (key: string, patch: Partial<DraftRow>) => void;
  onRemove: (key: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <ol className="flex flex-col divide-y divide-gray-200 border-y border-gray-200">
      {rows.map((row, i) => (
        <li key={row.key} className="flex flex-col gap-2 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-700">
              {t.schedule.row} <bdi className="tabular-nums">{i + 1}</bdi>
            </span>
            {row.fixed ? (
              <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                <LockIcon size={14} />
                {t.plans.lockedRowHint}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${t.schedule.removeRow} ${i + 1}`}
                onClick={() => onRemove(row.key)}
              >
                <TrashIcon size={18} />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Input
                label={t.schedule.dueDate}
                name={`due-${row.key}`}
                form="__none"
                type="date"
                value={row.dueDate}
                min={startDate || undefined}
                readOnly={row.fixed}
                onChange={(e) => onUpdate(row.key, { dueDate: e.target.value })}
              />
              {ISO.test(row.dueDate) ? (
                <bdi className="text-xs text-gray-500 tabular-nums">
                  {toHijri(isoToDate(row.dueDate))}
                </bdi>
              ) : null}
            </div>
            <Input
              label={t.schedule.amountDue}
              name={`amount-${row.key}`}
              form="__none"
              inputMode="decimal"
              dir="ltr"
              suffix={t.common.currency}
              value={row.amount}
              readOnly={row.fixed}
              onChange={(e) => onUpdate(row.key, { amount: e.target.value })}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default ScheduleRows;
