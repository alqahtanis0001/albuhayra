"use server";

/**
 * Ending and reactivating an employment (docs/V12B-DESIGN.md D6, S3, S5, Y1).
 * OWNER only; the plan, when one is open, is revision-bumped first.
 */
import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { bumpRevision, ConcurrentChangeError } from "@/features/plans/allocate";
import type { SalaryTerms } from "@/features/payroll/core";
import { dateToISO, isoToDate, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { EndEmploymentSchema, invalid, type ActionResult } from "@/lib/validation";

import { fieldError, findOwnEmployee, idSchema, refusal, revalidateEmployees } from "./form";
import { applySalaryChange, endSalaryPlan, findOpenSalaryPlan, startSalaryPlan } from "./salaryPlan";
import type { EmployeeState } from "./actions";

/** D6: the end date may be past, today or future; it may not precede the hire date. */
export async function endEmployment(
  employeeId: string,
  _prev: EmployeeState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(employeeId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = EndEmploymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { endDate } = parsed.data;

  const existing = await findOwnEmployee(establishmentId, parsedId.data);
  if (!existing) return { ok: false, error: "err.notFound" };
  if (existing.status !== "ACTIVE") return { ok: false, error: "err.employeeEnded" };
  if (endDate < dateToISO(existing.startDate)) return fieldError("endDate", "err.endBeforeStart");

  const today = todayISO();
  const plan = await findOpenSalaryPlan(establishmentId, existing.id);
  try {
    await db.$transaction(async (tx) => {
      if (plan) await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      // S3/S5: compare-and-set; ENDED only once the date has passed.
      const { count } = await tx.employee.updateMany({
        where: { establishmentId, id: existing.id, status: "ACTIVE" },
        data: { endDate: isoToDate(endDate), status: endDate < today ? "ENDED" : "ACTIVE" },
      });
      if (count === 0) throw new ConcurrentChangeError();
      if (plan) await endSalaryPlan(tx, establishmentId, user.id, plan.id, endDate, today);
      await writeAudit({
        establishmentId, userId: user.id, action: "EMPLOYEE_END", entity: "Employee", entityId: existing.id,
        before: { status: "ACTIVE", endDate: existing.endDate ? dateToISO(existing.endDate) : null },
        after: { status: endDate < today ? "ENDED" : "ACTIVE", endDate }, client: tx,
      });
    });
  } catch (error) {
    const known = refusal(error);
    if (known) return known;
    throw error;
  }

  revalidateEmployees();
  return { ok: true, data: null };
}

/** The inverse of an end date (interpretation logged in D6/Y1): clears it; salary resumes from today. */
export async function reactivateEmployee(employeeId: string): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(employeeId);
  if (!parsedId.success) return invalid(parsedId.error);

  const existing = await findOwnEmployee(establishmentId, parsedId.data);
  if (!existing) return { ok: false, error: "err.notFound" };
  if (existing.status === "ACTIVE" && existing.endDate === null) return { ok: false, error: "err.invalidInput" };

  const today = todayISO();
  const plan = await findOpenSalaryPlan(establishmentId, existing.id);
  const hireDate = dateToISO(existing.startDate);
  const terms: SalaryTerms | null =
    existing.basicSalaryHalalas !== null && existing.payDay !== null
      ? {
          employeeId: existing.id, basicSalaryHalalas: existing.basicSalaryHalalas, payDay: existing.payDay, endDate: null,
          allowances: await db.employeeAllowance.findMany({
            where: { establishmentId, employeeId: existing.id },
            select: { type: true, label: true, amountHalalas: true },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          }),
        }
      : null;
  try {
    await db.$transaction(async (tx) => {
      if (plan) await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      const { count } = await tx.employee.updateMany({
        where: { establishmentId, id: existing.id, status: existing.status },
        data: { status: "ACTIVE", endDate: null },
      });
      if (count === 0) throw new ConcurrentChangeError();
      await writeAudit({
        establishmentId, userId: user.id, action: "EMPLOYEE_REACTIVATE", entity: "Employee", entityId: existing.id,
        before: { status: existing.status, endDate: existing.endDate ? dateToISO(existing.endDate) : null },
        after: { status: "ACTIVE", endDate: null }, client: tx,
      });
      if (!terms) return;
      if (plan) await applySalaryChange(tx, establishmentId, user.id, plan, { hadSalary: true, hireDate, terms }, today);
      else {
        const who = { id: existing.id, partyId: existing.partyId, hireDate, name: existing.party.name };
        await startSalaryPlan(tx, establishmentId, user.id, who, terms, today);
      }
    });
  } catch (error) {
    const known = refusal(error);
    if (known) return known;
    throw error;
  }

  revalidateEmployees();
  return { ok: true, data: null };
}
