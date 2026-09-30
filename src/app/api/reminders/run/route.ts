import { createHash, timingSafeEqual } from "node:crypto";

import { cronSecret } from "@/features/reminders/settings";
import { runDigests } from "@/features/reminders/run";

/**
 * The daily owner digest trigger (docs/V12C-DESIGN.md C2, C3, E5). Open in the
 * proxy (no session); this secret check is the gate. `CRON_SECRET` unset or
 * blank → 503 and nothing runs. The secret travels only as exactly
 * `Authorization: Bearer <secret>` — never a query parameter, which ends up in
 * logs — and is compared as two sha256 digests, so the comparison is constant
 * time whatever the lengths. Missing and wrong get the same 401. No header is
 * ever logged. The body is counts only.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function authorised(header: string | null, secret: string): boolean {
  const prefix = "Bearer ";
  const token = header !== null && header.startsWith(prefix) ? header.slice(prefix.length) : "";
  // Always compare, even for a missing header, so both refusals take one path.
  // An empty token can never match: the secret is never empty past the 503.
  return timingSafeEqual(digest(token), digest(secret));
}

export async function GET(request: Request): Promise<Response> {
  const secret = cronSecret();
  if (secret === null) return new Response(null, { status: 503, headers: NO_STORE });
  if (!authorised(request.headers.get("authorization"), secret)) {
    return new Response(null, { status: 401, headers: NO_STORE });
  }
  try {
    const { sent, skipped } = await runDigests(new Date());
    return Response.json({ ok: true, sent, skipped }, { headers: NO_STORE });
  } catch (error) {
    console.error(`[digest] run failed: ${error instanceof Error ? error.name : "unknown"}`);
    return new Response(null, { status: 500, headers: NO_STORE });
  }
}
