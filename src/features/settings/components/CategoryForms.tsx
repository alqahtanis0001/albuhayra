"use client";

/**
 * Add and rename. Both run `CategoryInputSchema` client-side first, and both
 * submit `type` — rename submits the category's **existing** type as a hidden
 * field, because `updateCategory` refuses a changed one with
 * `err.categoryDirectionMismatch`. A category's direction is structural: entries
 * already point at it and carry that direction, so it is shown as fixed text
 * rather than an editable select.
 */
import { useActionState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { t } from "@/i18n/ar";
import {
  CategoryInputSchema,
  invalid,
  type ActionResult,
  type DirectionValue,
} from "@/lib/validation";
import { createCategory } from "@/features/settings/actions";

type State = ActionResult<null> | null;

type BoundAction = (prev: State, formData: FormData) => Promise<ActionResult<null>>;

function check(formData: FormData): State {
  const parsed = CategoryInputSchema.safeParse(Object.fromEntries(formData));
  return parsed.success ? null : invalid(parsed.error);
}

export function AddCategoryForm({ type }: { type: DirectionValue }) {
  const [state, action, pending] = useActionState(
    async (prev: State, formData: FormData): Promise<State> =>
      check(formData) ?? createCategory(prev, formData),
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-wrap items-end gap-2 p-3" noValidate>
      <input type="hidden" name="type" value={type} />
      <div className="min-w-48 flex-1">
        <Input
          label={t.settings.categoryName}
          name="nameAr"
          id={`add-${type}`}
          maxLength={60}
          required
          error={fieldErrors?.nameAr}
        />
      </div>
      <Button type="submit" pending={pending}>
        {t.settings.addCategory}
      </Button>
      <FormToast state={state} />
    </form>
  );
}

export function RenameCategoryForm({
  action,
  id,
  type,
  currentName,
}: {
  action: BoundAction;
  id: string;
  type: DirectionValue;
  currentName: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData): Promise<State> =>
      check(formData) ?? action(prev, formData),
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2" noValidate>
      {/* The existing type, unchanged — see the note at the top of this file. */}
      <input type="hidden" name="type" value={type} />
      <div className="min-w-40 flex-1">
        <Input
          label={t.settings.renameCategory}
          name="nameAr"
          id={`rename-${id}`}
          defaultValue={currentName}
          maxLength={60}
          required
          error={fieldErrors?.nameAr}
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" pending={pending}>
        {t.common.save}
      </Button>
      <FormToast state={state} />
    </form>
  );
}
