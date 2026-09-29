"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { Toast } from "@/components/Toast";
import { t } from "@/i18n/ar";
import type { DirectionValue } from "@/lib/validation";

import { validateEntry } from "./validateEntry";

import { AmountField } from "./AmountField";
import { DirectionToggle, readLastDirection, rememberDirection } from "./DirectionToggle";
import { LinkFields } from "./LinkFields";
import { LockedNotice } from "./LockedNotice";
import type { TransactionRow } from "./data";
import type { CategoryRow } from "@/features/settings/queries";
import type { PartyOption } from "@/features/parties/queries";
import type { ProjectOption } from "@/features/projects/queries";
import type { TransactionFormAction, TransactionState } from "./actions";

const METHODS = ["CASH", "BANK_TRANSFER", "MADA", "STC_PAY", "OTHER"] as const;

const monthOf = (iso: string) => iso.slice(0, 7);

export function TransactionForm({
  mode,
  action,
  categories,
  parties,
  projects,
  lockedMonths,
  today,
  doneHref,
  initial,
  presetProjectId,
}: {
  mode: "new" | "edit";
  action: TransactionFormAction;
  categories: CategoryRow[];
  parties: PartyOption[];
  projects: ProjectOption[];
  /** "YYYY-MM" keys of closed months. */
  lockedMonths: string[];
  /** Riyadh "today", decided on the server so both sides agree. */
  today: string;
  doneHref: string;
  initial?: TransactionRow;
  /**
   * New entry from an إضافة's «تسجيل تكلفة» (?projectId=, already checked
   * against the options by the page): preselects it and صادر.
   */
  presetProjectId?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [direction, setDirection] = useState<DirectionValue>(
    initial?.direction ?? "OUT",
  );
  // Remounts LinkFields after «حفظ وإضافة أخرى», clearing the party.
  const [linkKey, setLinkKey] = useState(0);
  const [date, setDate] = useState(initial?.date ?? today);
  const [amount, setAmount] = useState(
    initial ? (initial.amountHalalas / 100).toFixed(2) : "",
  );
  // Controlled, not defaultValue: when the direction flips, the option list is
  // replaced and an uncontrolled select can keep a stale DOM value — including a
  // retired category, which the server would then reject as a direction
  // mismatch. Clearing it on every switch makes that unreachable.
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [saved, setSaved] = useState(false);

  // localStorage is read after mount only: it does not exist during the server
  // render, and seeding state from it would be a hydration mismatch.
  // Never over a preset: «تسجيل تكلفة» means صادر (v1.2a S6).
  useEffect(() => {
    if (mode === "new" && !presetProjectId) setDirection(readLastDirection());
  }, [mode, presetProjectId]);

  const [state, formAction, pending] = useActionState(
    async (prev: TransactionState, formData: FormData): Promise<TransactionState> => {
      const problem = validateEntry(formData);
      if (problem) return problem;

      // Deliberately no try/catch around this call. A server action that
      // redirects does so by *throwing*, so catching here would swallow the
      // navigation and leave the user on the form with no error shown. These
      // three actions return rather than redirect (confirmed with `backend`),
      // but the rule has to hold for whichever one changes its mind later.
      const result = await action(prev, formData);
      if (!result.ok) return result;

      // `intent` exists for this line alone: useActionState hands the reducer
      // (prevState, formData) and no submitter, so a named submit button is the
      // only way to tell the two buttons apart. The server never reads it —
      // TransactionInputSchema strips it.
      if (formData.get("intent") === "saveAndAdd") {
        formRef.current?.reset();
        setAmount("");
        setDate(today);
        setCategoryId("");
        setLinkKey((k) => k + 1);
        setSaved(true);
      } else {
        router.push(doneHref);
      }
      return result;
    },
    null,
  );

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  const dateLocked = lockedMonths.includes(monthOf(date));
  // On edit both months must be open: moving an entry *out* of a closed month is
  // refused too, so a locked original cannot be rescued by changing the date.
  const originalLocked = initial ? lockedMonths.includes(monthOf(initial.date)) : false;
  const blocked = dateLocked || originalLocked;

  // Active categories of the chosen direction — plus the entry's own category
  // even if it has since been deactivated. Without that exception, editing an
  // old entry would drop its category from the select and silently reassign it.
  const options = categories
    .filter(
      (c) =>
        c.type === direction && (c.active || c.id === initial?.categoryId),
    )
    // A retired category is labelled as such, so the owner understands why it is
    // offered here and nowhere else. It is kept, never newly assigned.
    .map((c) => ({
      value: c.id,
      label: c.active ? c.nameAr : `${c.nameAr} (${t.status.DISABLED})`,
    }));

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      {blocked ? <LockedNotice /> : null}

      <DirectionToggle
        value={direction}
        disabled={originalLocked}
        onChange={(next) => {
          setDirection(next);
          rememberDirection(next);
          // Categories are per-direction, so the old choice cannot survive.
          setCategoryId("");
        }}
      />

      <AmountField
        value={amount}
        onChange={setAmount}
        error={fieldErrors?.amountHalalas}
        disabled={originalLocked}
      />

      <Input
        label={t.transaction.date}
        name="date"
        type="date"
        value={date}
        max={today}
        onChange={(event) => setDate(event.target.value)}
        disabled={originalLocked}
        required
        error={fieldErrors?.date}
      />

      <Select
        label={t.transaction.category}
        name="categoryId"
        options={options}
        placeholder={t.transaction.chooseCategory}
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        disabled={originalLocked}
        required
        error={fieldErrors?.categoryId}
      />

      <LinkFields
        key={linkKey}
        parties={parties}
        projects={projects}
        initial={{
          partyId: initial?.partyId ?? null,
          counterparty: initial?.counterparty ?? null,
          projectId: initial?.projectId ?? presetProjectId ?? null,
        }}
        disabled={originalLocked}
        fieldErrors={fieldErrors}
      />

      <Select
        label={t.paymentMethod.label}
        name="paymentMethod"
        options={METHODS.map((m) => ({ value: m, label: t.paymentMethod[m] }))}
        defaultValue={initial?.paymentMethod ?? "CASH"}
        disabled={originalLocked}
        required
        error={fieldErrors?.paymentMethod}
      />

      <Textarea
        label={`${t.transaction.note} (${t.common.optional})`}
        name="note"
        defaultValue={initial?.note ?? ""}
        maxLength={500}
        disabled={originalLocked}
        error={fieldErrors?.note}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" pending={pending} disabled={blocked}>
          {t.common.save}
        </Button>
        {mode === "new" ? (
          <Button
            type="submit"
            name="intent"
            value="saveAndAdd"
            variant="secondary"
            pending={pending}
            disabled={blocked}
          >
            {t.common.saveAndAddAnother}
          </Button>
        ) : null}
      </div>

      <FormToast state={state} />
      {saved ? (
        <Toast
          message={t.common.saved}
          tone="success"
          onDismiss={() => setSaved(false)}
        />
      ) : null}
    </form>
  );
}

export default TransactionForm;
