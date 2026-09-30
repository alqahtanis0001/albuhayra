"use client";

/**
 * An agreement's controls while it is open: تعديل, أرشفة (ConfirmDialog — it
 * writes off the unpaid remainder and cannot be undone in v1.2a), and إلغاء
 * (ConfirmDialog) only when `canCancel` — nothing paid; otherwise the reason is
 * shown instead. The server re-checks both.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LinkButton } from "@/components/LinkButton";
import { Toast } from "@/components/Toast";
import { PencilIcon } from "@/components/icons";
import { archivePlan, cancelPlan } from "@/features/plans/actions";
import { errorMessage, t } from "@/i18n/ar";

export function PlanActions({ planId, canCancel }: { planId: string; canCancel: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"archive" | "cancel" | null>(null);

  const run = (call: () => ReturnType<typeof archivePlan>) =>
    start(async () => {
      const result = await call();
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  return (
    <div className="no-print flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/owner/plans/${planId}/edit`} variant="secondary">
          <PencilIcon size={18} />
          {t.common.edit}
        </LinkButton>
        <Button variant="secondary" pending={pending} onClick={() => setConfirm("archive")}>
          {t.plans.archive}
        </Button>
        {canCancel ? (
          <Button variant="danger" pending={pending} onClick={() => setConfirm("cancel")}>
            {t.plans.cancel}
          </Button>
        ) : null}
      </div>
      {canCancel ? null : <p className="text-xs text-gray-600">{t.plans.cancelBlocked}</p>}

      <ConfirmDialog
        open={confirm === "archive"}
        title={t.plans.archive}
        message={t.plans.archiveConfirm}
        confirmLabel={t.plans.archive}
        pending={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          run(() => archivePlan(planId));
        }}
      />
      {canCancel ? (
        <ConfirmDialog
          open={confirm === "cancel"}
          title={t.plans.cancel}
          message={t.plans.cancelConfirm}
          confirmLabel={t.plans.cancel}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            run(() => cancelPlan(planId));
          }}
        />
      ) : null}

      {error ? <Toast message={errorMessage(error)} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}

export default PlanActions;
