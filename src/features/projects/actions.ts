"use server";

/**
 * إضافة (projects) — mutations (docs/BACKEND.md → v1.2a → Projects). OWNER
 * only. Names may repeat. Every write is scoped in the SQL (`create` data, or
 * `updateMany`/`deleteMany` on `{ id, establishmentId }`), so a forged id
 * reaches 0 rows and answers `err.notFound` (rules 2b and 11).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import {
  ProjectInputSchema,
  ProjectStatusEnum,
  invalid,
  type ActionResult,
  type ProjectInput,
  type ProjectStatusValue,
} from "@/lib/validation";

export type ProjectState = ActionResult<{ id: string }> | ActionResult<null> | null;

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

/** Project names and totals show on the list, the ledger chips and the entry form. */
function revalidateProjects(): void {
  revalidatePath("/owner/projects");
  revalidatePath("/owner", "layout");
  revalidatePath("/staff", "layout");
}

/** The P2003 a `Restrict` foreign key raises when a row still points here (V2). */
function isForeignKeyViolation(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "P2003";
}

/** Clearing an optional field writes null (V12). */
function columns(input: ProjectInput) {
  return {
    name: input.name,
    description: input.description ?? null,
    budgetHalalas: input.budgetHalalas ?? null,
    startDate: isoToDate(input.startDate),
    endDate: input.endDate ? isoToDate(input.endDate) : null,
  };
}

/** Audit JSON holds ISO dates, never Date objects. */
function snapshot(row: {
  name: string;
  description: string | null;
  budgetHalalas: number | null;
  startDate: Date;
  endDate: Date | null;
  status?: ProjectStatusValue;
}) {
  return {
    name: row.name,
    description: row.description,
    budgetHalalas: row.budgetHalalas,
    startDate: dateToISO(row.startDate),
    endDate: row.endDate === null ? null : dateToISO(row.endDate),
    ...(row.status ? { status: row.status } : {}),
  };
}

async function findOwnProject(establishmentId: string, projectId: string) {
  return db.project.findFirst({
    where: { establishmentId, id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      budgetHalalas: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });
}

function parseForm(formData: FormData) {
  return ProjectInputSchema.safeParse(Object.fromEntries(formData));
}

export async function createProject(
  _prev: ProjectState,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { user, establishmentId } = await requireOwner();
  const parsed = parseForm(formData);
  if (!parsed.success) return invalid(parsed.error);

  const data = columns(parsed.data);
  const id = await db.$transaction(async (tx) => {
    const row = await tx.project.create({
      data: { establishmentId, ...data },
      select: { id: true },
    });
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "PROJECT_CREATE",
      entity: "Project",
      entityId: row.id,
      after: snapshot({ ...data, status: "ACTIVE" }),
      client: tx,
    });
    return row.id;
  });

  revalidateProjects();
  return { ok: true, data: { id } };
}

export async function updateProject(
  projectId: string,
  _prev: ProjectState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = parseForm(formData);
  if (!parsed.success) return invalid(parsed.error);

  const existing = await findOwnProject(establishmentId, parsedId.data);
  if (!existing) return { ok: false, error: "err.notFound" };

  const data = columns(parsed.data);
  const changed = await db.$transaction(async (tx) => {
    const { count } = await tx.project.updateMany({
      where: { establishmentId, id: existing.id },
      data,
    });
    if (count === 0) return 0;
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "PROJECT_UPDATE",
      entity: "Project",
      entityId: existing.id,
      before: snapshot(existing),
      after: snapshot({ ...data, status: existing.status }),
      client: tx,
    });
    return count;
  });
  if (changed === 0) return { ok: false, error: "err.notFound" };

  revalidateProjects();
  return { ok: true, data: null };
}

/** Any status may move to any other — reopening a completed إضافة is allowed. */
export async function setProjectStatus(
  projectId: string,
  status: ProjectStatusValue,
): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsedStatus = ProjectStatusEnum.safeParse(status);
  if (!parsedStatus.success) return invalid(parsedStatus.error);

  const existing = await findOwnProject(establishmentId, parsedId.data);
  if (!existing) return { ok: false, error: "err.notFound" };

  const changed = await db.$transaction(async (tx) => {
    const { count } = await tx.project.updateMany({
      where: { establishmentId, id: existing.id },
      data: { status: parsedStatus.data },
    });
    if (count === 0) return 0;
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "PROJECT_STATUS",
      entity: "Project",
      entityId: existing.id,
      before: { status: existing.status },
      after: { status: parsedStatus.data },
      client: tx,
    });
    return count;
  });
  if (changed === 0) return { ok: false, error: "err.notFound" };

  revalidateProjects();
  return { ok: true, data: null };
}

/**
 * Refused once any entry references it, soft-deleted included (its foreign key
 * still points here). The check gives the friendly answer; the `Restrict`
 * foreign key is what holds under a race (V2).
 */
export async function deleteProject(projectId: string): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) return invalid(parsedId.error);

  const existing = await findOwnProject(establishmentId, parsedId.data);
  if (!existing) return { ok: false, error: "err.notFound" };

  const linked = await db.transaction.count({
    where: { establishmentId, projectId: existing.id },
  });
  if (linked > 0) return { ok: false, error: "err.projectHasHistory" };

  let changed: number;
  try {
    changed = await db.$transaction(async (tx) => {
      const { count } = await tx.project.deleteMany({
        where: { establishmentId, id: existing.id },
      });
      if (count === 0) return 0;
      await writeAudit({
        establishmentId,
        userId: user.id,
        action: "PROJECT_DELETE",
        entity: "Project",
        entityId: existing.id,
        before: snapshot(existing),
        client: tx,
      });
      return count;
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) return { ok: false, error: "err.projectHasHistory" };
    throw error;
  }
  if (changed === 0) return { ok: false, error: "err.notFound" };

  revalidateProjects();
  return { ok: true, data: null };
}
