import "server-only";

import { Prisma } from "@/generated/prisma";
import { runSalaryGeneration } from "@/features/payroll/generate";
import { writeAudit } from "@/lib/audit";
import { isoToDate, nowRiyadhHHMM, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail/send";
import { digestMail } from "@/lib/mail/templates";
import { consumeLimit, LIMITS } from "@/lib/rateLimit";

import { buildDigest } from "./digest";
import { selectDigestTargets, type DigestTarget } from "./select";

/**
 * The daily owner digest run (docs/V12C-DESIGN.md C4, C5, C8, E2–E4, E9,
 * E12, N5, N9). Called by `GET /api/reminders/run` only — `server-only`,
 * never `"use server"`. One `now` decides both the Riyadh date and hour.
 *
 * Per establishment, in order: salary months (E4) → claim the day as PENDING
 * (the unique index makes it at-most-once; P2002 = another run has it) →
 * build → EMPTY (no mail) or caps → send (awaited, E9) → SENT / FAILED, with
 * a `DIGEST_SENT` audit for every recorded outcome (E12). A PENDING left by a
 * crash means "outcome unknown" and is never retried that day.
 */

type Outcome = "SENT" | "EMPTY" | "FAILED";
export type RunResult = { sent: number; skipped: number };

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** The claim: `null` when another run already holds today. */
async function claim(establishmentId: string, today: string): Promise<string | null> {
  try {
    const row = await db.reminderDigest.create({
      data: { establishmentId, date: isoToDate(today), status: "PENDING" },
      select: { id: true },
    });
    return row.id;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

async function record(target: DigestTarget, id: string, today: string, status: Outcome, itemCount: number) {
  const { establishmentId } = target;
  await db.$transaction(async (tx) => {
    await tx.reminderDigest.updateMany({
      where: { establishmentId, id },
      data: { status, itemCount },
    });
    await writeAudit({
      establishmentId,
      userId: target.ownerId,
      action: "DIGEST_SENT",
      entity: "ReminderDigest",
      entityId: id,
      after: { date: today, status, itemCount },
      client: tx,
    });
  });
}

/** Build and send; never throws — any failure is FAILED. */
async function deliverDigest(target: DigestTarget, today: string): Promise<{ status: Outcome; itemCount: number }> {
  let itemCount = 0;
  try {
    const digest = await buildDigest(target.establishmentId, today);
    itemCount = digest.itemCount;
    if (itemCount === 0) return { status: "EMPTY", itemCount };
    // E3: the global digest cap, then the recipient's hourly cap shared with auth mail.
    if (!consumeLimit("digest:day", LIMITS.digestDay) || !consumeLimit(`mailto:${target.ownerEmail}`, LIMITS.mailTo)) {
      console.error("[digest] capped");
      return { status: "FAILED", itemCount };
    }
    const message = digestMail(target.ownerEmail, { establishmentName: target.name, groups: digest.groups });
    return { status: (await sendMail(message)) ? "SENT" : "FAILED", itemCount };
  } catch (error) {
    console.error(`[digest] build or send failed: ${error instanceof Error ? error.name : "unknown"}`);
    return { status: "FAILED", itemCount };
  }
}

async function runOne(target: DigestTarget, today: string): Promise<Outcome | null> {
  await runSalaryGeneration(target.establishmentId, target.ownerId, today, undefined, { auto: true });
  const id = await claim(target.establishmentId, today);
  if (id === null) return null;
  const { status, itemCount } = await deliverDigest(target, today);
  await record(target, id, today, status, itemCount);
  return status;
}

export async function runDigests(now: Date): Promise<RunResult> {
  const today = todayISO(now);
  const hour = Number(nowRiyadhHHMM(now).slice(0, 2));
  const targets = await selectDigestTargets(today, hour);
  let sent = 0;
  let skipped = 0;
  // Sequential, and one establishment's failure never stops the rest (C8).
  for (const target of targets) {
    try {
      if ((await runOne(target, today)) === "SENT") sent += 1;
      else skipped += 1;
    } catch (error) {
      skipped += 1;
      console.error(`[digest] establishment failed: ${error instanceof Error ? error.name : "unknown"}`);
    }
  }
  return { sent, skipped };
}
