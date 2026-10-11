/**
 * RULE: this file may contain nothing but `export type`. Client components
 * import these shapes, and the query modules that produce them start with
 * `import "server-only"`; `export type` is erased by TypeScript, so it is the
 * only content that keeps that boundary safe. An importable *value* here would
 * break it with nothing looking wrong (PROGRESS.md Gotchas).
 *
 * v1.4 (Q5 ruling): the exported shapes of `plans/queries.ts` and
 * `plans/dues.ts` live here, re-exported from both so every import path holds.
 * No `Date` in any shape — ISO strings and Riyadh-formatted instants only.
 */
import type { InstalmentStatus, PlanStatus } from "@/lib/instalments";
import type { DirectionValue, PartyTypeValue, PaymentMethodValue } from "@/lib/validation";

import type { ScheduledKind } from "./kind";

// ---- plans/queries.ts ------------------------------------------------------

export type NextDue = {
  instalmentId: string;
  periodYm: string | null;
  dueDate: string;
  remainingHalalas: number;
  status: InstalmentStatus;
  dayOffset: number;
};

/** A STANDARD / SALARY agreement's card (v1.2a); `PlanRow` is the union with the open card below. */
export type ScheduledPlanRow = {
  id: string;
  title: string;
  partyId: string;
  partyName: string;
  partyType: PartyTypeValue;
  direction: DirectionValue;
  startDate: string;
  totalHalalas: number;
  paidHalalas: number;
  remainingHalalas: number;
  status: PlanStatus;
  instalmentCount: number;
  paidCount: number;
  nextDue: NextDue | null;
  /** v1.3 item 7: each instalment's derived status, in schedule order (the list card's bar). */
  instalmentStatuses: InstalmentStatus[];
  /** v1.2b: SALARY plans are managed from the employee profile (D1); title derived (X13). */
  kind: ScheduledKind;
  employeeId: string | null;
};

/**
 * v1.4 (docs/V14-SPEC.md C): an OPEN_ENDED agreement's card. No instalments;
 * `receivedHalalas` is Σ of its non-deleted payments (`Transaction.planId`),
 * `totalHalalas` the optional ceiling, `remainingHalalas` total − received
 * (null without a ceiling; may be negative when over-received, P14).
 */
export type OpenPlanRow = {
  id: string;
  title: string;
  partyId: string;
  partyName: string;
  partyType: PartyTypeValue;
  direction: DirectionValue;
  startDate: string;
  /** OPEN → ACTIVE; else the state. */
  status: PlanStatus;
  kind: "OPEN_ENDED";
  employeeId: null;
  totalHalalas: number | null;
  receivedHalalas: number;
  remainingHalalas: number | null;
  expectedEndDate: string | null;
};

export type PlanRow = ScheduledPlanRow | OpenPlanRow;

export type OpenPlanPayment = {
  transactionId: string;
  date: string;
  amountHalalas: number;
  paymentMethod: PaymentMethodValue;
  createdByName: string;
};

export type OpenPlanDetail = OpenPlanRow & {
  categoryId: string;
  categoryNameAr: string;
  notes: string | null;
  /** Riyadh date of the close instant. */
  closedAt: string | null;
  canClose: boolean;
  canReopen: boolean;
  /** Any entry references the plan (deleted included, D5): party, direction, start and category are fixed. */
  partyLocked: boolean;
  /** Newest first. */
  payments: OpenPlanPayment[];
};

export type PlanPayment = { transactionId: string; date: string; amountHalalas: number; createdByName: string };

export type PlanInstalment = {
  id: string;
  seq: number;
  /** v1.2b: the month of a SALARY row — shown instead of `seq`. */
  periodYm: string | null;
  dueDate: string;
  amountDueHalalas: number;
  paidHalalas: number;
  remainingHalalas: number;
  status: InstalmentStatus;
  dayOffset: number;
  /** Paid, or referenced by any entry (deleted included): read-only on edit. */
  fixed: boolean;
  /** Payments recorded **against** this instalment (allocation may spread them). */
  payments: PlanPayment[];
};

export type PlanDetail = ScheduledPlanRow & {
  categoryId: string;
  categoryNameAr: string;
  reminderDays: number;
  notes: string | null;
  /** Riyadh date of the archive/cancel instant. */
  closedAt: string | null;
  canCancel: boolean;
  overpaidHalalas: number;
  instalments: PlanInstalment[];
  /** v1.2c C10: what the owner's «تذكير» button needs — never the address itself. */
  partyRemindersOptIn: boolean;
  partyHasEmail: boolean;
};

export type PlanFilter = { direction?: DirectionValue; status?: PlanStatus; partyId?: string };

// ---- plans/dues.ts ---------------------------------------------------------

export type DueRow = {
  instalmentId: string;
  planId: string;
  planTitle: string;
  partyId: string;
  partyName: string;
  direction: DirectionValue;
  seq: number;
  dueDate: string;
  remainingHalalas: number;
  status: InstalmentStatus;
  dayOffset: number;
  /** v1.2b: SALARY rows carry their month — show it instead of `seq`. */
  kind: ScheduledKind;
  periodYm: string | null;
  /** v1.2c C10 (N4): what the owner's «تذكير» button needs — never the address itself. */
  partyRemindersOptIn: boolean;
  partyHasEmail: boolean;
};

export type Dues = {
  today: string;
  weekEnd: string;
  overdue: DueRow[];
  thisWeek: DueRow[];
  totals: { overdueInHalalas: number; overdueOutHalalas: number; weekInHalalas: number; weekOutHalalas: number };
  /** v1.4 (D17 c9): the establishment has any plan of any kind or state — the home card hides on false. */
  hasPlans: boolean;
};

/** The staff card's rows — exactly these four fields (user's ruling; W5 pins the keys). */
export type StaffDueRow = { instalmentId: string; partyName: string; remainingHalalas: number; dueDate: string };

export type InstalmentForPayment = {
  instalmentId: string;
  planId: string;
  planTitle: string;
  seq: number;
  direction: DirectionValue;
  partyId: string;
  partyName: string;
  categoryId: string;
  instalmentRemainingHalalas: number;
  planRemainingHalalas: number;
  kind: ScheduledKind;
  periodYm: string | null;
  /** v1.4 part 3 (R6, D31h): the SALARY plan's employee, read on the same findFirst; the staff prefill strips it. */
  employeeId: string | null;
};

/** W2: the staff payment form sees exactly these six fields — no plan title or totals. */
export type StaffPaymentPrefill = Pick<
  InstalmentForPayment,
  "instalmentId" | "direction" | "partyId" | "partyName" | "categoryId" | "instalmentRemainingHalalas"
>;

/** W1: the link shown when editing a payment — any plan state. */
export type PaymentLink = { planId: string; planTitle: string; direction: DirectionValue; partyId: string; partyName: string };
