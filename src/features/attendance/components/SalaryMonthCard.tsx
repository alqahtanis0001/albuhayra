"use client";

/**
 * The month's salary on the owner's monthly sheet (spec §3.4, D9, Z4): gross,
 * each deduction with its reason, net, paid and remaining. While the month is
 * editable (plan OPEN, month unpaid) the owner adds a deduction (amount +
 * reason, which shows on the payslip) or deletes one (ConfirmDialog); once
 * not, `t.deductions.lockedHint` says why. The server re-checks both.
 */
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { MoneyText } from "@/components/MoneyText";
import { Toast } from "@/components/Toast";
import { TrashIcon } from "@/components/icons";
import type { MonthSalary } from "@/features/attendance/month";
import { addDeduction, deleteDeduction } from "@/features/payroll/deductions";
import { AmountField } from "@/features/transactions/components/AmountField";
import { errorMessage, t } from "@/i18n/ar";
import { parseSAR } from "@/lib/money";
import type { ActionResult } from "@/lib/validation";

type Result = ActionResult<null>;

function Line({ label, halalas, strong = false }: { label: string; halalas: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${strong ? "font-semibold text-gray-900" : ""}`}>
      <dt className={strong ? "" : "text-gray-600"}>{label}</dt>
      <dd>
        <MoneyText halalas={halalas} />
      </dd>
    </div>
  );
}

export function SalaryMonthCard({ employeeId, salary }: { employeeId: string; salary: MonthSalary }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: Result | null, formData: FormData): Promise<Result | null> => {
      if (amount.trim() !== "" && parseSAR(amount) === null) {
        return { ok: false, error: "err.invalidInput", fieldErrors: { amountHalalas: "err.amountInvalid" } };
      }
      const result = await addDeduction(employeeId, prev, formData);
      if (result.ok) {
        setAmount("");
        setReason("");
        router.refresh();
      }
      return result;
    },
    null,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  const remove = (id: string) =>
    startDelete(async () => {
      const result = await deleteDeduction(id);
      setConfirm(null);
      if (result.ok) router.refresh();
      else setDeleteError(result.error);
    });

  return (
    <Card title={t.employees.sectionSalary} className="report-card">
      <dl className="flex flex-col gap-2 text-sm">
        <Line label={t.employees.gross} halalas={salary.grossHalalas} />
        {salary.deductions.length === 0 ? (
          <div className="flex justify-between gap-2">
            <dt className="text-gray-600">{t.employees.deductions}</dt>
            <dd className="text-gray-600">{t.deductions.none}</dd>
          </div>
        ) : (
          salary.deductions.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2">
              <dt className="min-w-0 text-gray-600">
                {t.employees.deductions}: {d.reason}
              </dt>
              <dd className="flex items-center gap-1">
                <MoneyText halalas={d.amountHalalas} />
                {salary.editable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="no-print"
                    aria-label={`${t.deductions.delete}: ${d.reason}`}
                    onClick={() => setConfirm(d.id)}
                  >
                    <TrashIcon size={16} />
                  </Button>
                ) : null}
              </dd>
            </div>
          ))
        )}
        <Line label={t.employees.net} halalas={salary.netHalalas} strong />
        <Line label={t.employees.paid} halalas={salary.paidHalalas} />
        <Line label={t.employees.remaining} halalas={salary.remainingHalalas} />
      </dl>

      {salary.editable ? (
        <form action={formAction} className="no-print mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4" noValidate>
          <p className="text-sm font-semibold text-gray-900">{t.deductions.add}</p>
          <input type="hidden" name="periodYm" value={salary.periodYm} />
          <AmountField
            label={t.deductions.amount}
            id="deductionAmount"
            name="amountHalalas"
            value={amount}
            onChange={setAmount}
            error={errors?.amountHalalas}
          />
          <Input
            label={t.deductions.reason}
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            hint={t.deductions.reasonHelp}
            maxLength={200}
            required
            error={errors?.reason}
          />
          {errors?.periodYm ? (
            <p className="text-xs font-medium text-money-out">{errorMessage(errors.periodYm)}</p>
          ) : null}
          <div>
            <Button type="submit" pending={pending}>
              {t.deductions.add}
            </Button>
          </div>
          <FormToast state={state} />
        </form>
      ) : (
        <p className="no-print mt-3 text-xs text-gray-600">{t.deductions.lockedHint}</p>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={t.deductions.delete}
        message={t.deductions.deleteConfirm}
        confirmLabel={t.common.delete}
        pending={deleting}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove(confirm)}
      />
      {deleteError ? <Toast message={errorMessage(deleteError)} onDismiss={() => setDeleteError(null)} /> : null}
    </Card>
  );
}

export default SalaryMonthCard;
