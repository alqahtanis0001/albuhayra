"use client";

/**
 * The employee page's controls: «صرف راتب» (Y7 — this month's instalment only,
 * else `noSalaryDue` in words), تعديل, كشف الحساب (the party statement),
 * إنهاء الخدمة (EndEmploymentDialog) while active with no end date, and — the
 * same action, different words — إعادة تفعيل once ended, or إلغاء تاريخ انتهاء
 * الخدمة while an end date is still ahead (ConfirmDialog either way). The
 * server re-checks every one.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LinkButton } from "@/components/LinkButton";
import { Toast } from "@/components/Toast";
import { PencilIcon } from "@/components/icons";
import { reactivateEmployee } from "@/features/employees/lifecycle";
import { errorMessage, t } from "@/i18n/ar";

import { EndEmploymentDialog, type UnpaidMonth } from "./EndEmploymentDialog";

export function EmployeeActions({
  employeeId,
  partyId,
  canEnd,
  canReactivate,
  endPending = false,
  hasSalary,
  payInstalmentId,
  startDate,
  today,
  thisYm,
  unpaid,
}: {
  employeeId: string;
  partyId: string;
  canEnd: boolean;
  canReactivate: boolean;
  /** ACTIVE with a future end date: the action cancels the end, so it says so. */
  endPending?: boolean;
  hasSalary: boolean;
  /** This month's instalment when it is payable (Y7), else null. */
  payInstalmentId: string | null;
  startDate: string;
  today: string;
  /** "YYYY-MM" of the server's today: كشف الشهر opens on it. */
  thisYm: string;
  unpaid: UnpaidMonth[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"end" | "reactivate" | null>(null);

  const undo = endPending
    ? { label: t.employees.cancelEnd, message: t.employees.cancelEndConfirm }
    : { label: t.employees.reactivate, message: t.employees.reactivateConfirm };

  const reactivate = () =>
    start(async () => {
      const result = await reactivateEmployee(employeeId);
      setDialog(null);
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  return (
    <div className="no-print flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {payInstalmentId ? (
          <LinkButton href={`/owner/transactions/new?instalmentId=${payInstalmentId}`}>
            {t.employees.paySalary}
          </LinkButton>
        ) : null}
        <LinkButton href={`/owner/staff/${employeeId}/edit`} variant="secondary">
          <PencilIcon size={18} />
          {t.common.edit}
        </LinkButton>
        <LinkButton href={`/owner/staff/${employeeId}/month/${thisYm}`} variant="secondary">
          {t.employees.monthSheet}
        </LinkButton>
        <LinkButton href={`/owner/parties/${partyId}`} variant="secondary">
          {t.employees.statement}
        </LinkButton>
        {canEnd ? (
          <Button variant="secondary" onClick={() => setDialog("end")}>
            {t.employees.end}
          </Button>
        ) : null}
        {canReactivate ? (
          <Button variant="secondary" pending={pending} onClick={() => setDialog("reactivate")}>
            {undo.label}
          </Button>
        ) : null}
      </div>
      {hasSalary && !payInstalmentId ? (
        <p className="text-xs text-gray-600">{t.employees.noSalaryDue}</p>
      ) : null}

      {canEnd ? (
        <EndEmploymentDialog
          open={dialog === "end"}
          onClose={() => setDialog(null)}
          employeeId={employeeId}
          startDate={startDate}
          today={today}
          unpaid={unpaid}
          hasSalary={hasSalary}
        />
      ) : null}
      {canReactivate ? (
        <ConfirmDialog
          open={dialog === "reactivate"}
          title={undo.label}
          message={undo.message}
          confirmLabel={undo.label}
          tone="accent"
          pending={pending}
          onCancel={() => setDialog(null)}
          onConfirm={reactivate}
        />
      ) : null}

      {error ? <Toast message={errorMessage(error)} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}

export default EmployeeActions;
