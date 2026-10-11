"use client";

/**
 * v1.4 C2 / C6 / D8 — add or edit an open-ended agreement: party, direction,
 * title, category, «تاريخ البداية» (default today, max today), the optional
 * total with its helper line, the optional expected end, notes. No schedule
 * builder. On edit, once any payment references the plan (`locked`), party,
 * direction, start date and category are disabled and travel as hidden fields
 * (the server re-checks: `err.planPartyLocked` / `err.paymentLinkFixed`). The
 * plan's own party and category stay offered even if since deactivated.
 * v1.4 part 2 (D23): the party block is `PlanPartySelect` (see PlanForm).
 */
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { DateField } from "@/components/DateField";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { applyAddedParty } from "@/features/parties/components/quickPartyList";
import type { PartyOption } from "@/features/parties/queries";
import type { CategoryRow } from "@/features/settings/queries";
import { AmountField } from "@/features/transactions/components/AmountField";
import { t } from "@/i18n/ar";
import { OpenPlanInputSchema, invalid, type ActionResult, type DirectionValue } from "@/lib/validation";

import { PlanDirectionCards } from "./PlanDirectionCards";
import { PlanPartySelect, applyPartyChoice } from "./PlanPartySelect";
import { NO_PREFILLS, applyPlanPrefill } from "./planPrefill";

type Result = ActionResult<{ id: string }> | ActionResult<null>;
export type OpenPlanFormAction = (prev: Result | null, formData: FormData) => Promise<Result>;

export type OpenPlanFormInitial = {
  partyId: string;
  direction: DirectionValue | "";
  title: string;
  /** SAR text; "" = no ceiling. */
  total: string;
  categoryId: string;
  startDate: string;
  expectedEndDate: string;
  notes: string;
};

export function OpenPlanForm({
  action,
  initial,
  parties,
  categories,
  today,
  planId,
  locked = false,
  manageParties = false,
}: {
  action: OpenPlanFormAction;
  initial: OpenPlanFormInitial;
  parties: PartyOption[];
  categories: CategoryRow[];
  /** The server's today (W8): the start date's default and ceiling. */
  today: string;
  /** Edit: the plan's id (bound into the action by the page) and where حفظ returns. */
  planId?: string;
  /** Edit: a payment exists — party, direction, start and category are fixed. */
  locked?: boolean;
  /** Owner pages only (D23): «+ جهة جديدة» in the party select. */
  manageParties?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [partyList, setPartyList] = useState(parties);
  const [prefills, setPrefills] = useState(NO_PREFILLS); // R8: what the form filled in itself, never the owner's text.
  const set = <K extends keyof OpenPlanFormInitial>(key: K, value: OpenPlanFormInitial[K]) =>
    setV((old) => ({ ...old, [key]: value }));
  const own = { partyId: planId ? initial.partyId : "", categoryId: planId ? initial.categoryId : "" };
  const party = partyList.find((p) => p.id === v.partyId);

  const [state, formAction, pending] = useActionState(
    async (prev: Result | null, formData: FormData): Promise<Result | null> => {
      const parsed = OpenPlanInputSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return invalid(parsed.error);
      const result = await action(prev, formData);
      if (result.ok) {
        const id = result.data?.id ?? planId;
        router.push(id ? `/owner/plans/${id}` : "/owner/plans");
      }
      return result;
    },
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  const categoryOptions = categories
    .filter((c) => c.type === v.direction && (c.active || c.id === own.categoryId))
    .map((c) => ({ value: c.id, label: c.active ? c.nameAr : `${c.nameAr} (${t.status.DISABLED})` }));

  // Looks the party up in the client-state list (S6); the new row is passed in before the state settles.
  // R8 (D32 S7): the prefills run on applyPartyChoice's result and on a direction change.
  const applyAll = (next: typeof v, partyName: string | undefined) => {
    const r = applyPlanPrefill(next, prefills, partyName, categories);
    setV(r.values);
    setPrefills(r.prefills);
  };
  const chooseParty = (id: string, list = partyList) =>
    applyAll(applyPartyChoice(v, id, list), list.find((p) => p.id === id)?.name);
  const addParty = (row: PartyOption) => {
    const list = applyAddedParty(partyList, row);
    setPartyList(list);
    chooseParty(row.id, list);
  };

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {locked ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{t.err.planPartyLocked}</p>
      ) : null}

      <PlanPartySelect
        parties={partyList}
        value={v.partyId}
        ownPartyId={own.partyId}
        locked={locked}
        manageParties={manageParties}
        error={fieldErrors?.partyId}
        onChoose={chooseParty}
        onAdded={addParty}
      />

      <PlanDirectionCards
        value={v.direction}
        partyName={party?.name}
        locked={locked}
        error={fieldErrors?.direction}
        onChange={(d) => applyAll({ ...v, direction: d, categoryId: "" }, undefined)}
      />
      {locked ? <input type="hidden" name="direction" value={v.direction} /> : null}

      <Input
        label={t.plans.titleField}
        name="title"
        value={v.title}
        onChange={(e) => set("title", e.target.value)}
        hint={t.plans.titleHelp}
        maxLength={80}
        required
        error={fieldErrors?.title}
      />

      <Select
        label={t.plans.category}
        name={locked ? undefined : "categoryId"}
        id="categoryId"
        options={categoryOptions}
        placeholder={t.transaction.chooseCategory}
        value={v.categoryId}
        onChange={(e) => set("categoryId", e.target.value)}
        hint={t.plans.categoryHelp}
        disabled={locked}
        required
        error={fieldErrors?.categoryId}
      />
      {locked ? <input type="hidden" name="categoryId" value={v.categoryId} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Disabled controls are not submitted; the hidden field below carries the value when locked. */}
        <DateField
          label={t.plans.startDate}
          name="startDate"
          max={today}
          value={v.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          disabled={locked}
          required
          error={fieldErrors?.startDate}
        />
        {locked ? <input type="hidden" name="startDate" value={v.startDate} /> : null}
        <DateField
          label={t.openPlan.expectedEnd}
          name="expectedEndDate"
          min={v.startDate || undefined}
          value={v.expectedEndDate}
          onChange={(e) => set("expectedEndDate", e.target.value)}
          error={fieldErrors?.expectedEndDate}
        />
      </div>

      <AmountField
        id="total"
        name="totalHalalas"
        label={t.openPlan.total}
        value={v.total}
        onChange={(next) => set("total", next)}
        required={false}
        hint={t.openPlan.totalHelp}
        error={fieldErrors?.totalHalalas}
      />

      <Textarea
        label={`${t.plans.notes} (${t.common.optional})`}
        name="notes"
        value={v.notes}
        onChange={(e) => set("notes", e.target.value)}
        maxLength={500}
        error={fieldErrors?.notes}
      />

      <div>
        <Button type="submit" pending={pending}>
          {t.common.save}
        </Button>
      </div>

      <FormToast state={state} />
    </form>
  );
}

export default OpenPlanForm;
