import "server-only";

import { resendWaitSeconds } from "@/lib/codes";
import { getFlow } from "@/lib/session";

/**
 * What `/verify` shows: the address the code went to (from the sealed flow
 * cookie, set by our own action) and the resend countdown. Null when there is
 * no flow — the page then shows `err.verifySessionExpired`.
 *
 * No requireX(): the person on `/verify` has no session by design. The flow
 * cookie grants nothing; it only says which flow this browser is in.
 *
 * Right after a sign-up the code may not exist yet — it is created in
 * `after()` — so with no code the countdown runs from when the flow started.
 * Real and fake flows go through the same function and show the same number.
 */
export async function getVerifyFlow(): Promise<{ email: string; resendInSeconds: number } | null> {
  const flow = (await getFlow()).verify;
  if (!flow) return null;
  const wait = await resendWaitSeconds(
    { userId: flow.userId, purpose: "VERIFY" },
    flow.startedAt,
  );
  return { email: flow.email, resendInSeconds: wait };
}
