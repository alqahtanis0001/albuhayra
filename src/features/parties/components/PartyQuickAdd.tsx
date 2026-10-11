"use client";

/**
 * v1.4 part 2 (D23, D27 S1/S5): the inline «+ جهة جديدة» box under a party
 * select — الاسم and النوع (عميل / مورد / أخرى, never موظف), «حفظ» / «إلغاء».
 * Owner pages only: the select offers the sentinel option that opens this box
 * only when the page passes `manageParties`; that is presentation —
 * `requireOwner()` inside `createParty` is the control.
 *
 * Save calls the existing `createParty(null, formData)` — same server
 * validation, same audit, the same `err.partyDuplicate` refusal, shown under
 * the box. On success the parent receives a `PartyOption` to upsert and select.
 *
 * Not a nested <form> (invalid inside the entry form): every control is a
 * `type="button"`, the inputs carry no `name` (so they never reach the form's
 * FormData — which is also why the type is a nameless `Select`, not radios),
 * and Enter in the name input saves the party instead of submitting the form.
 * The success toast is the caller's (`onAdded`): rendered here it would sit
 * inside the entry form's collapsible panel and vanish with it (R-p2-1 N).
 */
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { errorMessage, t } from "@/i18n/ar";
import { createParty } from "@/features/parties/actions";
import type { PartyOption } from "@/features/parties/queries";
import { swallowEnter } from "@/features/transactions/components/categoryList";
import { PartyInputSchema } from "@/lib/validation";

import { QUICK_PARTY_TYPES, addedParty, quickPartyForm, type QuickPartyType } from "./quickPartyList";

export function PartyQuickAdd({
  open,
  onAdded,
  onCancel,
}: {
  /** The select's sentinel is chosen. */
  open: boolean;
  /** The row to upsert and select; the caller also shows `t.partyQuick.added`. */
  onAdded: (row: PartyOption) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<QuickPartyType>("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    // The party page's zod rule for the name, client-side first; the server re-validates.
    const parsed = PartyInputSchema.shape.name.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "err.invalidInput");
      return;
    }
    start(async () => {
      const result = await createParty(null, quickPartyForm(parsed.data, type));
      if (!result.ok) {
        setError(result.fieldErrors?.name ?? result.error);
        return;
      }
      setName("");
      setError(null);
      onAdded(addedParty(result.data.id, parsed.data, type));
    });
  };

  const cancel = () => {
    setName("");
    setError(null);
    onCancel();
  };

  if (!open) return null;
  return (
    <PartyAddBox
      name={name}
      type={type}
      error={error}
      pending={pending}
      onName={setName}
      onType={setType}
      onSave={save}
      onCancel={cancel}
    />
  );
}

/**
 * The box itself. A plain labelled <input> rather than the shared `Input`,
 * which requires a `name`. Exported so it can be rendered on its own in tests.
 */
export function PartyAddBox({
  name,
  type,
  error,
  pending,
  onName,
  onType,
  onSave,
  onCancel,
}: {
  name: string;
  type: QuickPartyType;
  /** An `err.*` key, shown under the box. */
  error: string | null;
  pending: boolean;
  onName: (value: string) => void;
  onType: (value: QuickPartyType) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const errorId = error ? `${uid}-error` : undefined;
  return (
    <div className="no-print flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className="text-sm font-medium text-gray-700">
            {t.partyQuick.name}
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            maxLength={80}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            onChange={(event) => onName(event.target.value)}
            onKeyDown={(event) => swallowEnter(event, onSave)}
            className={`min-h-11 w-full rounded-lg border bg-white px-3 text-base text-gray-900 ${error ? "border-money-out" : "border-gray-300"}`}
          />
        </div>
        <Select
          label={t.partyQuick.type}
          id={`${uid}-type`}
          options={QUICK_PARTY_TYPES.map((value) => ({ value, label: t.partyType[value] }))}
          value={type}
          onChange={(event) => onType(event.target.value as QuickPartyType)}
          disabled={pending}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" pending={pending} onClick={onSave}>
          {t.common.save}
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-money-out">
          {errorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}

export default PartyQuickAdd;
