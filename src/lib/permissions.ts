/**
 * Pure permission predicates — no database, no session, no Next.js imports, so
 * they are directly unit-testable. src/lib/auth.ts wraps these with the DB read
 * and the redirect; every mutation must go through that wrapper.
 */

export type Role = "ADMIN" | "OWNER" | "STAFF";
export type UserStatus = "PENDING" | "ACTIVE" | "DISABLED";

/** The minimum shape the predicates need. Real Prisma users satisfy it. */
export type PermissionSubject = {
  role: Role;
  status: UserStatus;
  canEdit: boolean;
  establishmentId: string | null;
};

export function isActive(user: Pick<PermissionSubject, "status">): boolean {
  return user.status === "ACTIVE";
}

/** OWNER always; STAFF only while the owner leaves canEdit on. ADMIN never. */
export function canEditTransactions(user: PermissionSubject): boolean {
  if (!isActive(user)) return false;
  if (user.role === "OWNER") return true;
  if (user.role === "STAFF") return user.canEdit;
  return false;
}

/** Only OWNER deletes, and only inside their own establishment. */
export function canDeleteTransactions(user: PermissionSubject): boolean {
  return isActive(user) && user.role === "OWNER";
}

/** Any ACTIVE member of an establishment may add an entry. */
export function canCreateTransactions(user: PermissionSubject): boolean {
  return (
    isActive(user) &&
    (user.role === "OWNER" || user.role === "STAFF") &&
    user.establishmentId !== null
  );
}

/** Where a signed-in user belongs when they hit `/`. */
export function homePathFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "OWNER":
      return "/owner";
    case "STAFF":
      return "/staff";
  }
}
