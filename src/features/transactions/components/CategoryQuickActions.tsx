"use client";

/**
 * v1.4 A2–A4: the two text links under the entry form's category select —
 * «+ إضافة تصنيف» (an inline one-line box) and «تعديل التصنيفات» (edit mode,
 * `CategoryChips`). Owner pages only: the page passes `manageCategories` to
 * TransactionForm and staff pages pass nothing, so a staff render never mounts
 * this. That is presentation; `requireOwner()` inside the category actions is
 * the control.
 *
 * Not a nested <form> (invalid inside the entry form): every control is a
 * `type="button"` calling the bound server actions, the name input has no
 * `name` so it never reaches the entry's FormData, and Enter in it saves the
 * category instead of submitting the entry (K6).
 */
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";
import { errorMessage, t } from "@/i18n/ar";
import { createCategory } from "@/features/settings/actions";
import type { CategoryRow } from "@/features/settings/queries";
import { CategoryInputSchema, invalid, type DirectionValue } from "@/lib/validation";

import { CategoryChips } from "./CategoryChips";
import { applyAdded, applyHidden, applyShown, quickCreateForm, swallowEnter } from "./categoryList";

type Mode = "idle" | "add" | "edit";

const LINK = "inline-flex min-h-11 items-center text-sm font-medium text-accent-dark underline-offset-2 hover:underline";

export function CategoryQuickActions({
  direction,
  categories,
  selected,
  keepId,
  onCategories,
  onSelect,
}: {
  /** The form's current direction (its state, not the DOM): new categories take it. */
  direction: DirectionValue;
  /** The whole list, both directions, active and hidden — the form's client state. */
  categories: CategoryRow[];
  /** The select's current value. */
  selected: string;
  /** On edit, the entry's own category: kept listed as «(موقوف)» even once hidden (K4). */
  keepId?: string;
  onCategories: (categories: CategoryRow[]) => void;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    // The settings page's zod rules, client-side first; the server re-validates.
    const parsed = CategoryInputSchema.safeParse({ nameAr: name, type: direction });
    if (!parsed.success) {
      setError(invalid(parsed.error).fieldErrors.nameAr ?? "err.invalidInput");
      return;
    }
    start(async () => {
      const result = await createCategory(null, quickCreateForm(parsed.data.nameAr, direction));
      if (!result.ok) {
        setError(result.fieldErrors?.nameAr ?? result.error);
        return;
      }
      // Whatever its origin — inserted or revived — the returned row is what joins the list.
      const change = applyAdded(categories, result.data);
      onCategories(change.categories);
      onSelect(change.selected);
      setName("");
      setError(null);
      setMode("idle");
      setToast(t.categoryQuick.added);
    });
  };

  const cancel = () => {
    setName("");
    setError(null);
    setMode("idle");
  };

  return (
    <div className="no-print flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          aria-expanded={mode === "add"}
          onClick={() => setMode(mode === "add" ? "idle" : "add")}
          className={LINK}
        >
          {t.categoryQuick.add}
        </button>
        <button
          type="button"
          aria-expanded={mode === "edit"}
          onClick={() => setMode(mode === "edit" ? "idle" : "edit")}
          className={LINK}
        >
          {t.categoryQuick.edit}
        </button>
      </div>

      {mode === "add" ? (
        <CategoryAddBox
          name={name}
          error={error}
          pending={pending}
          onName={setName}
          onSave={save}
          onCancel={cancel}
        />
      ) : null}

      {mode === "edit" ? (
        <CategoryChips
          categories={categories}
          direction={direction}
          onHidden={(id) => {
            const change = applyHidden(categories, id, selected, direction, keepId);
            onCategories(change.categories);
            onSelect(change.selected);
            setToast(t.categoryQuick.hidden);
          }}
          onShown={(id) => onCategories(applyShown(categories, id))}
          onDone={() => setMode("idle")}
        />
      ) : null}

      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

const NAME_ID = "category-quick-name";

/**
 * A3's one-line box. A plain labelled <input> rather than the shared `Input`,
 * which requires a `name` — inside the entry form a named field would be posted
 * with the entry. Exported so it can be rendered on its own in tests.
 */
export function CategoryAddBox({
  name,
  error,
  pending,
  onName,
  onSave,
  onCancel,
}: {
  name: string;
  /** An `err.*` key, shown under the box. */
  error: string | null;
  pending: boolean;
  onName: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const errorId = error ? `${NAME_ID}-error` : undefined;
  return (
    <div className="no-print flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor={NAME_ID} className="text-sm font-medium text-gray-700">
          {t.categoryQuick.name}
        </label>
        <input
          id={NAME_ID}
          type="text"
          value={name}
          maxLength={60}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onName(event.target.value)}
          onKeyDown={(event) => swallowEnter(event, onSave)}
          className={`min-h-11 w-full rounded-lg border bg-white px-3 text-base text-gray-900 ${error ? "border-money-out" : "border-gray-300"}`}
        />
      </div>
      <Button size="sm" pending={pending} onClick={onSave}>
        {t.common.save}
      </Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={onCancel}>
        {t.common.cancel}
      </Button>
      {error ? (
        <p id={errorId} role="alert" className="basis-full text-xs font-medium text-money-out">
          {errorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}

export default CategoryQuickActions;
