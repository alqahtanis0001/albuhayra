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
 */
import { useState } from "react";

import { Input } from "@/components/Input";
import { Select, type SelectGroup } from "@/components/Select";
import { t } from "@/i18n/ar";
import type { PartyOption } from "@/features/parties/queries";
import type { ProjectOption } from "@/features/projects/queries";
import { PartyTypeEnum } from "@/lib/validation";

const OTHER = "__other";

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
  fieldErrors,
}: {
  parties: PartyOption[];
  projects: ProjectOption[];
  /** The entry being edited, or a new entry's presets (?projectId=). */
  initial: LinkInitial;
  disabled?: boolean;
  fieldErrors?: Record<string, string>;
}) {
  const [party, setParty] = useState(
    initial.partyId ?? (initial.counterparty ? OTHER : ""),
  );
  const [counterparty, setCounterparty] = useState(initial.counterparty ?? "");
  const [projectId, setProjectId] = useState(initial.projectId ?? "");

  const partyGroups: SelectGroup[] = PartyTypeEnum.options.map((type) => ({
    label: t.partyType[type],
    options: parties
      .filter((p) => p.type === type && (p.active || p.id === initial.partyId))
      .map((p) => ({
        value: p.id,
        label: p.active ? p.name : `${p.name} (${t.status.DISABLED})`,
      })),
  }));

  const projectOptions = projects
    .filter((p) => p.status === "ACTIVE" || p.id === initial.projectId)
    .map((p) => ({
      value: p.id,
      label: p.status === "ACTIVE" ? p.name : `${p.name} (${t.projectStatus[p.status]})`,
    }));

  return (
    <>
      <div className="flex flex-col gap-2">
        <Select
          label={`${t.transaction.party} (${t.common.optional})`}
          id="partyChoice"
          options={[{ value: "", label: t.parties.none }]}
          groups={partyGroups}
          trailing={[{ value: OTHER, label: t.parties.other }]}
          value={party}
          onChange={(e) => setParty(e.target.value)}
          disabled={disabled}
          error={fieldErrors?.partyId}
        />
        <input type="hidden" name="partyId" value={party === OTHER ? "" : party} />
        {party === OTHER ? (
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
