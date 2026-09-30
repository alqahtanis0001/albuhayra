"use client";

/**
 * The owner's daily sheet (spec §3.3, M5): every employee employed that day,
 * saved in one action. Posts `date` + one JSON `rows` field holding only the
 * rows that changed, each with the `updatedAt` it was loaded with (Z3/Y6); a
 * changed row needs a status (a saved day cannot go back to «غير مسجل», Z6).
 * «نسخ من آخر يوم عمل» fills statuses only, into rows without a record, and
 * still needs حفظ. After a save the page refreshes and the drafts follow the
 * fresh rows.
 */
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Toast } from "@/components/Toast";
import { errorMessage, t } from "@/i18n/ar";
import type { ActionResult, AttendanceStatusValue } from "@/lib/validation";

import { SheetRowEditor } from "./SheetRowEditor";
import { changedRowsJson, copyStatuses, isChanged, toDraft, type DraftRow, type SheetRow } from "./sheetDraft";

type Result = ActionResult<{ saved: number }>;
export type SaveDayAction = (prev: Result | null, formData: FormData) => Promise<Result>;

const signature = (rows: SheetRow[]) => rows.map((r) => `${r.employeeId}:${r.updatedAt ?? ""}`).join("|");

export function DaySheetForm({
  action,
  date,
  rows,
  copySource,
}: {
  action: SaveDayAction;
  date: string;
  rows: SheetRow[];
  /** The last day with a record, for «نسخ من آخر يوم عمل»; null hides the button. */
  copySource: Record<string, AttendanceStatusValue> | null;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftRow[]>(() => rows.map(toDraft));
  const [seen, setSeen] = useState(() => signature(rows));
  const [saved, setSaved] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // Fresh rows after a save (or another tab's): start again from them.
  if (signature(rows) !== seen) {
    setSeen(signature(rows));
    setDrafts(rows.map(toDraft));
  }

  const byId = new Map(rows.map((r) => [r.employeeId, r]));
  const changed = drafts.filter((d) => {
    const row = byId.get(d.employeeId);
    return row !== undefined && isChanged(d, row);
  });

  const [state, formAction, pending] = useActionState(
    async (prev: Result | null, formData: FormData): Promise<Result | null> => {
      const missing = Object.fromEntries(
        changed.filter((d) => d.status === null).map((d) => [d.employeeId, "err.required"]),
      );
      setRowErrors(missing);
      if (Object.keys(missing).length > 0) return null;
      const result = await action(prev, formData);
      if (result.ok) {
        setSaved(true);
        router.refresh();
      }
      return result;
    },
    null,
  );

  const update = (next: DraftRow) =>
    setDrafts((all) => all.map((d) => (d.employeeId === next.employeeId ? next : d)));

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="rows" value={changedRowsJson(drafts, rows)} />

      {copySource ? (
        <div className="no-print">
          <Button variant="secondary" size="sm" onClick={() => setDrafts((all) => copyStatuses(all, rows, copySource))}>
            {t.attendance.copyLastDay}
          </Button>
        </div>
      ) : null}

      <ol className="rounded-xl border border-gray-200 bg-white">
        {rows.map((row) => (
          <SheetRowEditor
            key={row.employeeId}
            row={row}
            draft={drafts.find((d) => d.employeeId === row.employeeId) ?? toDraft(row)}
            date={date}
            onChange={update}
            error={rowErrors[row.employeeId]}
          />
        ))}
      </ol>

      <div className="no-print">
        <Button type="submit" pending={pending} disabled={changed.length === 0}>
          {t.attendance.save}
        </Button>
      </div>

      {/* The sheet has one field on the wire (`rows`), so a field error is said here. */}
      {state && !state.ok && state.fieldErrors ? (
        <p role="alert" className="text-sm font-medium text-money-out">
          {errorMessage(Object.values(state.fieldErrors)[0] ?? state.error)}
        </p>
      ) : null}
      <FormToast state={state} />
      {saved ? <Toast message={t.attendance.saved} tone="success" onDismiss={() => setSaved(false)} /> : null}
    </form>
  );
}

export default DaySheetForm;
