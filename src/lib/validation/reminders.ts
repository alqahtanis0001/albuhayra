/**
 * v1.2c — reminders settings and the report party filter.
 * Contract: docs/V12C-DESIGN.md (authority: docs/V12-SPEC.md §4). Pure, client-safe.
 */
import { z } from "zod";

import { optionalCuid } from "./primitives";

export const DigestSettingsSchema = z.object({
  /** A checkbox: present ("on"/"true") = enabled. */
  digestEnabled: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
  digestHour: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : typeof v === "string" ? Number(v) : v),
    z.number({ error: "err.invalidInput" }).int("err.invalidInput").min(0, "err.invalidInput").max(23, "err.invalidInput"),
  ),
});
export type DigestSettingsInput = z.infer<typeof DigestSettingsSchema>;

/** «بحسب الجهة» (C16): optional; "" = all parties. */
export const ReportPartyFilterSchema = z.object({ partyId: optionalCuid });
