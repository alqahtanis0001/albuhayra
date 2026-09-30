"use client";

/**
 * Add / edit an agreement (docs/FRONTEND.md, plans new/edit; W4). Choosing a
 * party presets the direction from its type (عميل → وارد, مورد/موظف → صادر,
 * أخرى → none), always changeable — until any instalment is fixed, when party
 * and direction lock (`err.planPartyLocked`) and travel as hidden fields. The
 * plan's own party and category stay offered even if since deactivated,
 * labelled, as on the entry form. حفظ stays disabled until the schedule's rows
 * add up to the total; they are posted as one JSON `instalments` field.
 */
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { Select, type SelectGroup } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import type { PartyOption } from "@/features/parties/queries";
import type { CategoryRow } from "@/features/settings/queries";
import { AmountField } from "@/features/transactions/components/AmountField";
import { t } from "@/i18n/ar";
import { parseSAR } from "@/lib/money";
import {
  PartyTypeEnum,
  PlanInputSchema,
  invalid,
  type ActionResult,
  type DirectionValue,
} from "@/lib/validation";

import { DEFAULT_DIRECTION } from "./PlanBits";
import { PlanDirectionCards } from "./PlanDirectionCards";
import { ScheduleBuilder } from "./ScheduleBuilder";
import { draftToRows, type DraftRow } from "./scheduleDraft";

type Result = ActionResult<{ id: string }> | ActionResult<null>;
export type PlanFormAction = (prev: Result | null, formData: FormData) => Promise<Result>;

export type PlanFormInitial = {
  partyId: string;
  direction: DirectionValue | "";
  title: string;
  /** SAR text. */
  total: string;
  categoryId: string;
  startDate: string;
  reminderDays: string;
  notes: string;
  rows: DraftRow[];
};

export function PlanForm({
  action,
  initial,
  parties,
  categories,
  planId,
}: {
  action: PlanFormAction;
  initial: PlanFormInitial;
  parties: PartyOption[];
  categories: CategoryRow[];
  /** Edit: the plan's id (bound into the action by the page) and where حفظ returns. */
  planId?: string;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const set = <K extends keyof PlanFormInitial>(key: K, value: PlanFormInitial[K]) =>
    setV((old) => ({ ...old, [key]: value }));

  // Any fixed row locks party and direction, and switches off equal mode (W4).
  const locked = initial.rows.some((r) => r.fixed);
  const own = { partyId: planId ? initial.partyId : "", categoryId: planId ? initial.categoryId : "" };

  const totalHalalas = parseSAR(v.total);
  const rows = draftToRows(v.rows, totalHalalas, v.startDate);
  const party = parties.find((p) => p.id === v.partyId);

  const [state, formAction, pending] = useActionState(
    async (prev: Result | null, formData: FormData): Promise<Result | null> => {
      const raw = Object.fromEntries(formData);
      const parsed = PlanInputSchema.safeParse({
        ...raw,
        instalments: JSON.parse(String(raw.instalments || "[]")),
      });
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

  const partyGroups: SelectGroup[] = PartyTypeEnum.options.map((type) => ({
    label: t.partyType[type],
    options: parties
      .filter((p) => p.type === type && (p.active || p.id === own.partyId))
      .map((p) => ({ value: p.id, label: p.active ? p.name : `${p.name} (${t.status.DISABLED})` })),
  }));
  const categoryOptions = categories
    .filter((c) => c.type === v.direction && (c.active || c.id === own.categoryId))
    .map((c) => ({ value: c.id, label: c.active ? c.nameAr : `${c.nameAr} (${t.status.DISABLED})` }));

  function chooseParty(id: string) {
    const next = parties.find((p) => p.id === id);
    const direction = next ? DEFAULT_DIRECTION[next.type] : "";
    setV((old) => ({
      ...old,
      partyId: id,
      direction,
      categoryId: direction === old.direction ? old.categoryId : "",
    }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {locked ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {t.plans.paidRowsNotice}
        </p>
      ) : null}

      <Select
        label={t.plans.party}
        name={locked ? undefined : "partyId"}
        id="partyId"
        options={[]}
        groups={partyGroups}
        placeholder={t.parties.choose}
        value={v.partyId}
        onChange={(e) => chooseParty(e.target.value)}
        disabled={locked}
        required
        error={fieldErrors?.partyId}
      />
      {locked ? <input type="hidden" name="partyId" value={v.partyId} /> : null}

      <PlanDirectionCards
        value={v.direction}
        partyName={party?.name}
        locked={locked}
        error={fieldErrors?.direction}
        onChange={(d) => setV((old) => ({ ...old, direction: d, categoryId: "" }))}
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

      <AmountField
        id="total"
        name="totalHalalas"
        label={t.plans.total}
        value={v.total}
        onChange={(next) => set("total", next)}
        error={fieldErrors?.totalHalalas}
      />

      <Select
        label={t.plans.category}
        name="categoryId"
        options={categoryOptions}
        placeholder={t.transaction.chooseCategory}
        value={v.categoryId}
        onChange={(e) => set("categoryId", e.target.value)}
        hint={t.plans.categoryHelp}
        required
        error={fieldErrors?.categoryId}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t.plans.startDate}
          name="startDate"
          type="date"
          value={v.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          required
          error={fieldErrors?.startDate}
        />
        <Input
          label={t.plans.reminderDays}
          name="reminderDays"
          type="number"
          inputMode="numeric"
          dir="ltr"
          min={0}
          max={60}
          value={v.reminderDays}
          onChange={(e) => set("reminderDays", e.target.value)}
          hint={t.plans.reminderHelp}
          error={fieldErrors?.reminderDays}
        />
      </div>

      <Textarea
        label={`${t.plans.notes} (${t.common.optional})`}
        name="notes"
        value={v.notes}
        onChange={(e) => set("notes", e.target.value)}
        maxLength={500}
        error={fieldErrors?.notes}
      />

      <ScheduleBuilder
        totalHalalas={totalHalalas}
        startDate={v.startDate}
        rows={v.rows}
        onRows={(next) => set("rows", next)}
        equalDisabled={locked}
        error={fieldErrors?.instalments}
      />
      <input type="hidden" name="instalments" value={rows ? JSON.stringify(rows) : ""} />

      <div>
        <Button type="submit" pending={pending} disabled={rows === null}>
          {t.common.save}
        </Button>
      </div>

      <FormToast state={state} />
    </form>
  );
}

export default PlanForm;
