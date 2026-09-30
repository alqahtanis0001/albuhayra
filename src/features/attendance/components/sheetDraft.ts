/**
 * The owner's day sheet as it is being edited (pure, client-safe). One draft
 * row per employee; only rows that differ from what was loaded are posted
 * (Z3), each with the `updatedAt` it was loaded with (Y6). Whether a status is
 * "overridden" is the server's call (Z1) — `settleStatus` here only previews
 * the «محسوب / معدّل يدويًا» badge.
 */
import type { DaySheetRow } from "@/features/attendance/queries";
import { expectedStatus, minutesBetween, settleStatus, type Schedule } from "@/lib/attendance";
import type { AttendanceStatusValue } from "@/lib/validation";

export type SheetRow = {
  employeeId: string;
  name: string;
  schedule: Schedule;
  /** A saved record exists for this day. */
  recorded: boolean;
  status: AttendanceStatusValue | null;
  statusOverridden: boolean;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
  updatedAt: string | null;
};

/** From the server's row: a record as saved, else the prefill (عطلة on a non-work day). */
export function sheetRowOf(row: DaySheetRow): SheetRow {
  return {
    employeeId: row.employeeId,
    name: row.name,
    schedule: row.schedule,
    recorded: row.record !== null,
    status: row.record?.status ?? row.prefill,
    statusOverridden: row.record?.statusOverridden ?? false,
    checkIn: row.record?.checkIn ?? null,
    checkOut: row.record?.checkOut ?? null,
    note: row.record?.note ?? null,
    updatedAt: row.record?.updatedAt ?? null,
  };
}

export type DraftRow = {
  employeeId: string;
  status: AttendanceStatusValue | null;
  /** The owner chose the status by hand; a typed check-in then leaves it alone. */
  manual: boolean;
  checkIn: string;
  checkOut: string;
  note: string;
};

export const toDraft = (row: SheetRow): DraftRow => ({
  employeeId: row.employeeId,
  status: row.status,
  manual: row.statusOverridden,
  checkIn: row.checkIn ?? "",
  checkOut: row.checkOut ?? "",
  note: row.note ?? "",
});

/**
 * A typed check-in re-derives the status unless the owner chose one by hand.
 * Clearing it clears a derived status too (back to the day's prefill — عطلة
 * or nothing): a derived «متأخر» with no time behind it would be a wrong
 * record, and a changed row without a status cannot be saved (Z6).
 */
export function withCheckIn(draft: DraftRow, checkIn: string, row: SheetRow, date: string): DraftRow {
  const next = { ...draft, checkIn };
  if (draft.manual) return next;
  return { ...next, status: expectedStatus(checkIn || null, row.schedule, date) };
}

export function isChanged(draft: DraftRow, row: SheetRow): boolean {
  return (
    draft.status !== row.status ||
    draft.checkIn !== (row.checkIn ?? "") ||
    draft.checkOut !== (row.checkOut ?? "") ||
    draft.note.trim() !== (row.note ?? "")
  );
}

/** The badge a saved row would get: null until there is a status. */
export function previewOverridden(draft: DraftRow, row: SheetRow, date: string): boolean | null {
  if (!draft.status) return null;
  return settleStatus(draft.status, draft.checkIn || null, row.schedule, date).statusOverridden;
}

export function workedMinutes(draft: DraftRow): number | null {
  return minutesBetween(draft.checkIn || null, draft.checkOut || null);
}

/** The JSON `rows` field: changed rows only, never `statusOverridden` (Z1). */
export function changedRowsJson(drafts: DraftRow[], rows: SheetRow[]): string {
  const byId = new Map(rows.map((r) => [r.employeeId, r]));
  return JSON.stringify(
    drafts
      .filter((d) => {
        const row = byId.get(d.employeeId);
        return row !== undefined && isChanged(d, row);
      })
      .map((d) => ({
        employeeId: d.employeeId,
        status: d.status,
        checkIn: d.checkIn,
        checkOut: d.checkOut,
        note: d.note,
        ...(byId.get(d.employeeId)?.updatedAt ? { updatedAt: byId.get(d.employeeId)!.updatedAt } : {}),
      })),
  );
}

/** Z6: statuses only, into rows without a record that have no status yet. */
export function copyStatuses(
  drafts: DraftRow[],
  rows: SheetRow[],
  statuses: Record<string, AttendanceStatusValue>,
): DraftRow[] {
  const recorded = new Set(rows.filter((r) => r.recorded).map((r) => r.employeeId));
  return drafts.map((d) => {
    const copied = statuses[d.employeeId];
    if (!copied || recorded.has(d.employeeId) || d.status !== null) return d;
    // PRESENT/LATE stay open to a check-in's derivation; the others are choices.
    return { ...d, status: copied, manual: copied !== "PRESENT" && copied !== "LATE" };
  });
}

/** «8 س 30 د» from a template with {h} and {m}; Western digits. */
export function hoursText(template: string, minutes: number): string {
  return template.replace("{h}", String(Math.floor(minutes / 60))).replace("{m}", String(minutes % 60));
}
