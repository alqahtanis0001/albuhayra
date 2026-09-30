"use server";

/**
 * الموظفون — mutations (docs/V12-SPEC.md §3.1–3.2; docs/V12B-DESIGN.md D1,
 * D5, D6, D14, Y1, Y9). OWNER only. Every write is scoped in the SQL; a plan
 * that already exists is revision-bumped first inside the transaction.
 */
import { bumpRevision, ConcurrentChangeError } from "@/features/plans/allocate";
import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { dateToISO, isoToDate, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { invalid, type ActionResult } from "@/lib/validation";

import {
  allowanceRows, checkAdoptableParty, checkLogin, employeeColumns, fieldError, findOwnEmployee,
  idSchema, nameTaken, parseEmployeeForm, partyColumns, refusal, revalidateEmployees, snapshotOf, termsOf,
} from "./form";
import { applySalaryChange, findOpenSalaryPlan, startSalaryPlan } from "./salaryPlan";

/** Ending and reactivating live in `./lifecycle.ts`. */
export type EmployeeState = ActionResult<{ id: string }> | ActionResult<null> | null;

export async function createEmployee(_prev: EmployeeState, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { user, establishmentId } = await requireOwner();
  const parsed = parseEmployeeForm(formData);
  if (parsed.error) return parsed.error;
  const input = parsed.input;

  if (input.partyId && !(await checkAdoptableParty(establishmentId, input.partyId))) {
    return fieldError("partyId", "err.partyInvalid");
  }
  if (await nameTaken(establishmentId, input.name, input.partyId)) return fieldError("name", "err.partyDuplicate");
  if (input.userId) {
    const bad = await checkLogin(establishmentId, input.userId, null);
    if (bad) return fieldError("userId", bad);
  }

  const today = todayISO();
  let id: string;
  try {
    id = await db.$transaction(async (tx) => {
      let partyId = input.partyId;
      if (partyId) {
        // Y9: the profile owns the party — adoption overwrites name/phone/email.
        const { count } = await tx.party.updateMany({
          where: { establishmentId, id: partyId, type: "EMPLOYEE", active: true },
          data: partyColumns(input),
        });
        if (count === 0) throw new ConcurrentChangeError();
      } else {
        const party = await tx.party.create({
          data: { establishmentId, type: "EMPLOYEE", ...partyColumns(input) },
          select: { id: true },
        });
        partyId = party.id;
      }
      const employee = await tx.employee.create({
        data: { establishmentId, partyId, startDate: isoToDate(input.startDate), ...employeeColumns(input) },
        select: { id: true },
      });
      if (input.allowances.length > 0) {
        await tx.employeeAllowance.createMany({ data: allowanceRows(establishmentId, employee.id, input) });
      }
      await writeAudit({
        establishmentId, userId: user.id, action: "EMPLOYEE_CREATE", entity: "Employee", entityId: employee.id,
        after: { ...snapshotOf(input), partyId, adopted: input.partyId !== undefined }, client: tx,
      });
      const terms = termsOf(input, employee.id, null);
      if (terms) {
        const who = { id: employee.id, partyId, hireDate: input.startDate, name: input.name };
        await startSalaryPlan(tx, establishmentId, user.id, who, terms, today);
      }
      return employee.id;
    });
  } catch (error) {
    const known = refusal(error);
    if (known) return known;
    throw error;
  }

  revalidateEmployees();
  return { ok: true, data: { id } };
}

export async function updateEmployee(
  employeeId: string,
  _prev: EmployeeState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(employeeId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = parseEmployeeForm(formData);
  if (parsed.error) return parsed.error;
  const input = parsed.input;

  const existing = await findOwnEmployee(establishmentId, parsedId.data);
  if (!existing) return { ok: false, error: "err.notFound" };
  if (input.partyId && input.partyId !== existing.partyId) return fieldError("partyId", "err.partyInvalid");
  const endDate = existing.endDate ? dateToISO(existing.endDate) : null;
  if (endDate !== null && input.startDate > endDate) return fieldError("startDate", "err.endBeforeStart");
  if (existing.party.active && (await nameTaken(establishmentId, input.name, existing.partyId))) {
    return fieldError("name", "err.partyDuplicate");
  }
  if (input.userId && input.userId !== existing.userId) {
    const bad = await checkLogin(establishmentId, input.userId, existing.id);
    if (bad) return fieldError("userId", bad);
  }

  const today = todayISO();
  const active = existing.status === "ACTIVE";
  const plan = active ? await findOpenSalaryPlan(establishmentId, existing.id) : null;
  const hadSalary = existing.basicSalaryHalalas !== null;
  const terms = termsOf(input, existing.id, endDate);
  try {
    await db.$transaction(async (tx) => {
      if (plan) await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      await tx.party.updateMany({ where: { establishmentId, id: existing.partyId }, data: partyColumns(input) });
      const { count } = await tx.employee.updateMany({
        where: { establishmentId, id: existing.id, status: existing.status },
        data: { startDate: isoToDate(input.startDate), ...employeeColumns(input) },
      });
      if (count === 0) throw new ConcurrentChangeError();
      await tx.employeeAllowance.deleteMany({ where: { establishmentId, employeeId: existing.id } });
      if (input.allowances.length > 0) {
        await tx.employeeAllowance.createMany({ data: allowanceRows(establishmentId, existing.id, input) });
      }
      const { id: _id, party, startDate, endDate: _end, ...rest } = existing;
      await writeAudit({
        establishmentId, userId: user.id, action: "EMPLOYEE_UPDATE", entity: "Employee", entityId: existing.id,
        before: { ...rest, ...party, startDate: dateToISO(startDate) }, after: snapshotOf(input), client: tx,
      });
      if (!active) return; // an ended employee's salary fields are stored for reactivation only
      if (plan && (hadSalary || terms)) {
        await applySalaryChange(tx, establishmentId, user.id, plan, { hadSalary, hireDate: input.startDate, terms }, today);
      } else if (!plan && terms) {
        const who = { id: existing.id, partyId: existing.partyId, hireDate: input.startDate, name: input.name };
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
