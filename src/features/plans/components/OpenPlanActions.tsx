"use client";

/**
 * v1.4 C3 — an open agreement's controls: تعديل and «إنهاء الاتفاقية»
 * (ConfirmDialog → `closeOpenPlan`, ARCHIVED, the payments stay) while it is
 * open; «إعادة فتح» (`reopenOpenPlan`) once it is closed. The server re-checks.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LinkButton } from "@/components/LinkButton";
import { Toast } from "@/components/Toast";
import { PencilIcon } from "@/components/icons";
import { closeOpenPlan, reopenOpenPlan } from "@/features/plans/openActions";
import { errorMessage, t } from "@/i18n/ar";

export function OpenPlanActions({ planId, canClose, canReopen }: { planId: string; canClose: boolean; canReopen: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const run = (call: () => ReturnType<typeof closeOpenPlan>) =>
    start(async () => {
      const result = await call();
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  return (
    <div className="no-print flex flex-wrap gap-2">
      {canClose ? (
        <>
          <LinkButton href={`/owner/plans/${planId}/edit`} variant="secondary">
            <PencilIcon size={18} />
            {t.common.edit}
          </LinkButton>
          <Button variant="secondary" pending={pending} onClick={() => setConfirm(true)}>
            {t.openPlan.close}
          </Button>
          <ConfirmDialog
            open={confirm}
            title={t.openPlan.close}
            message={t.openPlan.closeConfirm}
            confirmLabel={t.openPlan.close}
            tone="accent"
            pending={pending}
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              setConfirm(false);
              run(() => closeOpenPlan(planId));
            }}
          />
        </>
      ) : null}
      {canReopen ? (
        <Button variant="secondary" pending={pending} onClick={() => run(() => reopenOpenPlan(planId))}>
          {t.openPlan.reopen}
        </Button>
      ) : null}
      {error ? <Toast message={errorMessage(error)} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}

export default OpenPlanActions;
