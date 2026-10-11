"use client";

/**
 * v1.4 C3 — the inline «تسجيل دفعة» on an open agreement: amount, date
 * (default today, max today), method, note. Direction, party and category are
 * the plan's and are not fields here (the server inherits them, C3). On
 * success it returns to the detail with `?paid=<transactionId>` (and
 * `closed=1` when the payment completed the total), as v1.3 does for
 * instalments — the page announces it and highlights the row.
 *
 * Deliberately no client-side zod pass: the validation barrel would add the
 * whole schema bundle to the detail route (it is a server page with this one
 * small leaf); the action answers the same `fieldErrors`. `METHODS` mirrors
 * `PaymentMethodEnum.options` and is pinned to it by a test.
 */
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { recordOpenPlanPayment } from "@/features/transactions/actions";
import { AmountField } from "@/features/transactions/components/AmountField";
import { t } from "@/i18n/ar";
import type { ActionResult } from "@/lib/validation";

import { METHODS, recordedHref } from "./openPlanView";

type Result = ActionResult<{ transactionId: string; autoClosed: boolean }>;

export function OpenPaymentForm({ planId, today }: { planId: string; today: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<string>("CASH");
  const [note, setNote] = useState("");

  const [state, formAction, pending] = useActionState(
    async (prev: Result | null, formData: FormData): Promise<Result | null> => {
      const result = await recordOpenPlanPayment(planId, prev, formData);
      if (result.ok) {
        setAmount("");
        setNote("");
        router.push(recordedHref(planId, result.data.transactionId, result.data.autoClosed));
      }
      return result;
    },
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <AmountField id="payAmount" value={amount} onChange={setAmount} error={fieldErrors?.amountHalalas} />
        <Input
          label={t.transaction.date}
          name="date"
          id="payDate"
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          error={fieldErrors?.date}
        />
        <Select
          label={t.paymentMethod.label}
          name="paymentMethod"
          id="payMethod"
          options={METHODS.map((m) => ({ value: m, label: t.paymentMethod[m] }))}
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          required
          error={fieldErrors?.paymentMethod}
        />
        <Input
          label={`${t.transaction.note} (${t.common.optional})`}
          name="note"
          id="payNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          error={fieldErrors?.note}
        />
      </div>
      <div>
        <Button type="submit" pending={pending}>
          {t.plans.recordPayment}
        </Button>
      </div>
      <FormToast state={state} />
    </form>
  );
}

export default OpenPaymentForm;
