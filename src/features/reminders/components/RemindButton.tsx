"use client";

/**
 * «تذكير» on an unpaid IN instalment of an opted-in party (spec §4.2, C10–C12).
 * The caller decides whether it shows; the server re-checks everything. Opens
 * a native modal dialog (focus trap and Escape from the platform, as in
 * ConfirmDialog) with two explicit actions — nothing is ever sent on its own:
 * - إرسال بريد إلكتروني: disabled, with the reason said, when the party has no email;
 * - نص واتساب: fetches the copy-ready text (the fetch is audited), shown with «نسخ النص».
 * Refusals are said inside the dialog: a Toast would sit under the modal's
 * top layer. Only the email's success toast shows, after the dialog closes.
 */
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";
import { fillTemplate } from "@/components/fillTemplate";
import { prepareWhatsAppReminder, sendClientReminder } from "@/features/reminders/client";
import { errorMessage, t } from "@/i18n/ar";

export function RemindButton({
  instalmentId,
  partyName,
  hasEmail,
}: {
  instalmentId: string;
  partyName: string;
  hasEmail: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const noEmailId = useId();
  const textId = useId();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"email" | "text" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"copied" | "failed" | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const openDialog = () => {
    setError(null);
    setText(null);
    setCopyState(null);
    setOpen(true);
  };

  const sendEmail = () =>
    start(async () => {
      setError(null);
      setBusy("email");
      const result = await sendClientReminder(instalmentId);
      setBusy(null);
      if (result.ok) {
        setOpen(false);
        setSent(true);
      } else setError(result.error);
    });

  const prepareText = () =>
    start(async () => {
      setError(null);
      setCopyState(null);
      setBusy("text");
      const result = await prepareWhatsAppReminder(instalmentId);
      setBusy(null);
      if (result.ok) setText(result.data.text);
      else setError(result.error);
    });

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      // No clipboard permission, or an insecure context: say so, and select the
      // text so the owner can copy it by hand.
      setCopyState("failed");
      textRef.current?.focus();
      textRef.current?.select();
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" className="no-print" onClick={openDialog}>
        {t.clientReminder.remind}
      </Button>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        aria-labelledby={titleId}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-0 text-gray-900 backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-3 p-5 text-start">
          <h2 id={titleId} className="text-base font-semibold">
            {fillTemplate(t.clientReminder.dialogTitle, { name: <bdi>{partyName}</bdi> })}
          </h2>

          <div className="flex flex-wrap gap-2">
            <Button
              pending={pending && busy === "email"}
              disabled={!hasEmail || pending}
              aria-describedby={hasEmail ? undefined : noEmailId}
              onClick={sendEmail}
            >
              {t.clientReminder.byEmail}
            </Button>
            <Button
              variant="secondary"
              pending={pending && busy === "text"}
              disabled={pending}
              onClick={prepareText}
            >
              {t.clientReminder.byWhatsApp}
            </Button>
          </div>
          {hasEmail ? null : (
            <p id={noEmailId} className="text-xs text-gray-600">
              {t.clientReminder.noEmail}
            </p>
          )}

          {text !== null ? (
            <div className="flex flex-col gap-2">
              <label htmlFor={textId} className="text-xs text-gray-600">
                {t.clientReminder.whatsAppHelp}
              </label>
              <textarea
                ref={textRef}
                id={textId}
                readOnly
                value={text}
                rows={5}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={copy}>
                  {t.clientReminder.copyText}
                </Button>
                <span
                  role="status"
                  className={`text-xs font-medium ${copyState === "failed" ? "text-gray-700" : "text-accent-dark"}`}
                >
                  {copyState === "copied"
                    ? t.clientReminder.copied
                    : copyState === "failed"
                      ? t.clientReminder.copyFailed
                      : ""}
                </span>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm font-medium text-money-out">
              {errorMessage(error)}
            </p>
          ) : null}

          <div className="mt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              {t.common.close}
            </Button>
          </div>
        </div>
      </dialog>

      {sent ? (
        <Toast message={t.clientReminder.sent} tone="success" onDismiss={() => setSent(false)} />
      ) : null}
    </>
  );
}

export default RemindButton;
