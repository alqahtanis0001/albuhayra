"use server";

/**
 * Client reminders (docs/V12C-DESIGN.md C9–C12, E8, E9, E13). Every send is
 * a button the OWNER presses — nothing here is ever called by the digest run
 * or any schedule — and every one is audited. `requireOwner()` first, so a
 * STAFF session (canEdit or not) is refused before anything is read.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail/send";
import { clientReminderMail, clientReminderText } from "@/lib/mail/templates";
import { clearAttempts, consumeLimit, LIMITS } from "@/lib/rateLimit";
import { invalid, type ActionResult } from "@/lib/validation";
import { cuid } from "@/lib/validation/primitives";

import { CLIENT_EMAILS_PER_DAY, emailedToday, emailsToday, reminderTarget, riyadhDayStart } from "./clientRules";

const OptInSchema = z.object({ partyId: cuid, on: z.boolean({ error: "err.invalidInput" }) });

/** C9: the owner's explicit opt-in per party. */
export async function setPartyRemindersOptIn(partyId: string, on: boolean): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsed = OptInSchema.safeParse({ partyId, on });
  if (!parsed.success) return invalid(parsed.error);

  const party = await db.party.findFirst({
    where: { establishmentId, id: parsed.data.partyId },
    select: { id: true, remindersOptIn: true },
  });
  if (!party) return { ok: false, error: "err.notFound" };

  const written = await db.$transaction(async (tx) => {
    const { count } = await tx.party.updateMany({
      where: { establishmentId, id: party.id },
      data: { remindersOptIn: parsed.data.on },
    });
    if (count === 0) return false;
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "PARTY_REMINDERS",
      entity: "Party",
      entityId: party.id,
      before: { remindersOptIn: party.remindersOptIn },
      after: { remindersOptIn: parsed.data.on },
      client: tx,
    });
    return true;
  });
  if (!written) return { ok: false, error: "err.notFound" };

  revalidatePath("/owner", "layout");
  return { ok: true, data: null };
}

/**
 * C11 + E8: at most one email per instalment per Riyadh day (the audit log,
 * durable), at most CLIENT_EMAILS_PER_DAY per establishment, the in-memory
 * `remind:` key against a double click, the recipient's `mailto:` cap. The
 * send is awaited (E9) and audited only when Brevo accepted it.
 */
export async function sendClientReminder(instalmentId: string): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsed = cuid.safeParse(instalmentId);
  if (!parsed.success) return invalid(parsed.error);

  const target = await reminderTarget(establishmentId, parsed.data);
  if (!target.ok) return target;
  const { partyEmail, ...reminder } = target.data;
  if (!partyEmail) return { ok: false, error: "err.partyNoEmail" };

  const since = riyadhDayStart(new Date());
  if (await emailedToday(establishmentId, reminder.instalmentId, since)) return { ok: false, error: "err.reminderTooSoon" };
  if ((await emailsToday(establishmentId, since)) >= CLIENT_EMAILS_PER_DAY) {
    return { ok: false, error: "err.clientReminderDailyCap" };
  }

  const key = `remind:${reminder.instalmentId}`;
  if (!consumeLimit(key, LIMITS.remindInstalment)) return { ok: false, error: "err.reminderTooSoon" };
  const message = clientReminderMail(partyEmail, {
    establishmentName: user.establishmentName ?? "",
    planTitle: reminder.planTitle,
    remainingHalalas: reminder.remainingHalalas,
    dueDate: reminder.dueDate,
  });
  const sent = consumeLimit(`mailto:${partyEmail}`, LIMITS.mailTo) && (await sendMail(message));
  if (!sent) {
    clearAttempts(key);
    return { ok: false, error: "err.mailFailed" };
  }

  await writeAudit({
    establishmentId,
    userId: user.id,
    action: "CLIENT_REMINDER_EMAIL",
    entity: "Instalment",
    entityId: reminder.instalmentId,
    after: { planId: reminder.planId, partyId: reminder.partyId, remainingHalalas: reminder.remainingHalalas, dueDate: reminder.dueDate },
  });
  return { ok: true, data: null };
}

/** C12: the copy-ready text — no wa.me link, no phone handling — audited. */
export async function prepareWhatsAppReminder(instalmentId: string): Promise<ActionResult<{ text: string }>> {
  const { user, establishmentId } = await requireOwner();
  const parsed = cuid.safeParse(instalmentId);
  if (!parsed.success) return invalid(parsed.error);

  const target = await reminderTarget(establishmentId, parsed.data);
  if (!target.ok) return target;
  const reminder = target.data;

  const text = clientReminderText({
    establishmentName: user.establishmentName ?? "",
    planTitle: reminder.planTitle,
    remainingHalalas: reminder.remainingHalalas,
    dueDate: reminder.dueDate,
  });
  await writeAudit({
    establishmentId,
    userId: user.id,
    action: "CLIENT_REMINDER_WHATSAPP",
    entity: "Instalment",
    entityId: reminder.instalmentId,
    after: { planId: reminder.planId, partyId: reminder.partyId, remainingHalalas: reminder.remainingHalalas, dueDate: reminder.dueDate },
  });
  return { ok: true, data: { text } };
}
