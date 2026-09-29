"use client";

/**
 * The generic feedback strip for an `ok: false` result with no fieldErrors, and
 * for "تم الحفظ". `message` is already-resolved Arabic — callers run an `err.*`
 * key through errorMessage() first. Sits above the bottom tab bar on mobile.
 */
import { t } from "@/i18n/ar";

import { CloseIcon } from "./icons";

export type ToastProps = {
  message: string;
  tone?: "error" | "success";
  onDismiss?: () => void;
};

const TONES = {
  error: "border-money-out bg-money-out-soft text-money-out",
  success: "border-money-in bg-money-in-soft text-money-in",
} as const;

export function Toast({ message, tone = "error", onDismiss }: ToastProps) {
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`no-print fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-lg border p-3 shadow-lg md:bottom-6 ${TONES[tone]}`}
    >
      <p className="flex-1 text-start text-sm font-medium">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t.common.close}
          className="-me-1 -mt-1 flex size-11 items-center justify-center rounded-lg text-gray-600 hover:bg-white/60"
        >
          <CloseIcon size={18} />
        </button>
      ) : null}
    </div>
  );
}

export default Toast;
