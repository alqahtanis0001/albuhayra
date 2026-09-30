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
  | "ENABLE_ESTABLISHMENT"
  // v1.1e
  | "EMAIL_VERIFIED"
  | "PASSWORD_RESET_SELF"
  // v1.2a (docs/BACKEND.md → v1.2a → Audit)
  | "PARTY_CREATE"
  | "PARTY_UPDATE"
  | "PARTY_ACTIVE"
  | "PARTY_DELETE"
  | "PROJECT_CREATE"
  | "PROJECT_UPDATE"
  | "PROJECT_STATUS"
  | "PROJECT_DELETE"
  | "PLAN_CREATE"
  | "PLAN_UPDATE"
  | "PLAN_CANCEL"
  | "PLAN_ARCHIVE"
  | "PLAN_ALLOCATE"
  // v1.2b (docs/V12B-DESIGN.md)
  | "EMPLOYEE_CREATE"
  | "EMPLOYEE_UPDATE"
  | "EMPLOYEE_END"
  | "EMPLOYEE_REACTIVATE"
  | "SALARY_GENERATE"
  | "SALARY_UPDATE"
  | "DEDUCTION_ADD"
  | "DEDUCTION_DELETE"
  | "ATTENDANCE_SET"
  | "CHECK_IN"
  | "CHECK_OUT";

export type AuditEntity =
  | "Transaction"
  | "PeriodLock"
  | "User"
  | "Category"
  | "Establishment"
  // v1.2a
  | "Party"
  | "Project"
  | "Plan"
  // v1.2b
  | "Employee"
  | "SalaryPeriod"
  | "AttendanceRecord";

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
