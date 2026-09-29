import "server-only";
import type { Prisma } from "@/generated/prisma";

import { db } from "./db";

/** The closed set of audit actions from docs/BACKEND.md. */
export type AuditAction =
  | "LOGIN"
  | "SIGNUP"
  | "APPROVE_OWNER"
  | "REJECT_OWNER"
  | "APPROVE_STAFF"
  | "REJECT_STAFF"
  | "SET_CAN_EDIT"
  | "DISABLE_USER"
  | "ENABLE_USER"
  | "RESET_PASSWORD"
  | "REGENERATE_JOIN_CODE"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOCK"
  | "UNLOCK"
  | "CATEGORY_CREATE"
  | "CATEGORY_UPDATE"
  | "DISABLE_ESTABLISHMENT"
  | "ENABLE_ESTABLISHMENT";

export type AuditEntity =
  | "Transaction"
  | "PeriodLock"
  | "User"
  | "Category"
  | "Establishment";

/**
 * Never pass a password hash or a session into `before`/`after`.
 * `establishmentId` is null only for ADMIN actions.
 */
export async function writeAudit(args: {
  establishmentId: string | null;
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  client?: Prisma.TransactionClient;
}): Promise<void> {
  const { client, ...data } = args;
  await (client ?? db).auditLog.create({ data });
}
