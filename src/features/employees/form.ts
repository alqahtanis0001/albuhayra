import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { DeductionExceedsGrossError, type SalaryTerms } from "@/features/payroll/core";
import { ConcurrentChangeError } from "@/features/plans/allocate";
import { db } from "@/lib/db";
import { EmployeeInputSchema, invalid, type ActionResult, type EmployeeInput } from "@/lib/validation";

/**
 * Input and reference checks shared by the employee actions (spec §3.1, D14,
 * Y9). Every lookup is scoped: another establishment's party or login id
 * answers exactly like a missing one (rule 11).
 */

export const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

export function revalidateEmployees(): void {
  revalidatePath("/owner", "layout");
  revalidatePath("/staff", "layout");
}

export function fieldError(field: string, key: string) {
  return { ok: false as const, error: key, fieldErrors: { [field]: key } };
}

/** The form posts `allowances` as one JSON string field; unparsable → err.allowancesInvalid. */
export function parseEmployeeForm(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, unknown>;
  let allowances: unknown = [];
  if (raw.allowances !== undefined && raw.allowances !== "") {
    try {
      allowances = JSON.parse(String(raw.allowances));
    } catch {
      return { error: fieldError("allowances", "err.allowancesInvalid") };
    }
  }
  const parsed = EmployeeInputSchema.safeParse({ ...raw, allowances });
  return parsed.success ? { input: parsed.data } : { error: invalid(parsed.error) };
}

/** The inherited party rule (N11): no other *active* party carries this name. */
export async function nameTaken(establishmentId: string, name: string, exceptPartyId?: string): Promise<boolean> {
  const clash = await db.party.findFirst({
    where: {
      establishmentId,
      active: true,
      name: { equals: name, mode: "insensitive" },
      ...(exceptPartyId ? { id: { not: exceptPartyId } } : {}),
    },
    select: { id: true },
  });
  return clash !== null;
}

/**
 * D14: adopt an existing active موظف party that no employee holds yet.
 * Anything else — foreign, missing, another type, inactive, taken — is
 * `err.partyInvalid`.
 */
export async function checkAdoptableParty(establishmentId: string, partyId: string): Promise<boolean> {
  const [party, holder] = await Promise.all([
    db.party.findFirst({ where: { establishmentId, id: partyId, type: "EMPLOYEE", active: true }, select: { id: true } }),
    db.employee.findFirst({ where: { establishmentId, partyId }, select: { id: true } }),
  ]);
  return party !== null && holder === null;
}

/**
 * Spec §3.1: the optional login is an ACTIVE STAFF of this establishment that
 * no other employee holds. Returns the refusal key, or null when acceptable.
 */
export async function checkLogin(
  establishmentId: string,
  userId: string,
  employeeId: string | null,
): Promise<string | null> {
  const [user, holder] = await Promise.all([
    db.user.findFirst({
      where: { establishmentId, id: userId, role: "STAFF", status: "ACTIVE" },
      select: { id: true },
    }),
    db.employee.findFirst({ where: { establishmentId, userId }, select: { id: true } }),
  ]);
  if (!user) return "err.loginInvalid";
  if (holder && holder.id !== employeeId) return "err.loginAlreadyLinked";
  return null;
}

/** The Employee columns an input sets (clearing an optional field writes null). */
export function employeeColumns(input: EmployeeInput) {
  return {
    jobTitle: input.jobTitle ?? null,
    notes: input.notes ?? null,
    workDays: input.workDays,
    workStart: input.workStart ?? null,
    workEnd: input.workEnd ?? null,
    graceMinutes: input.graceMinutes ?? null,
    basicSalaryHalalas: input.basicSalaryHalalas ?? null,
    payDay: input.basicSalaryHalalas === undefined ? null : (input.payDay ?? null),
    userId: input.userId ?? null,
  };
}

export function partyColumns(input: EmployeeInput) {
  return { name: input.name, phone: input.phone ?? null, email: input.email ?? null };
}

export function allowanceRows(establishmentId: string, employeeId: string, input: EmployeeInput) {
  return input.allowances.map((a) => ({
    establishmentId,
    employeeId,
    type: a.type,
    label: a.label ?? null,
    amountHalalas: a.amountHalalas,
  }));
}

export function snapshotOf(input: EmployeeInput) {
  return { ...partyColumns(input), ...employeeColumns(input), startDate: input.startDate, allowances: input.allowances };
}

export function termsOf(input: EmployeeInput, employeeId: string, endDate: string | null): SalaryTerms | null {
  if (input.basicSalaryHalalas === undefined || input.payDay === undefined) return null;
  return {
    employeeId,
    basicSalaryHalalas: input.basicSalaryHalalas,
    payDay: input.payDay,
    endDate,
    allowances: input.allowances.map((a) => ({ type: a.type, label: a.label ?? null, amountHalalas: a.amountHalalas })),
  };
}

/** Known failures → their key; anything else propagates. */
export function refusal(error: unknown): ActionResult<never> | null {
  if (error instanceof ConcurrentChangeError) return { ok: false, error: "err.concurrentChange" };
  if (error instanceof DeductionExceedsGrossError) return fieldError("basicSalaryHalalas", "err.deductionExceedsGross");
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    // A race on a unique column: the login, the adopted party, or a salary month.
    const detail = JSON.stringify(error.meta ?? {});
    if (detail.includes("userId")) return fieldError("userId", "err.loginAlreadyLinked");
    if (detail.includes("partyId")) return fieldError("partyId", "err.partyInvalid");
    return { ok: false, error: "err.concurrentChange" };
  }
  return null;
}

const EXISTING_SELECT = {
  id: true, partyId: true, status: true, startDate: true, endDate: true, userId: true, jobTitle: true, notes: true,
  workDays: true, workStart: true, workEnd: true, graceMinutes: true, basicSalaryHalalas: true, payDay: true,
  party: { select: { name: true, phone: true, email: true, active: true } },
} as const;

export function findOwnEmployee(establishmentId: string, id: string) {
  return db.employee.findFirst({ where: { establishmentId, id }, select: EXISTING_SELECT });
}
