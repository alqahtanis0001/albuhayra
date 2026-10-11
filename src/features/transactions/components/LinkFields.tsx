"use client";

/**
 * The entry form's v1.2a links (docs/FRONTEND.md, Transaction form CP1):
 *
 * - الجهة: «بدون جهة», the active parties grouped by type, the entry's own
 *   party even if since deactivated (labelled «(موقوف)» — kept, never newly
 *   assigned, like categories), and «أخرى (اكتب الاسم)», which reveals the
 *   free-text `counterparty`. The select itself has no name (so FormData holds
 *   only contract fields): a hidden
 *   `partyId` carries the chosen id, so the «أخرى» sentinel never reaches the
 *   server, and `counterparty` is submitted only under «أخرى».
 * - ضمن إضافة: «بدون إضافة», ACTIVE إضافات, and the entry's own even if it is
 *   completed or cancelled (labelled with its status).
 *
 * Staff see the same two selects: they may pick existing parties and إضافات,
 * never create them. Controlled, so a refused submit keeps the choice.
 *
 * v1.4 part 2 (D23): on an owner page (`manageParties`) the very last option is
 * «+ جهة جديدة», a sentinel that opens the inline `PartyQuickAdd` box and posts
 * `partyId=""` meanwhile; the added row is handed up (`onPartyAdded`) — the
 * list is the parent's client state, so it survives this component's remount
 * after «حفظ وإضافة أخرى», and the parent shows the toast outside the
 * collapsible panel — and selected here. Absent while the party is locked or
 * the month is (a disabled select). Opening the box (`adding`) leaves the
 * chosen party alone, so «إلغاء» restores it (R-p2-1-S1).
 */
import { useState } from "react";

import { Input } from "@/components/Input";
import { Select, type SelectGroup } from "@/components/Select";
import { t } from "@/i18n/ar";
import { PartyQuickAdd } from "@/features/parties/components/PartyQuickAdd";
import { NEW_PARTY, postedPartyId, shownPartyChoice } from "@/features/parties/components/quickPartyList";
import type { PartyOption } from "@/features/parties/queries";
import type { ProjectOption } from "@/features/projects/queries";
import { PartyTypeEnum } from "@/lib/validation";

const OTHER = "__other";

/**
 * v1.4 part 3 (D29 R10): «+ جهة جديدة (تُحفظ للمرات القادمة)» comes before
 * «أخرى — اسم لمرة واحدة (لا يُحفظ)» — the sentinel first, so a one-off name is
 * the second thought, not the first. The sentinel is still never posted.
 */
export function trailingOptions(quickAdd: boolean): { value: string; label: string }[] {
  return [
    ...(quickAdd ? [{ value: NEW_PARTY, label: t.partyQuick.add }] : []),
    { value: OTHER, label: t.parties.other },
  ];
}

export type LinkInitial = {
  partyId: string | null;
  counterparty: string | null;
  projectId: string | null;
};

export function LinkFields({
  parties,
  projects,
  initial,
  disabled = false,
  lockParty = false,
  fieldErrors,
  manageParties = false,
  onPartyAdded,
}: {
  parties: PartyOption[];
  projects: ProjectOption[];
  /** The entry being edited, or a new entry's presets (?projectId=). */
  initial: LinkInitial;
  disabled?: boolean;
  /** Payment mode: the party is the plan's, posted by PaymentBanner — no picker. */
  lockParty?: boolean;
  fieldErrors?: Record<string, string>;
  /** Owner pages only (D23): offers «+ جهة جديدة»; the parent upserts the row into its list. */
  manageParties?: boolean;
  onPartyAdded?: (row: PartyOption) => void;
}) {
  const [party, setParty] = useState(
    initial.partyId ?? (initial.counterparty ? OTHER : ""),
  );
  const [counterparty, setCounterparty] = useState(initial.counterparty ?? "");
  const [projectId, setProjectId] = useState(initial.projectId ?? "");
  const [adding, setAdding] = useState(false);
  const shown = shownPartyChoice(party, adding);

  const partyGroups: SelectGroup[] = PartyTypeEnum.options.map((type) => ({
    label: t.partyType[type],
    options: parties
      .filter((p) => p.type === type && (p.active || p.id === initial.partyId))
      .map((p) => ({
        value: p.id,
        label: p.active ? p.name : `${p.name} (${t.status.DISABLED})`,
      })),
  }));

  const quickAdd = manageParties && !lockParty && !disabled;
  const trailing = trailingOptions(quickAdd);

  const projectOptions = projects
    .filter((p) => p.status === "ACTIVE" || p.id === initial.projectId)
    .map((p) => ({
      value: p.id,
      label: p.status === "ACTIVE" ? p.name : `${p.name} (${t.projectStatus[p.status]})`,
    }));

  return (
    <>
      {lockParty ? null : (
        <div className="flex flex-col gap-2">
          <Select
            label={`${t.transaction.party} (${t.common.optional})`}
            id="partyChoice"
            options={[{ value: "", label: t.parties.none }]}
            groups={partyGroups}
            trailing={trailing}
            value={shown}
            onChange={(e) => (e.target.value === NEW_PARTY ? setAdding(true) : (setAdding(false), setParty(e.target.value)))}
            disabled={disabled}
            error={fieldErrors?.partyId}
          />
          <input type="hidden" name="partyId" value={shown === OTHER ? "" : postedPartyId(shown)} />
          {quickAdd ? (
            <PartyQuickAdd
              open={shown === NEW_PARTY}
              onAdded={(row) => {
                setAdding(false);
                onPartyAdded?.(row);
                setParty(row.id);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : null}
          {shown === OTHER ? (
            <Input
              label={t.parties.otherName}
              name="counterparty"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              hint={t.transaction.counterpartyHint}
              maxLength={200}
              disabled={disabled}
              error={fieldErrors?.counterparty}
            />
          ) : null}
        </div>
      )}

      <Select
        label={`${t.transaction.project} (${t.common.optional})`}
        name="projectId"
        options={[{ value: "", label: t.projects.none }, ...projectOptions]}
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        disabled={disabled}
        error={fieldErrors?.projectId}
      />
    </>
  );
}

export default LinkFields;
