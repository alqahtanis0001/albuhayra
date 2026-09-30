import "server-only";

import { t } from "@/i18n/ar";
import { formatSAR } from "@/lib/money";
import { plural } from "@/lib/plural";

import { escapeHtml, plainLine } from "./escape";
import type { MailMessage } from "./send";

/**
 * The three auth emails (docs/BACKEND.md v1.1e "Email"). Arabic, right to
 * left, plain HTML with inline styles, plus a plain-text part. Every word comes
 * from `t.mail.*`, and **no user-supplied text** appears in any of them (A13) —
 * not even a name — so a sign-up form cannot be used to put words in our mail.
 * The only variable is the code, which is six digits we generated.
 *
 * v1.2c: the owner digest (`digestMail`, below) is the one exception, by the
 * spec — it shows the owner their own party names and plan titles, escaped with
 * `escapeHtml` in the HTML part and `plainLine` elsewhere (C7, E7). A13 still
 * binds the three auth emails.
 */

const GREEN = "#006C35";

/** `path` on APP_URL, or null when APP_URL is unset or not http(s). */
function appUrl(path: string): string | null {
  const base = process.env.APP_URL;
  if (!base) return null;
  try {
    const url = new URL(path, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** The logo URL, or null when APP_URL is unset or not http(s). */
function logoUrl(): string | null {
  return appUrl("/brand/zakham-brand/zakham-wordmark-green.png");
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

/* ------------------------------------------------------------ v1.2c digest */

type DigestMailRow = {
  partyName: string;
  planTitle: string;
  direction: "IN" | "OUT";
  remainingHalalas: number;
  dueDate: string;
};
type DigestMailGroup = { rows: DigestMailRow[]; moreCount: number; totalInHalalas: number; totalOutHalalas: number };
export type DigestMailInput = {
  establishmentName: string;
  groups: Record<"overdue" | "today" | "tomorrow" | "upcoming", DigestMailGroup>;
};

/**
 * Every `{key}` of the template in ONE pass (a string may hold one twice), with
 * a function replacer: a `$&`, `$'` or `$$` in owner text is never a pattern,
 * and a `{title}` inside an owner-entered name is never expanded, because
 * inserted text is not scanned again. Unknown keys stay as written. Callers
 * pass values already escaped for the HTML part, raw (`plainLine`) otherwise.
 */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (Object.hasOwn(values, key) ? values[key]! : match));
}

const DIGEST_LABELS = {
  overdue: t.digestMail.overdue,
  today: t.digestMail.today,
  tomorrow: t.digestMail.tomorrow,
  upcoming: t.digestMail.upcoming,
} as const;

const CELL = "padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:13px";

function directionWord(direction: "IN" | "OUT"): string {
  return direction === "IN" ? t.digestMail.toUs : t.digestMail.fromUs;
}

function totalsLine(group: DigestMailGroup): string {
  return `${t.digestMail.total}: ${t.digestMail.toUs} ${formatSAR(group.totalInHalalas)} · ${t.digestMail.fromUs} ${formatSAR(group.totalOutHalalas)}`;
}

function digestGroupHtml(label: string, group: DigestMailGroup): string {
  const head = [t.digestMail.party, t.digestMail.plan, "", t.digestMail.remaining, t.digestMail.dueDate]
    .map((h) => `<th style="${CELL};font-weight:700">${h}</th>`)
    .join("");
  const body = group.rows
    .map((r) =>
      [escapeHtml(r.partyName), escapeHtml(r.planTitle), directionWord(r.direction), formatSAR(r.remainingHalalas), `<span dir="ltr">${r.dueDate}</span>`]
        .map((c) => `<td style="${CELL}">${c}</td>`)
        .join(""),
    )
    .map((cells) => `<tr>${cells}</tr>`)
    .join("\n");
  const more = group.moreCount > 0 ? `<p style="margin:4px 0 0;font-size:13px">${plural(t.digestMail.more, group.moreCount)}</p>` : "";
  return `<h2 style="margin:24px 0 8px;font-size:17px;color:${GREEN}">${label}</h2>
<table dir="rtl" style="width:100%;border-collapse:collapse"><tr>${head}</tr>
${body}
</table>${more}
<p style="margin:8px 0 0;font-size:14px;font-weight:700">${totalsLine(group)}</p>`;
}

function digestGroupText(label: string, group: DigestMailGroup): string[] {
  const lines = [label];
  for (const r of group.rows) {
    lines.push(`- ${plainLine(r.partyName)} — ${plainLine(r.planTitle)} — ${directionWord(r.direction)} ${formatSAR(r.remainingHalalas)} — ${r.dueDate}`);
  }
  if (group.moreCount > 0) lines.push(plural(t.digestMail.more, group.moreCount));
  lines.push(totalsLine(group), "");
  return lines;
}

/** The owner's daily digest (C6): only non-empty groups, in a fixed order. */
export function digestMail(to: string, input: DigestMailInput): MailMessage {
  const keys = (["overdue", "today", "tomorrow", "upcoming"] as const).filter((k) => input.groups[k].rows.length > 0);
  const link = appUrl("/owner/dues");
  const html = page(`<p style="margin:0 0 8px;font-size:16px">${fill(t.digestMail.intro, { establishment: escapeHtml(input.establishmentName) })}</p>
${keys.map((k) => digestGroupHtml(DIGEST_LABELS[k], input.groups[k])).join("\n")}
${link ? `<p style="margin:24px 0 0"><a href="${escapeHtml(link)}" style="color:${GREEN};font-weight:700">${t.digestMail.openDues}</a></p>` : ""}
<p style="margin:24px 0 0;font-size:12px;color:#525252">${t.digestMail.footer}</p>`);
  const text = [
    t.mail.senderName,
    "",
    fill(t.digestMail.intro, { establishment: plainLine(input.establishmentName) }),
    "",
    ...keys.flatMap((k) => digestGroupText(DIGEST_LABELS[k], input.groups[k])),
    ...(link ? [`${t.digestMail.openDues}: ${link}`, ""] : []),
    t.digestMail.footer,
  ].join("\n");
  const subject = fill(t.digestMail.subject, { establishment: plainLine(input.establishmentName) });
  return { to, subject, html, text };
}

/* --------------------------------------------------- v1.2c client reminder */

export type ClientReminderInput = {
  establishmentName: string;
  planTitle: string;
  remainingHalalas: number;
  dueDate: string;
};

/** The body, line by line, with every value passed through `wrap` first (C11, C12, E7). */
function reminderLines(input: ClientReminderInput, wrap: (value: string) => string): string[] {
  return t.clientReminder.body.split("\n").map((line) => {
    return fill(line, {
      establishment: wrap(input.establishmentName),
      amount: formatSAR(input.remainingHalalas),
      date: input.dueDate,
      title: wrap(input.planTitle),
    });
  });
}

/** The copy-ready WhatsApp text (C12): plain, owner text on one line each. */
export function clientReminderText(input: ClientReminderInput): string {
  return reminderLines(input, plainLine).join("\n");
}

/**
 * The email to the party (C11, E13). No reply-to — `sendMail` never sets one,
 * so the owner's login address is not exposed — and the footer says so.
 */
export function clientReminderMail(to: string, input: ClientReminderInput): MailMessage {
  const html = page(`${reminderLines(input, escapeHtml)
    .map((line) => `<p style="margin:0 0 12px;font-size:16px">${line}</p>`)
    .join("\n")}
<p style="margin:24px 0 0;font-size:12px;color:#525252">${fill(t.clientReminder.mailFooter, { establishment: escapeHtml(input.establishmentName) })}</p>`);
  const text = [
    clientReminderText(input),
    "",
    fill(t.clientReminder.mailFooter, { establishment: plainLine(input.establishmentName) }),
  ].join("\n");
  const subject = fill(t.clientReminder.subject, { establishment: plainLine(input.establishmentName) });
  return { to, subject, html, text };
}
