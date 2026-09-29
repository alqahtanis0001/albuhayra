import "server-only";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { db } from "./db";
import { getSession } from "./session";
import {
  canEditTransactions,
  isActive,
  type PermissionSubject,
  type Role,
} from "./permissions";

export const BCRYPT_COST = 12;

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
  name: string;
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
      name: true,
      email: true,
      role: true,
      status: true,
      canEdit: true,
      establishmentId: true,
      establishment: { select: { name: true, active: true } },
    },
  });

  if (!row) {
    session.destroy();
    redirect("/login");
  }
  if (row.status === "PENDING") redirect("/pending");
  if (!isActive(row)) {
    session.destroy();
    redirect("/login");
  }
  // A disabled establishment locks out its owner and all of its staff.
  if (row.role !== "ADMIN" && row.establishment?.active !== true) {
    session.destroy();
    redirect("/login");
  }

  const user: AuthedUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    canEdit: row.canEdit,
    establishmentId: row.establishmentId,
    establishmentName: row.establishment?.name ?? null,
  };

  return { user, establishmentId: row.establishmentId };
}

/** Same as requireUser but guarantees a non-null establishmentId. */
export async function requireMember(): Promise<{
  user: AuthedUser;
  establishmentId: string;
}> {
  const { user, establishmentId } = await requireUser();
  if (user.role === "ADMIN" || !establishmentId) redirect("/admin");
  return { user, establishmentId };
}

export async function requireOwner(): Promise<{
  user: AuthedUser;
  establishmentId: string;
}> {
  const { user, establishmentId } = await requireUser();
  if (user.role !== "OWNER" || !establishmentId) redirect("/login");
  return { user, establishmentId };
}

export async function requireStaff(): Promise<{
  user: AuthedUser;
  establishmentId: string;
}> {
  const { user, establishmentId } = await requireUser();
  if (user.role !== "STAFF" || !establishmentId) redirect("/login");
  return { user, establishmentId };
}

export async function requireAdmin(): Promise<{ user: AuthedUser }> {
  const { user } = await requireUser();
  if (user.role !== "ADMIN") redirect("/login");
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
  if (!canEditTransactions(subject) || !establishmentId) redirect("/login");
  return { user, establishmentId };
}
