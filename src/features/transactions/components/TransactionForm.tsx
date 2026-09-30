"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { Toast } from "@/components/Toast";
import { errorMessage, t } from "@/i18n/ar";
import type { DirectionValue } from "@/lib/validation";

import { AmountField } from "./AmountField";
import { categoryOptions } from "./categoryOptions";
import { DirectionToggle, readLastDirection, rememberDirection } from "./DirectionToggle";
import { LinkFields } from "./LinkFields";
import { LockedNotice } from "./LockedNotice";
import type { TransactionRow } from "./data";
import type { CategoryRow } from "@/features/settings/queries";
import type { PartyOption } from "@/features/parties/queries";
import type { ProjectOption } from "@/features/projects/queries";
import type { TransactionFormAction, TransactionState } from "./actions";
import { validateEntry } from "./validateEntry";

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
  payment,
  banner,
  notice,
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
  /**
   * Payment mode (v1.2a CP2): a new payment on an instalment or an edit of a
   * linked one. Direction and party are the plan's — no toggle, no party
   * select; `banner` (PaymentBanner, server-rendered) shows them and posts
   * them as hidden fields. New payments prefill amount and category.
   */
  payment?: { direction: DirectionValue; amountHalalas?: number; categoryId?: string };
  banner?: ReactNode;
  /** An err.* key to toast on arrival (an unusable ?instalmentId=). */
  notice?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [direction, setDirection] = useState<DirectionValue>(payment?.direction ?? initial?.direction ?? "OUT");
  // Remounts LinkFields after «حفظ وإضافة أخرى», clearing the party.
  const [linkKey, setLinkKey] = useState(0);
  const [date, setDate] = useState(initial?.date ?? today);
  const startAmount = initial?.amountHalalas ?? payment?.amountHalalas;
  const [amount, setAmount] = useState(
    startAmount === undefined ? "" : (startAmount / 100).toFixed(2),
  );
  // Controlled, not defaultValue: when the direction flips, the option list is
  // replaced and an uncontrolled select can keep a stale DOM value — including a
  // retired category, which the server would then reject as a direction
  // mismatch. Clearing it on every switch makes that unreachable.
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? payment?.categoryId ?? "");
  const [saved, setSaved] = useState(false);
  const [noticeShown, setNoticeShown] = useState(Boolean(notice));

  // localStorage is read after mount only: it does not exist during the server
  // render, and seeding state from it would be a hydration mismatch.
  // Never over a preset: «تسجيل تكلفة» means صادر (S6), a payment is the plan's (W3d).
  const preset = Boolean(presetProjectId || payment);
  useEffect(() => {
    if (mode === "new" && !preset) setDirection(readLastDirection());
  }, [mode, preset]);

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
  const linkError = payment && (fieldErrors?.instalmentId ?? fieldErrors?.partyId ?? fieldErrors?.direction);

  const dateLocked = lockedMonths.includes(monthOf(date));
  // On edit both months must be open: moving an entry *out* of a closed month is
  // refused too, so a locked original cannot be rescued by changing the date.
  const originalLocked = initial ? lockedMonths.includes(monthOf(initial.date)) : false;
  const blocked = dateLocked || originalLocked;

  const options = categoryOptions(categories, direction, initial?.categoryId);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      {blocked ? <LockedNotice /> : null}
      {banner}
      {/* The banner's hidden fields have no input to show their error under. */}
      {linkError ? <p role="alert" className="text-sm font-medium text-money-out">{errorMessage(linkError)}</p> : null}

      {payment ? null : (
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
      )}

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
        lockParty={Boolean(payment)}
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
        {mode === "new" && !payment ? (
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
      {noticeShown && notice ? (
        <Toast message={errorMessage(notice)} onDismiss={() => setNoticeShown(false)} />
      ) : null}
      {saved ? <Toast message={t.common.saved} tone="success" onDismiss={() => setSaved(false)} /> : null}
    </form>
  );
}

export default TransactionForm;
