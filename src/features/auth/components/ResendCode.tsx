"use client";

/**
 * «لم يصلك الرمز؟ أعد الإرسال» with its 60-second countdown (docs/FRONTEND.md,
 * v1.1e). The button stays disabled until the countdown ends; the server
 * enforces the same gate (`err.resendTooSoon`), so this is a courtesy, not
 * the rule.
 *
 * The countdown runs off a deadline, not a decrementing counter: a phone that
 * backgrounds the tab while its owner checks their email throttles timers, and
 * a counter would then lag the server's clock.
 */
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { errorMessage, t } from "@/i18n/ar";

import { resendVerification, type ResendState } from "./actions";

export function ResendCode({
  initialSeconds,
  onResent,
}: {
  initialSeconds: number;
  /** Called after a successful resend — the form clears its old code error. */
  onResent?: () => void;
}) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(initialSeconds);

  const [state, action] = useActionState(
    async (prev: ResendState): Promise<ResendState> => {
      const result = await resendVerification(prev);
      if (result.ok) {
        setRemaining(result.data.retryAfterSeconds);
        setDeadline(Date.now() + result.data.retryAfterSeconds * 1000);
        onResent?.();
      }
      return result;
    },
    null,
  );

  // The first deadline is taken on mount, not during render, so the server
  // and client render the same number.
  useEffect(() => {
    const end = deadline ?? Date.now() + initialSeconds * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [deadline, initialSeconds]);

  const waiting = remaining > 0;

  return (
    <form action={action} className="flex flex-col items-center gap-1">
      <Button
        type="submit"
        variant="ghost"
        disabled={waiting}
        pendingLabel={t.common.sending}
        aria-describedby={waiting ? "resend-timer" : undefined}
      >
        {t.verify.resend}
      </Button>

      {/* role="timer" is not announced on every tick; the button becoming
          enabled is the change that matters. */}
      {waiting ? (
        <p id="resend-timer" role="timer" className="text-xs text-gray-600">
          {t.verify.resendIn} <span className="tabular-nums">{remaining}</span>{" "}
          {t.verify.seconds}
        </p>
      ) : null}

      <p role="status" className="text-xs font-medium">
        {state?.ok ? <span className="text-money-in">{t.verify.resent}</span> : null}
        {state && !state.ok ? (
          <span className="text-money-out">{errorMessage(state.error)}</span>
        ) : null}
      </p>
    </form>
  );
}

export default ResendCode;
