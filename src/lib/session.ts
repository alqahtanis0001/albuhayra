import "server-only";
import { hkdfSync } from "node:crypto";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";

import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./sessionConfig";

/**
 * The cookie carries identity only. `status` and `canEdit` are deliberately
 * absent: they are re-read from the database on every request that needs them
 * (docs/BACKEND.md, Security rule 2), so an owner's change takes effect at once.
 */
export type SessionData = {
  userId?: string;
  role?: "ADMIN" | "OWNER" | "STAFF";
  establishmentId?: string | null;
};

// Re-exported so existing importers of this module keep working; the values
// themselves live in sessionConfig.ts, which the proxy can also import.
export { SESSION_COOKIE, SESSION_TTL_SECONDS };

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return {
    password,
    cookieName: SESSION_COOKIE,
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

export async function startSession(data: Required<SessionData>): Promise<void> {
  const session = await getSession();
  session.userId = data.userId;
  session.role = data.role;
  session.establishmentId = data.establishmentId;
  await session.save();
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/* ------------------------------------------------------------- flow cookie */

/**
 * v1.1e: a second sealed cookie that identifies a verification or reset flow in
 * progress. It never grants access to data — requireUser() does not read it.
 *
 * Its payload is disjoint from SessionData (no top-level `userId`, `role` or
 * `establishmentId`), and it is sealed with a password *derived* from the
 * session secret rather than the secret itself, so a flow cookie pasted into
 * the session cookie fails to unseal, and would carry no userId if it did.
 *
 * `verify.userId` is the flow id: the new user's id on a real sign-up, a random
 * id matching no user on a sign-up with a registered address (A1, A6).
 */
export type FlowData = {
  /** `startedAt` (ms) dates the flow's first code for the resend countdown. */
  verify?: { userId: string; email: string; startedAt: number };
  reset?: { email: string };
};

export const FLOW_COOKIE = "zk_flow";
export const FLOW_TTL_SECONDS = 30 * 60;

function flowOptions(): SessionOptions {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  const password = Buffer.from(
    hkdfSync("sha256", secret, "", "zakham:flow-cookie:v1", 32),
  ).toString("hex");
  return {
    password,
    cookieName: FLOW_COOKIE,
    ttl: FLOW_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: FLOW_TTL_SECONDS,
    },
  };
}

export async function getFlow(): Promise<IronSession<FlowData>> {
  return getIronSession<FlowData>(await cookies(), flowOptions());
}

/** Replaces whatever flow was in progress. Only from an action. */
export async function startFlow(data: FlowData): Promise<void> {
  const flow = await getFlow();
  flow.verify = data.verify;
  flow.reset = data.reset;
  await flow.save();
}

/** Only from an action or route handler; a render cannot write cookies. */
export async function clearFlow(): Promise<void> {
  const flow = await getFlow();
  flow.destroy();
}
