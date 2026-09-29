import "server-only";

import { t } from "@/i18n/ar";
import type { MailMessage } from "./send";

/**
 * The three emails (docs/BACKEND.md v1.1e "Email"). Arabic, right to left,
 * plain HTML with inline styles, plus a plain-text part. Every word comes from
 * `t.mail.*`, and **no user-supplied text** appears in any of them (A13) —
 * not even a name — so a sign-up form cannot be used to put words in our mail.
 * The only variable is the code, which is six digits we generated.
 */

const GREEN = "#006C35";

/** The logo URL, or null when APP_URL is unset or not http(s). */
function logoUrl(): string | null {
  const base = process.env.APP_URL;
  if (!base) return null;
  try {
    const url = new URL("/brand/zakham-brand/zakham-wordmark-green.png", base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function header(): string {
  const logo = logoUrl();
  return logo
    ? `<img src="${logo}" alt="${t.mail.senderName}" width="140" style="display:block;border:0;height:auto;margin:0 0 24px">`
    : `<div style="font-size:28px;font-weight:700;color:${GREEN};margin:0 0 24px">${t.mail.senderName}</div>`;
}

function page(body: string): string {
  return `<!doctype html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:Tahoma,Arial,sans-serif;color:#1f1f1f">
<div dir="rtl" style="max-width:480px;margin:0 auto;background:#ffffff;padding:32px;border-top:4px solid ${GREEN};text-align:right;line-height:1.7">
${header()}
${body}
</div>
</body>
</html>`;
}

function codeMessage(to: string, subject: string, intro: string, code: string): MailMessage {
  if (!/^\d{6}$/.test(code)) throw new Error("A mail code must be six digits");
  const html = page(`<p style="margin:0 0 16px;font-size:16px">${intro}</p>
<p dir="ltr" style="margin:0 0 16px;font-size:34px;font-weight:700;letter-spacing:8px;color:${GREEN};text-align:center;font-family:Consolas,'Courier New',monospace">${code}</p>
<p style="margin:0 0 8px;font-size:14px">${t.mail.expiry}</p>
<p style="margin:0;font-size:13px;color:#525252">${t.mail.ignore}</p>`);
  const text = [t.mail.senderName, "", intro, "", code, "", t.mail.expiry, t.mail.ignore].join("\n");
  return { to, subject, html, text };
}

export function verifyMail(to: string, code: string): MailMessage {
  return codeMessage(to, t.mail.verifySubject, t.mail.verifyIntro, code);
}

export function resetMail(to: string, code: string): MailMessage {
  return codeMessage(to, t.mail.resetSubject, t.mail.resetIntro, code);
}

/** Sent instead of a code when someone signs up with an address already registered. */
export function existsMail(to: string): MailMessage {
  const html = page(`<p style="margin:0 0 16px;font-size:16px">${t.mail.existsBody}</p>
<p style="margin:0;font-size:13px;color:#525252">${t.mail.ignore}</p>`);
  const text = [t.mail.senderName, "", t.mail.existsBody, "", t.mail.ignore].join("\n");
  return { to, subject: t.mail.existsSubject, html, text };
}
