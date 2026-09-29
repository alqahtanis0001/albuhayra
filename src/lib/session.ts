import "server-only";
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
