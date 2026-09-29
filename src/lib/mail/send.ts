import "server-only";

import { t } from "@/i18n/ar";
import { consumeLimit, LIMITS } from "../rateLimit";

/**
 * Transactional email through Brevo's REST API with plain `fetch` — no SDK
 * (Decision in PROGRESS.md). Server-only.
 *
 * Callers never `await` this in a response path: every send is scheduled with
 * `after()` (A6). Logs carry the HTTP status, Brevo's error code and the
 * recipient's **domain** only — never the API key, a code, or the address.
 */

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export type MailMessage = { to: string; subject: string; html: string; text: string };

let warnedDisabled = false;

function recipientDomain(address: string): string {
  return address.slice(address.lastIndexOf("@") + 1).replace(/[^a-z0-9.-]/gi, "");
}

/** Brevo's `code` field, reduced to something safe to log. */
async function brevoCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { code?: unknown };
    return typeof body.code === "string" ? body.code.replace(/[^a-z_]/gi, "").slice(0, 40) : "";
  } catch {
    return "";
  }
}

/** Sends one message. Resolves `false` on any failure; never throws. */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mail] BREVO_API_KEY or MAIL_FROM is not set; message not sent");
    } else if (!warnedDisabled) {
      warnedDisabled = true;
      console.warn("[mail] BREVO_API_KEY or MAIL_FROM is not set; mail is disabled");
    }
    return false;
  }

  const domain = recipientDomain(message.to);
  try {
    const response = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: t.mail.senderName, email: from },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const code = await brevoCode(response);
      console.error(`[mail] Brevo refused: ${response.status} ${code} (to @${domain})`);
      return false;
    }
    return true;
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    console.error(`[mail] send failed: ${name} (to @${domain})`);
    return false;
  }
}

/**
 * `sendMail` behind the mail caps (A7): per sending IP per day and per
 * recipient per hour. A capped message is skipped silently — the caller's
 * response never changes, so the caps cannot be used to learn anything.
 */
export async function deliver(message: MailMessage, ip: string): Promise<boolean> {
  if (!consumeLimit(`mail:${ip}`, LIMITS.mailIp)) return false;
  if (!consumeLimit(`mailto:${message.to}`, LIMITS.mailTo)) return false;
  return sendMail(message);
}
