"use client";

/**
 * The join code, large enough to read out loud, plus copy and regenerate.
 * Regenerating is behind a ConfirmDialog because the old code stops working the
 * instant it happens — an employee mid-signup is cut off, so it needs the warning
 * `t.settings.regenerateConfirm` carries.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Toast } from "@/components/Toast";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { errorMessage, t } from "@/i18n/ar";
import { regenerateJoinCode } from "@/features/establishments/actions";

export function JoinCodeTab({ code }: { code: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // No clipboard permission, or an insecure context. The code is on screen
      // and selectable, so there is nothing to recover from.
      setError("err.unexpected");
    }
  };

  return (
    <Card title={t.settings.joinCodeTitle}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">{t.settings.joinCodeHint}</p>

        <bdi className="block rounded-lg border border-gray-300 bg-gray-50 p-4 text-center font-mono text-3xl tracking-[0.3em] text-gray-900">
          {code ?? "—"}
        </bdi>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copy} disabled={!code}>
            {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
            {copied ? t.common.copied : t.common.copy}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(true)} pending={pending}>
            {t.settings.regenerate}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title={t.settings.regenerate}
        message={t.settings.regenerateConfirm}
        pending={pending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          start(async () => {
            const result = await regenerateJoinCode();
            if (result.ok) {
              setCopied(false);
              router.refresh();
            } else setError(result.error);
          });
        }}
      />

      {error ? (
        <Toast message={errorMessage(error)} onDismiss={() => setError(null)} />
      ) : null}
    </Card>
  );
}

export default JoinCodeTab;
