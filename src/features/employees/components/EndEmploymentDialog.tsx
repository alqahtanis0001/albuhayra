"use client";

/**
 * إنهاء الخدمة (D6, spec §3.2): a native modal <dialog> (focus trap and Escape
 * from the platform, like ConfirmDialog) holding the end date. What the owner
 * is told depends on the date, decided against the server's today:
 * - past → the unpaid months are listed with the write-off warning, because
 *   saving archives the salary plan now;
 * - today or later → `endFutureWarning`: on that date the unpaid months will
 *   be written off (B3, closed by telling the owner at the moment of choosing).
 */
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { DateText } from "@/components/DateText";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { MoneyText } from "@/components/MoneyText";
import { endEmployment } from "@/features/employees/lifecycle";
import { periodLabel } from "@/features/plans/components/PlanBits";
import { t } from "@/i18n/ar";
import type { ActionResult } from "@/lib/validation";

export type UnpaidMonth = {
  instalmentId: string;
  periodYm: string;
  dueDate: string;
  paidHalalas: number;
  remainingHalalas: number;
};

/**
 * What a past end date writes off (S-M2a): unfixed months after it are deleted,
 * not written off, so only months due by then — or already part-paid, which
 * stay — are listed.
 */
export const writtenOff = (unpaid: UnpaidMonth[], endDate: string) =>
  unpaid.filter((m) => m.dueDate <= endDate || m.paidHalalas > 0);

type Result = ActionResult<null>;

export function EndEmploymentDialog({
  open,
  onClose,
  employeeId,
  startDate,
  today,
  unpaid,
  hasSalary,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  startDate: string;
  today: string;
  unpaid: UnpaidMonth[];
  /** No salary and no unpaid months → nothing to warn about. */
  hasSalary: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const [state, formAction, pending] = useActionState(
    async (prev: Result | null, formData: FormData): Promise<Result | null> => {
      const result = await endEmployment(employeeId, prev, formData);
      if (result.ok) {
        onClose();
        router.refresh();
      }
      return result;
    },
    null,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const past = endDate !== "" && endDate < today;
  const listed = past ? writtenOff(unpaid, endDate) : [];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-0 text-gray-900 backdrop:bg-black/50"
    >
      <form action={formAction} className="flex flex-col gap-3 p-5 text-start" noValidate>
        <h2 id={titleId} className="text-base font-semibold">
          {t.employees.endTitle}
        </h2>
        <p className="text-sm text-gray-600">{t.employees.endConfirm}</p>
        <Input
          label={t.employees.endDate}
          name="endDate"
          type="date"
          min={startDate}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
          error={errors?.endDate}
        />

        {/* A removed salary can leave an open plan with unpaid months (D5): still warn. */}
        {!hasSalary && unpaid.length === 0 ? null : past ? (
          listed.length > 0 ? (
            <div role="status" className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">{t.employees.endUnpaidWarning}</p>
              <ul className="flex flex-col gap-1">
                {listed.map((m) => (
                  <li key={m.instalmentId} className="flex flex-wrap items-start justify-between gap-2">
                    <span className="flex items-start gap-2">
                      {periodLabel(m.periodYm)}
                      <DateText date={m.dueDate} compact className="text-xs" />
                    </span>
                    <span>
                      {t.employees.remaining}: <MoneyText halalas={m.remainingHalalas} inheritColor />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        ) : (
          <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {t.employees.endFutureWarning}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="submit" variant="danger" pending={pending}>
            {t.employees.end}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
        </div>
        <FormToast state={state} />
      </form>
    </dialog>
  );
}

export default EndEmploymentDialog;
