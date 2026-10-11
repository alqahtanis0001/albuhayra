"use client";

/**
 * v1.4 part 2 (D24): الجهة, ضمن نشاط and ملاحظة behind one disclosure button
 * «تفاصيل أكثر» / «تفاصيل أقل». The three fields stay in the DOM while
 * collapsed — the container is `hidden`, never unmounted — so a value is never
 * dropped by collapsing, and FormData is the same either way.
 *
 * The open state is remembered per device (`entryDetailsState.ts`), read in an
 * effect after mount: the server renders the rule's answer with nothing
 * remembered, exactly as the direction toggle does. Auto-open (an edited entry
 * with those fields set, a preset, a server field error) never writes the
 * remembered value — only the user's own toggle does (D27 S7).
 *
 * Payment mode is unchanged: no button; the party is the plan's (posted by
 * PaymentBanner) and the project and note render as plain fields.
 *
 * D23 / D27 S3: the party option list is client state *here*, not in
 * `LinkFields` (which `linkKey` remounts after «حفظ وإضافة أخرى»), so a party
 * added for one entry is still offered for the next.
 */
import { useEffect, useId, useState } from "react";

import { Textarea } from "@/components/Textarea";
import { Toast } from "@/components/Toast";
import { t } from "@/i18n/ar";
import { applyAddedParty } from "@/features/parties/components/quickPartyList";
import type { PartyOption } from "@/features/parties/queries";
import type { ProjectOption } from "@/features/projects/queries";

import { LinkFields } from "./LinkFields";
import type { TransactionRow } from "./data";
import { readDetailsOpen, rememberDetailsOpen, shouldOpenDetails } from "./entryDetailsState";

const BUTTON =
  "inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-accent-dark underline-offset-2 hover:underline";

export function EntryDetails({
  parties,
  projects,
  initial,
  presetPartyId,
  presetProjectId,
  payment = false,
  disabled = false,
  fieldErrors,
  linkKey,
  manageParties = false,
}: {
  parties: PartyOption[];
  projects: ProjectOption[];
  /** The entry being edited. */
  initial?: TransactionRow;
  /** New entry presets (`?partyId=` / `?projectId=`), already checked against the options by the page. */
  presetPartyId?: string;
  presetProjectId?: string;
  /** Payment mode: no disclosure, no party picker (the banner posts the plan's). */
  payment?: boolean;
  /** A locked original: every field disabled. */
  disabled?: boolean;
  fieldErrors?: Record<string, string>;
  /** Remounts LinkFields after «حفظ وإضافة أخرى», clearing the party and project. */
  linkKey: number;
  /** Owner pages only (D23): the party select offers «+ جهة جديدة». */
  manageParties?: boolean;
}) {
  const panelId = useId();
  const [partyList, setPartyList] = useState(parties);
  // The quick-add toast lives here, outside the collapsible panel, so collapsing does not hide it (R-p2-1 N).
  const [toast, setToast] = useState<string | null>(null);
  const rule = { initial, presetPartyId, presetProjectId, fieldErrors };
  // The server render answers the rule with nothing remembered; see the effect.
  const [open, setOpen] = useState(() => shouldOpenDetails({ ...rule, remembered: false }));

  // localStorage is read after mount only: it does not exist during the server
  // render, and seeding state from it would be a hydration mismatch.
  useEffect(() => {
    setOpen(shouldOpenDetails({ ...rule, remembered: readDetailsOpen() }));
    // The rule's inputs are props fixed for the life of the form; a later field
    // error is handled by the second effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // B1: a refused submit naming one of these fields must show it, whatever the user chose.
  useEffect(() => {
    if (shouldOpenDetails({ fieldErrors, remembered: false })) setOpen(true);
  }, [fieldErrors]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    rememberDetailsOpen(next);
  };

  const fields = (
    <>
      <LinkFields
        key={linkKey}
        parties={partyList}
        projects={projects}
        initial={{
          partyId: initial?.partyId ?? presetPartyId ?? null,
          counterparty: initial?.counterparty ?? null,
          projectId: initial?.projectId ?? presetProjectId ?? null,
        }}
        disabled={disabled}
        lockParty={payment}
        fieldErrors={fieldErrors}
        manageParties={manageParties}
        onPartyAdded={(row) => {
          setPartyList((list) => applyAddedParty(list, row));
          setToast(t.partyQuick.added);
        }}
      />
      <Textarea
        label={`${t.transaction.note} (${t.common.optional})`}
        name="note"
        defaultValue={initial?.note ?? ""}
        maxLength={500}
        disabled={disabled}
        error={fieldErrors?.note}
      />
    </>
  );

  const toastNode = toast ? <Toast message={toast} tone="success" onDismiss={() => setToast(null)} /> : null;

  if (payment) return fields;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={`no-print ${BUTTON}`}
      >
        <span aria-hidden="true">{open ? "−" : "+"}</span>
        {open ? t.entryDetails.less : t.entryDetails.more}
        <span className="sr-only"> ({t.entryDetails.holds})</span>
      </button>
      <div id={panelId} hidden={!open} className="flex flex-col gap-4">
        {fields}
      </div>
      {toastNode}
    </div>
  );
}

export default EntryDetails;
