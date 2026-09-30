import "server-only";

import { db } from "@/lib/db";

/**
 * Settings › التذكيرات (docs/V12C-DESIGN.md C1). `establishmentId` always
 * comes from requireOwner(), never from the client. The mutation is in
 * `actions.ts`: a `"use server"` module turns every exported async function
 * into a callable action, and this read takes an establishment id.
 */

export type DigestSettings = {
  digestEnabled: boolean;
  /** 0–23, Asia/Riyadh. */
  digestHour: number;
  /** The recipient: the owner's login email (shown read-only); null when the digest has none (N9). */
  ownerEmail: string | null;
  /**
   * Whether the server can send the digest at all: `CRON_SECRET`, `BREVO_API_KEY`
   * and `MAIL_FROM` all set (trimmed, non-empty). A boolean, never a value.
   */
  schedulerConfigured: boolean;
};

/**
 * Who receives the digest (N9): an ACTIVE, verified OWNER of the establishment
 * — and only when there is exactly one. `select.ts` sends by this rule and the
 * settings page shows the recipient by it, so the two cannot disagree.
 */
export const DIGEST_OWNER_WHERE = {
  role: "OWNER",
  status: "ACTIVE",
  emailVerifiedAt: { not: null },
} as const;

function isSet(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

/** Mirrors the route's rule (E5): trimmed, empty means unset. */
export function cronSecret(): string | null {
  const value = process.env.CRON_SECRET?.trim();
  return value ? value : null;
}

export async function getDigestSettings(establishmentId: string): Promise<DigestSettings> {
  const [establishment, owners] = await Promise.all([
    db.establishment.findFirst({
      where: { id: establishmentId },
      select: { digestEnabled: true, digestHour: true },
    }),
    db.user.findMany({
      where: { establishmentId, ...DIGEST_OWNER_WHERE },
      select: { email: true },
      take: 2,
    }),
  ]);
  return {
    digestEnabled: establishment?.digestEnabled ?? false,
    digestHour: establishment?.digestHour ?? 7,
    // Null when the digest would be skipped: no eligible owner, or more than one.
    ownerEmail: owners.length === 1 ? owners[0]!.email : null,
    // Without mail every digest is recorded FAILED, so the page must say so too.
    schedulerConfigured: cronSecret() !== null && isSet("BREVO_API_KEY") && isSet("MAIL_FROM"),
  };
}
