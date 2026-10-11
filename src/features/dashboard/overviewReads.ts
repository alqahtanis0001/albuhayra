import "server-only";

import { listParties, type PartyRow } from "@/features/parties/queries";
import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { dayOffset } from "@/lib/instalments";
import type { DirectionValue } from "@/lib/validation";

import { DIAL_DAYS, type Commitments, type DialEvent, type OwnerOverview } from "./wheel";
import { monthBounds } from "./wheelHrefs";

/**
 * v1.5 (docs/V15-SPEC.md A1–A2, D18, D22, D26, D35): the owner home's overview
 * reads — ring 3's commitments and the dial's dues. Every `where` starts with
 * the page's `establishmentId`. "Unpaid" is `paidHalalas < amountDueHalalas`
 * through a Prisma field reference, and an OPEN_ENDED plan never yields a due
 * (V14 D4) — the same clauses as `getDues`' `unpaidUntil`. Driven by the
 * scoping gate under its "v1.5 home" marker.
 */

export type { OwnerOverview };

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * D22 as amended by D39: لنا = Σ owedToUs; رواتب الشهر = the unpaid salaries
 * due ≤ the month's end; علينا = Σ owedByUs − **every** unpaid salary, whatever
 * its due date — salary rows are generated through the end of next month, and
 * next month's payroll belongs to neither ring part. Balances are
 * `listParties()`'s (reused, never re-derived), so
 * علينا + رواتب + later salaries = Σ owedByUs holds by construction. Every
 * salary instalment is inside its employee party's owedByUs, so the
 * subtraction cannot go below 0; the clamp only guards a corrupt row.
 */
export function commitmentsOf(
  parties: Array<Pick<PartyRow, "owedToUsHalalas" | "owedByUsHalalas">>,
  salariesThisMonthHalalas: number,
  salariesAllHalalas: number,
): Commitments {
  const toUs = parties.reduce((s, p) => s + p.owedToUsHalalas, 0);
  const byUs = parties.reduce((s, p) => s + p.owedByUsHalalas, 0);
  return {
    toUsHalalas: toUs,
    fromUsHalalas: Math.max(0, byUs - salariesAllHalalas),
    salariesHalalas: salariesThisMonthHalalas,
  };
}

const DIAL_SELECT = {
  id: true,
  planId: true,
  dueDate: true,
  amountDueHalalas: true,
  paidHalalas: true,
  plan: { select: { direction: true, kind: true, employeeId: true, party: { select: { name: true } } } },
} as const;

type DialRow = {
  id: string;
  planId: string;
  dueDate: Date;
  amountDueHalalas: number;
  paidHalalas: number;
  plan: { direction: DirectionValue; kind: string; employeeId: string | null; party: { name: string } };
};

function toEvent(r: DialRow, today: string): DialEvent {
  const dueDate = dateToISO(r.dueDate);
  return {
    instalmentId: r.id,
    planId: r.planId,
    employeeId: r.plan.employeeId ?? null,
    partyName: r.plan.party.name,
    kind: r.plan.kind === "SALARY" ? "SALARY" : r.plan.direction,
    remainingHalalas: r.amountDueHalalas - r.paidHalalas,
    dueDate,
    dayOffset: dayOffset(dueDate, today),
  };
}

/** `Number()`: Postgres widens `sum(int4)` to bigint (v1.2a V3). */
function remainingOf(agg: { _sum?: { amountDueHalalas?: unknown; paidHalalas?: unknown } | null }): number {
  return Number(agg._sum?.amountDueHalalas ?? 0) - Number(agg._sum?.paidHalalas ?? 0);
}

export async function getOwnerOverview(establishmentId: string, today: string): Promise<OwnerOverview> {
  const unpaid = { paidHalalas: { lt: db.instalment.fields.amountDueHalalas } };
  const scheduledOpen = { state: "OPEN" as const, kind: { not: "OPEN_ENDED" as const } };
  const overdueWhere = { establishmentId, dueDate: { lt: isoToDate(today) }, ...unpaid, plan: scheduledOpen };

  const salaryPlan = { state: "OPEN" as const, kind: "SALARY" as const };

  const [parties, salaries, salariesAll, upcoming, overdueRecent, overdueAll] = await Promise.all([
    listParties(establishmentId),
    // D22: every unpaid salary up to the month's end, arrears included («رواتب الشهر»).
    db.instalment.aggregate({
      where: { establishmentId, dueDate: { lte: isoToDate(monthBounds(today).to) }, ...unpaid, plan: salaryPlan },
      _sum: { amountDueHalalas: true, paidHalalas: true },
    }),
    // D39: every unpaid salary, whatever its due date — what leaves «علينا».
    db.instalment.aggregate({
      where: { establishmentId, ...unpaid, plan: salaryPlan },
      _sum: { amountDueHalalas: true, paidHalalas: true },
    }),
    // The dial: today … today + 29, bounded by the window itself.
    db.instalment.findMany({
      where: {
        establishmentId,
        dueDate: { gte: isoToDate(today), lte: isoToDate(addDays(today, DIAL_DAYS - 1)) },
        ...unpaid,
        plan: scheduledOpen,
      },
      select: DIAL_SELECT,
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    }),
    // D35: the two most recent overdue dues …
    db.instalment.findMany({
      where: overdueWhere,
      select: DIAL_SELECT,
      orderBy: [{ dueDate: "desc" }, { id: "desc" }],
      take: 2,
    }),
    // … and the whole overdue count and sum, never the history itself.
    db.instalment.aggregate({
      where: overdueWhere,
      _count: { _all: true },
      _sum: { amountDueHalalas: true, paidHalalas: true },
    }),
  ]);

  const count = Number((overdueAll as { _count?: { _all?: number } })._count?._all ?? 0);
  return {
    commitments: commitmentsOf(parties, remainingOf(salaries), remainingOf(salariesAll)),
    dial: (upcoming as DialRow[]).map((r) => toEvent(r, today)),
    overdue: {
      recent: (overdueRecent as DialRow[]).map((r) => toEvent(r, today)),
      count,
      totalHalalas: remainingOf(overdueAll),
    },
  };
}
