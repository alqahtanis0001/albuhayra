"use client";

/**
 * Add / edit a party (docs/FRONTEND.md, Parties). Every field has a helper line;
 * `PartyInputSchema` runs here first and again in the action. The fields are
 * controlled so a refused submit keeps what the owner typed (React resets
 * uncontrolled fields after a form action).
 */
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { errorMessage, t } from "@/i18n/ar";
import {
  PartyInputSchema,
  invalid,
  type ActionResult,
  type PartyTypeValue,
} from "@/lib/validation";

const TYPES: PartyTypeValue[] = ["CUSTOMER", "SUPPLIER", "EMPLOYEE", "OTHER"];

type Result = ActionResult<{ id: string }> | ActionResult<null>;
export type PartyFormAction = (prev: Result | null, formData: FormData) => Promise<Result>;

export type PartyFormValues = {
  name: string;
  type: PartyTypeValue;
  phone: string;
  email: string;
  notes: string;
};

export function PartyForm({
  action,
  initial,
  partyId,
}: {
  action: PartyFormAction;
  initial?: PartyFormValues;
  /** Edit: where to return. New: the created id comes back from the action. */
  partyId?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PartyFormValues>(
    initial ?? { name: "", type: "CUSTOMER", phone: "", email: "", notes: "" },
  );
  const set = (key: keyof PartyFormValues, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const [state, formAction, pending] = useActionState(
    async (prev: Result | null, formData: FormData): Promise<Result | null> => {
      const parsed = PartyInputSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return invalid(parsed.error);
      // No try/catch: see TransactionForm — a redirecting action throws.
      const result = await action(prev, formData);
      if (result.ok) {
        const id = result.data?.id ?? partyId;
        router.push(id ? `/owner/parties/${id}` : "/owner/parties");
      }
      return result;
    },
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4" noValidate>
      <Input
        label={t.parties.name}
        name="name"
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
        hint={t.parties.nameHelp}
        maxLength={80}
        required
        error={fieldErrors?.name}
      />

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-gray-700">
          {t.partyType.label}
          <span aria-hidden="true"> *</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPES.map((type) => {
            const checked = values.type === type;
            return (
              <label
                key={type}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium transition-[scale] duration-[80ms] ease-out active:scale-[0.97] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${
                  checked
                    ? "border-accent bg-accent-soft text-accent-dark"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={type}
                  checked={checked}
                  onChange={() => set("type", type)}
                  className="sr-only"
                />
                {t.partyType[type]}
              </label>
            );
          })}
        </div>
        {fieldErrors?.type ? (
          <p className="text-xs font-medium text-money-out">{errorMessage(fieldErrors.type)}</p>
        ) : null}
      </fieldset>

      <Input
        label={`${t.parties.phone} (${t.common.optional})`}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        dir="ltr"
        value={values.phone}
        onChange={(e) => set("phone", e.target.value)}
        hint={t.parties.phoneHelp}
        maxLength={25}
        error={fieldErrors?.phone}
      />

      <Input
        label={`${t.parties.email} (${t.common.optional})`}
        name="email"
        type="email"
        autoComplete="email"
        dir="ltr"
        value={values.email}
        onChange={(e) => set("email", e.target.value)}
        hint={t.parties.emailHelp}
        maxLength={254}
        error={fieldErrors?.email}
      />

      <Textarea
        label={`${t.parties.notes} (${t.common.optional})`}
        name="notes"
        value={values.notes}
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

export default PartyForm;
