"use client";

/**
 * The generic feedback strip for an `ok: false` result with no fieldErrors, and
 * for "تم الحفظ". `message` is already-resolved Arabic — callers run an `err.*`
 * key through errorMessage() first.
 *
 * v1.4 part 3 (D29 R3, D31e): on phones it sits under the 69 px top bar
 * (`top-20 inset-x-4`), on md+ at the bottom; the strip itself ignores the
 * pointer (`pointer-events-none`) so it never blocks a button under it — only
 * the ✕ takes taps. A success toast dismisses itself after 3 s; an error toast
 * stays until dismissed (`role="alert"`, no timer).
 */
import { useEffect, useRef } from "react";

import { t } from "@/i18n/ar";

import { CloseIcon } from "./icons";

export type ToastProps = {
  message: string;
  tone?: "error" | "success";
  onDismiss?: () => void;
  /**
   * v1.4 part 3 (D34, qa-visual S1): rendered in the page flow (under the h1)
   * instead of fixed under the top bar — the landing pages' action row sits
   * exactly where a fixed strip would cover it for 3 s. Same look, no overlay.
   */
  inline?: boolean;
};

export const SUCCESS_DISMISS_MS = 3000;

const TONES = {
  error: "border-money-out bg-money-out-soft text-money-out",
  success: "border-money-in bg-money-in-soft text-money-in",
} as const;

/**
 * Starts the auto-dismiss timer for a success toast and returns its cleanup;
 * an error toast gets no timer at all. Pure apart from the global timer, so the
 * rule is testable with fake timers outside a DOM.
 */
export function startAutoDismiss(tone: "error" | "success", onDismiss?: () => void): () => void {
  if (tone !== "success" || !onDismiss) return () => undefined;
  const timer = setTimeout(onDismiss, SUCCESS_DISMISS_MS);
  return () => clearTimeout(timer);
}

export function Toast({ message, tone = "error", onDismiss, inline = false }: ToastProps) {
  const isError = tone === "error";
  // D34: a success toast leaves on its own, so it carries no ✕ — the ✕ was the one
  // pointer-taking spot of the strip and landed on «إضافة حركة» at 390 px.
  const closable = isError && Boolean(onDismiss);

  // The latest onDismiss through a ref, so a parent re-render (a new inline
  // arrow) does not restart the 3 s timer.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const hasDismiss = Boolean(onDismiss);
  useEffect(
    () => startAutoDismiss(tone, hasDismiss ? () => dismissRef.current?.() : undefined),
    [tone, hasDismiss],
  );

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`no-print flex items-start gap-3 rounded-lg border p-3 ${
        inline ? "w-full" : "pointer-events-none fixed inset-x-4 top-20 z-50 mx-auto max-w-sm shadow-lg"
      } ${TONES[tone]}`}
    >
      <p className="flex-1 text-start text-sm font-medium">{message}</p>
      {closable ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t.common.close}
          className="pointer-events-auto -me-1 -mt-1 flex size-11 items-center justify-center rounded-lg text-gray-600 hover:bg-white/60"
        >
          <CloseIcon size={18} />
        </button>
      ) : null}
    </div>
  );
}

export default Toast;
