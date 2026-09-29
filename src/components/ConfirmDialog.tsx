"use client";

/**
 * Destructive actions go through this. A native <dialog> opened with
 * showModal() traps focus and closes on Escape for free, which is exactly what
 * docs/FRONTEND.md asks for — no focus-trap library.
 */
import { useEffect, useId, useRef } from "react";

import { t } from "@/i18n/ar";

import { Button } from "./Button";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for delete/reject, `accent` for everything else. */
  tone?: "danger" | "accent";
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = t.common.confirm,
  cancelLabel = t.common.cancel,
  tone = "danger",
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Escape lands here, as does our own close() above; the parent owns `open`.
      // A backdrop click does *not* dismiss a native modal dialog, and that is
      // wanted: a stray click outside must not cancel a destructive confirm.
      onClose={onCancel}
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
      className="w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-0 text-gray-900 backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-3 p-5 text-start">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {message ? (
          <p id={messageId} className="text-sm text-gray-600">
            {message}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            pending={pending}
          >
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
