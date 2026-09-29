"use client";

/**
 * One month in the lock grid. `lockable` is decided on the **server** — false for
 * the open month and anything after it — so the client never decides what "now"
 * is. That is the whole reason `todayISO()` exists in one place.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";
import { errorMessage, t } from "@/i18n/ar";
import { lockMonth, unlockMonth } from "@/features/locks/actions";
import type { LockRow } from "@/features/locks/queries";

export function LockCell({ row, label }: { row: LockRow; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () =>
    start(async () => {
      const result = row.locked
        ? await unlockMonth(row.year, row.month)
        : await lockMonth(row.year, row.month);
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        row.locked ? "border-gray-300 bg-gray-50" : "border-gray-200 bg-white"
      }`}
    >
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <span className="text-xs text-gray-600">
        {row.locked ? t.settings.locked : t.settings.unlocked}
      </span>

      {row.locked && row.lockedByName ? (
        <span className="text-xs text-gray-500">
          {t.settings.lockedBy}: {row.lockedByName}
        </span>
      ) : null}

      {row.lockable ? (
        <Button size="sm" variant="secondary" pending={pending} onClick={toggle}>
          {row.locked ? t.settings.unlock : t.settings.lock}
        </Button>
      ) : (
        <span className="text-xs text-gray-500">{t.settings.currentMonthHint}</span>
      )}

      {error ? (
        <Toast message={errorMessage(error)} onDismiss={() => setError(null)} />
      ) : null}
    </div>
  );
}

export default LockCell;
