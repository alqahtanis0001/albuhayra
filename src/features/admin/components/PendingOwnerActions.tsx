"use client";

/**
 * قبول / رفض for one owner sign-up. Both are behind a ConfirmDialog: approving
 * creates the establishment's default categories, and rejecting disables the
 * establishment — neither is a click to take back.
 *
 * قبول is disabled while the email is unverified, with the reason beside it;
 * `approveOwner` refuses the same case (`err.emailNotVerified`). رفض stays.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Toast } from "@/components/Toast";
import { errorMessage, t } from "@/i18n/ar";
import { approveOwner, rejectOwner } from "@/features/admin/actions";

type Asking = "approve" | "reject" | null;

export function PendingOwnerActions({
  userId,
  emailVerified,
}: {
  userId: string;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<Asking>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (call: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const result = await call();
      setAsking(null);
      if (result.ok) router.refresh();
      else setError(result.error ?? "err.unexpected");
    });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          pending={pending}
          disabled={!emailVerified}
          aria-describedby={emailVerified ? undefined : `unverified-${userId}`}
          onClick={() => setAsking("approve")}
        >
          {t.common.accept}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          pending={pending}
          onClick={() => setAsking("reject")}
        >
          {t.common.reject}
        </Button>
      </div>
      {emailVerified ? null : (
        <p id={`unverified-${userId}`} className="text-xs text-gray-600">
          {t.err.emailNotVerified}
        </p>
      )}

      <ConfirmDialog
        open={asking === "approve"}
        title={t.common.accept}
        message={t.admin.approveOwnerConfirm}
        confirmLabel={t.common.accept}
        tone="accent"
        pending={pending}
        onCancel={() => setAsking(null)}
        onConfirm={() => run(() => approveOwner(userId))}
      />

      <ConfirmDialog
        open={asking === "reject"}
        title={t.common.reject}
        message={t.admin.rejectOwnerConfirm}
        confirmLabel={t.common.reject}
        pending={pending}
        onCancel={() => setAsking(null)}
        onConfirm={() => run(() => rejectOwner(userId))}
      />

      {error ? (
        <Toast message={errorMessage(error)} onDismiss={() => setError(null)} />
      ) : null}
    </>
  );
}

export default PendingOwnerActions;
