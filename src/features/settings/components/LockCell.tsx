"use client";

/**
 * One month in the lock grid. `lockable` is decided on the **server** — false for
 * the open month and anything after it — so the client never decides what "now"
 * is. That is the whole reason `todayISO()` exists in one place.
 *
 * v1.4 (D17 c19): «إلغاء الإقفال» asks first — reopening a month lets everyone
 * add and edit in it again. v1.4 part 3 (D29 R12, supersedes c19's one-tap
 * lock): «إقفال» asks too, one sentence naming the month, so a mis-tap cannot
 * lock the wrong month silently. The dialog is rendered only while open (24
 * cells, one <dialog> at most) and is not destructive, so it takes the accent
 * tone.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Toast } from "@/components/Toast";
import { errorMessage, t } from "@/i18n/ar";
import { lockMonth, unlockMonth } from "@/features/locks/actions";
import type { LockRow } from "@/features/locks/queries";

/** Which control a press of the cell's button reaches: both arms ask first (R12). */
export function pressTarget(_locked: boolean): "confirm" | "toggle" {
  return "confirm";
}

/** The dialog's one sentence, by the month's current state; `label` names the month. */
export function dialogText(locked: boolean, label: string): { title: string; message: string } {
  return locked
    ? { title: `${t.settings.unlock}: ${label}`, message: t.settings.unlockConfirm }
    : { title: `${t.settings.lock}: ${label}`, message: t.settings.lockConfirm.replace("{month}", label) };
}

export function LockCell({ row, label }: { row: LockRow; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = () =>
    start(async () => {
      const result = row.locked
        ? await unlockMonth(row.year, row.month)
        : await lockMonth(row.year, row.month);
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  const press = () => (pressTarget(row.locked) === "confirm" ? setConfirm(true) : toggle());
  const dialog = dialogText(row.locked, label);

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
        <Button size="sm" variant="secondary" pending={pending} onClick={press}>
          {row.locked ? t.settings.unlock : t.settings.lock}
        </Button>
      ) : (
        <span className="text-xs text-gray-500">{t.settings.currentMonthHint}</span>
      )}

      {confirm ? (
        <ConfirmDialog
          open
          title={dialog.title}
          message={dialog.message}
          tone="accent"
          pending={pending}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            toggle();
          }}
        />
      ) : null}

      {error ? (
        <Toast message={errorMessage(error)} onDismiss={() => setError(null)} />
      ) : null}
    </div>
  );
}

export default LockCell;
