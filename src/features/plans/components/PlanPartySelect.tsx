"use client";

/**
 * v1.4 part 2 (D23, D27 S2/S6): the agreement forms' party block, shared by
 * `PlanForm` and `OpenPlanForm` — the select grouped by type (the plan's own
 * party kept listed even if since deactivated), the owner-only «+ جهة جديدة»
 * sentinel and the inline box it opens.
 *
 * The select carries no `name`: a hidden `partyId` input posts
 * `postedPartyId(value)`, so the sentinel can never be the posted value, and
 * when the party is locked (a fixed instalment, a payment) the disabled select
 * still posts its value through the same hidden input. The sentinel is not
 * offered while locked.
 *
 * Choosing the sentinel only opens the box (`adding`, local): the form's party,
 * direction and category stay as they were, so «إلغاء» restores them exactly
 * (R-p2-1-S1). The hidden input posts "" meanwhile.
 */
import { useState } from "react";

import { Select, type SelectGroup } from "@/components/Select";
import { Toast } from "@/components/Toast";
import { PartyQuickAdd } from "@/features/parties/components/PartyQuickAdd";
import { NEW_PARTY, postedPartyId, shownPartyChoice } from "@/features/parties/components/quickPartyList";
import type { PartyOption } from "@/features/parties/queries";
import { t } from "@/i18n/ar";
import { PartyTypeEnum, type DirectionValue } from "@/lib/validation";

import { DEFAULT_DIRECTION } from "./PlanBits";

type Choice = { partyId: string; direction: DirectionValue | ""; categoryId: string };

/**
 * Choosing a party presets the direction from its type (عميل → وارد,
 * مورد/موظف → صادر, أخرى → none) and keeps the category only when the
 * direction did not change. The sentinel changes nothing but the choice itself,
 * so cancelling the box leaves the form as it was. Looks the party up in the
 * list it is given — the forms pass their client-state list (S6).
 */
export function applyPartyChoice<V extends Choice>(old: V, id: string, list: PartyOption[]): V {
  if (id === NEW_PARTY) return { ...old, partyId: id };
  const next = list.find((p) => p.id === id);
  const direction = next ? DEFAULT_DIRECTION[next.type] : "";
  return { ...old, partyId: id, direction, categoryId: direction === old.direction ? old.categoryId : "" };
}

export function PlanPartySelect({
  parties,
  value,
  ownPartyId,
  locked,
  manageParties = false,
  error,
  onChoose,
  onAdded,
}: {
  /** The form's client-state list. */
  parties: PartyOption[];
  value: string;
  /** On edit, the plan's own party: kept listed as «(موقوف)» even if deactivated. */
  ownPartyId: string;
  locked: boolean;
  /** Owner pages only (D23): offers «+ جهة جديدة». */
  manageParties?: boolean;
  error?: string;
  onChoose: (id: string) => void;
  onAdded: (row: PartyOption) => void;
}) {
  const groups: SelectGroup[] = PartyTypeEnum.options.map((type) => ({
    label: t.partyType[type],
    options: parties
      .filter((p) => p.type === type && (p.active || p.id === ownPartyId))
      .map((p) => ({ value: p.id, label: p.active ? p.name : `${p.name} (${t.status.DISABLED})` })),
  }));
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const quickAdd = manageParties && !locked;
  const shown = shownPartyChoice(value, adding);

  return (
    <div className="flex flex-col gap-2">
      <Select
        label={t.plans.party}
        id="partyId"
        options={[]}
        groups={groups}
        trailing={quickAdd ? [{ value: NEW_PARTY, label: t.partyQuick.add }] : []}
        placeholder={t.parties.choose}
        value={shown}
        onChange={(e) => (e.target.value === NEW_PARTY ? setAdding(true) : (setAdding(false), onChoose(e.target.value)))}
        disabled={locked}
        required
        error={error}
      />
      <input type="hidden" name="partyId" value={postedPartyId(shown)} />
      {quickAdd ? (
        <PartyQuickAdd
          open={shown === NEW_PARTY}
          onAdded={(row) => {
            setAdding(false);
            setToast(t.partyQuick.added);
            onAdded(row);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : null}
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

export default PlanPartySelect;
