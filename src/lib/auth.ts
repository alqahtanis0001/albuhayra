import "server-only";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { db } from "./db";
import { displayName, NAME_SELECT } from "./names";
import { getSession } from "./session";
import {
  canEditTransactions,
  homePathFor,
  isActive,
  type PermissionSubject,
  type Role,
} from "./permissions";

export const BCRYPT_COST = 12;

/**
 * Appended when a stale session is turned away. The proxy cannot see `status`,
 * only the cookie, so without this marker it would send the request straight
 * back to the area requireUser() just refused — a redirect loop.
 */
export const SIGNED_OUT_LOGIN_PATH = "/login?signedOut=1";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type AuthedUser = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  /** First + last — what the top bar and "entered by" show (src/lib/names.ts). */
  displayName: string;
  email: string;
  role: Role;
  status: "PENDING" | "ACTIVE" | "DISABLED";
  canEdit: boolean;
  establishmentId: string | null;
  establishmentName: string | null;
};

export type AuthContext = {
  user: AuthedUser;
  /** Never null for OWNER/STAFF; null only for ADMIN. */
  establishmentId: string | null;
};

/**
 * Dropping the cookie is a courtesy, not the protection: cookies can only be
 * written from a Server Action or a Route Handler, so calling destroy() during a
 * server component render throws. The redirect below is what actually closes the
 * route, and every later request re-runs this whole check.
 */
function forget(session: { destroy: () => void }): void {
  try {
    session.destroy();
  } catch {
    // Read-only cookie store. Nothing to clear here.
  }
}

/**
 * The gate every server action and every data-reading server component starts
 * with. Reads status, canEdit and the establishment's active flag straight from
 * the database — the cookie is only trusted for the user id.
 */
export async function requireUser(): Promise<AuthContext> {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const row = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      ...NAME_SELECT,
      email: true,
      emailVerifiedAt: true,
      role: true,
      status: true,
      canEdit: true,
      establishmentId: true,
      establishment: { select: { name: true, active: true } },
    },
  });

  if (!row) {
    forget(session);
    redirect(SIGNED_OUT_LOGIN_PATH);
  }
  // v1.1e: an unverified address never gets past here. Such an account is never
  // issued a session in the first place; this is the backstop. It goes to the
  // signed-out login, not /verify: a render cannot clear the cookie, so /verify
  // would bounce through the proxy forever, while /login re-enters the flow.
  if (row.emailVerifiedAt === null) {
    forget(session);
    redirect(SIGNED_OUT_LOGIN_PATH);
  }
  if (row.status === "PENDING") redirect("/pending");
  if (!isActive(row)) {
    forget(session);
    redirect(SIGNED_OUT_LOGIN_PATH);
  }
  // A disabled establishment locks out its owner and all of its staff.
  if (row.role !== "ADMIN" && row.establishment?.active !== true) {
    forget(session);
    redirect(SIGNED_OUT_LOGIN_PATH);
  }

  const user: AuthedUser = {
    id: row.id,
    firstName: row.firstName,
    middleName: row.middleName,
    lastName: row.lastName,
    displayName: displayName(row),
    email: row.email,
    role: row.role,
    status: row.status,
    canEdit: row.canEdit,
    establishmentId: row.establishmentId,
    establishmentName: row.establishment?.name ?? null,
  };

  return { user, establishmentId: row.establishmentId };
}

/**
 * The role gates below send a signed-in user with the wrong role to their own
 * area rather than to /login: a STAFF who follows an /owner/… link needs /staff,
 * not a login form for the account they are already using.
 */

/** Same as requireUser but guarantees a non-null establishmentId. */
export async function requireMember(): Promise<{
  user: AuthedUser;
  establishmentId: string;
}> {
  const { user, establishmentId } = await requireUser();
  if (user.role === "ADMIN" || !establishmentId) redirect(homePathFor(user.role));
  return { user, establishmentId };
}

export async function requireOwner(): Promise<{
  user: AuthedUser;
  establishmentId: string;
}> {
  const { user, establishmentId } = await requireUser();
  if (user.role !== "OWNER" || !establishmentId) redirect(homePathFor(user.role));
  return { user, establishmentId };
}

export async function requireStaff(): Promise<{
  user: AuthedUser;
  establishmentId: string;
}> {
  const { user, establishmentId } = await requireUser();
  if (user.role !== "STAFF" || !establishmentId) redirect(homePathFor(user.role));
  return { user, establishmentId };
}

export async function requireAdmin(): Promise<{ user: AuthedUser }> {
  const { user } = await requireUser();
  if (user.role !== "ADMIN") redirect(homePathFor(user.role));
  return { user };
}

/** OWNER, or STAFF whose owner has switched `canEdit` on right now. */
export async function requireCanEdit(): Promise<{
  user: AuthedUser;
  establishmentId: string;
}> {
  const { user, establishmentId } = await requireUser();
  const subject: PermissionSubject = {
    role: user.role,
    status: user.status,
    canEdit: user.canEdit,
    establishmentId,
  };
  if (!canEditTransactions(subject) || !establishmentId) {
    redirect(homePathFor(user.role));
  }
  return { user, establishmentId };
}
