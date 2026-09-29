import "server-only";

import { dateToISO } from "@/lib/dates";
import { db } from "@/lib/db";
import type { DirectionValue, ProjectStatusValue } from "@/lib/validation";

/**
 * إضافة (projects) — reads (docs/BACKEND.md → v1.2a → Projects).
 *
 * `establishmentId` comes from the page's requireX() and is the first key of
 * every `where`. The attached entries are not read here: the page calls
 * `listTransactions(estId, { projectId, page })`, so there is one ledger query.
 */

export type ProjectRow = {
  id: string;
  name: string;
  status: ProjectStatusValue;
  budgetHalalas: number | null;
  /** Σ OUT of the project's non-deleted entries. */
  spentHalalas: number;
  /** Σ IN of the project's non-deleted entries. */
  incomeHalalas: number;
  /** budget − spent; negative = over budget; null without a budget. */
  remainingHalalas: number | null;
  /** ISO `YYYY-MM-DD`. */
  startDate: string;
  endDate: string | null;
  /** Non-deleted entries. */
  transactionCount: number;
  /** Any entry references it, soft-deleted included (V8) — deletion is refused. */
  hasHistory: boolean;
};

export type ProjectCategoryTotal = {
  categoryId: string;
  nameAr: string;
  direction: DirectionValue;
  totalHalalas: number;
};

export type ProjectDetail = ProjectRow & {
  description: string | null;
  byCategory: ProjectCategoryTotal[];
};

export type ProjectOption = { id: string; name: string; status: ProjectStatusValue };

export type ProjectFilter = { status?: ProjectStatusValue };

const PROJECT_SELECT = {
  id: true,
  name: true,
  status: true,
  budgetHalalas: true,
  startDate: true,
  endDate: true,
} as const;

type SelectedProject = {
  id: string;
  name: string;
  status: ProjectStatusValue;
  budgetHalalas: number | null;
  startDate: Date;
  endDate: Date | null;
};

type Totals = { spent: number; income: number; count: number };

async function totals(
  establishmentId: string,
  projectIds: string[],
): Promise<Map<string, Totals>> {
  const out = new Map<string, Totals>();
  if (projectIds.length === 0) return out;
  const grouped = await db.transaction.groupBy({
    by: ["projectId", "direction"],
    where: { establishmentId, deletedAt: null, projectId: { in: projectIds } },
    _sum: { amountHalalas: true },
    _count: { _all: true },
  });
  for (const g of grouped) {
    if (g.projectId === null) continue;
    const entry = out.get(g.projectId) ?? { spent: 0, income: 0, count: 0 };
    // Number(): Postgres widens sum(int4) to bigint (V3).
    const sum = Number(g._sum.amountHalalas ?? 0);
    if (g.direction === "OUT") entry.spent += sum;
    else entry.income += sum;
    entry.count += g._count._all;
    out.set(g.projectId, entry);
  }
  return out;
}

/** Reference probe (gate exemption V1): deleted entries count, amounts are not read. */
async function projectsWithHistory(
  establishmentId: string,
  projectIds: string[],
): Promise<Set<string>> {
  if (projectIds.length === 0) return new Set();
  const linked = await db.transaction.groupBy({
    by: ["projectId"],
    where: { establishmentId, projectId: { in: projectIds } },
  });
  return new Set(linked.map((l) => l.projectId).filter((id): id is string => id !== null));
}

async function toRows(
  establishmentId: string,
  projects: SelectedProject[],
): Promise<ProjectRow[]> {
  const ids = projects.map((p) => p.id);
  const [sums, history] = await Promise.all([
    totals(establishmentId, ids),
    projectsWithHistory(establishmentId, ids),
  ]);
  return projects.map((p) => {
    const t = sums.get(p.id) ?? { spent: 0, income: 0, count: 0 };
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      budgetHalalas: p.budgetHalalas,
      spentHalalas: t.spent,
      incomeHalalas: t.income,
      remainingHalalas: p.budgetHalalas === null ? null : p.budgetHalalas - t.spent,
      startDate: dateToISO(p.startDate),
      endDate: p.endDate === null ? null : dateToISO(p.endDate),
      transactionCount: t.count,
      hasHistory: history.has(p.id),
    };
  });
}

/** ACTIVE first (enum order ACTIVE < COMPLETED < CANCELLED), then newest start. */
export async function listProjects(
  establishmentId: string,
  filter: ProjectFilter = {},
): Promise<ProjectRow[]> {
  const projects = await db.project.findMany({
    where: { establishmentId, ...(filter.status ? { status: filter.status } : {}) },
    select: PROJECT_SELECT,
    orderBy: [{ status: "asc" }, { startDate: "desc" }, { createdAt: "desc" }],
  });
  return toRows(establishmentId, projects);
}

export async function listProjectOptions(establishmentId: string): Promise<ProjectOption[]> {
  return db.project.findMany({
    where: { establishmentId },
    select: { id: true, name: true, status: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

async function byCategory(
  establishmentId: string,
  projectId: string,
): Promise<ProjectCategoryTotal[]> {
  const grouped = await db.transaction.groupBy({
    by: ["categoryId", "direction"],
    where: { establishmentId, deletedAt: null, projectId },
    _sum: { amountHalalas: true },
  });
  if (grouped.length === 0) return [];
  const categories = await db.category.findMany({
    where: { establishmentId, id: { in: grouped.map((g) => g.categoryId) } },
    select: { id: true, nameAr: true },
  });
  const names = new Map(categories.map((c) => [c.id, c.nameAr]));
  return grouped
    .map((g) => ({
      categoryId: g.categoryId,
      // Unreachable fallback: Transaction.categoryId is a required FK to a
      // Category of the same establishment, so the name is always found.
      nameAr: names.get(g.categoryId) ?? "",
      direction: g.direction,
      totalHalalas: Number(g._sum.amountHalalas ?? 0),
    }))
    .sort((a, b) => b.totalHalalas - a.totalHalalas);
}

export async function getProject(
  establishmentId: string,
  id: string,
): Promise<ProjectDetail | null> {
  const project = await db.project.findFirst({
    where: { establishmentId, id },
    select: { ...PROJECT_SELECT, description: true },
  });
  if (!project) return null;
  const { description, ...rest } = project;
  const [[row], categories] = await Promise.all([
    toRows(establishmentId, [rest]),
    byCategory(establishmentId, project.id),
  ]);
  return { ...row!, description, byCategory: categories };
}
