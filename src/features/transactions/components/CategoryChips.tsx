"use client";

/**
 * v1.4 A4 + D17 c5: edit mode of the entry form's categories. The current
 * direction's active categories are chips that rock gently (`.v14-wiggle`,
 * static under reduced motion), each with a ✕ that asks before hiding; the
 * hidden ones follow as grey chips with «إظهار». Hiding and showing call the
 * existing `setCategoryActive` — `requireOwner()` inside it is the control.
 *
 * Nothing here submits the entry form: every control is `type="button"`, and
 * the ConfirmDialog is a <dialog>, not a <form>. A leaving chip fades for
 * `FADE_MS` and is then handed to the parent by a timer (K5) — never by
 * `animationend`, which does not fire under reduced motion; there it leaves at
 * once.
 */
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CloseIcon } from "@/components/icons";
import { useReducedMotion } from "@/components/useReducedMotion";
import { errorMessage, t } from "@/i18n/ar";
import { setCategoryActive } from "@/features/settings/actions";
import type { CategoryRow } from "@/features/settings/queries";
import type { DirectionValue } from "@/lib/validation";

import { activeOf, fillName, hiddenOf } from "./categoryList";

export const FADE_MS = 200;

const LAST_ACTIVE = "err.lastActiveCategory";

export function CategoryChips({
  categories,
  direction,
  onHidden,
  onShown,
  onDone,
}: {
  categories: CategoryRow[];
  direction: DirectionValue;
  /** The server has hidden this id (and the fade is over): take it out of the options. */
  onHidden: (id: string) => void;
  /** The server has shown this id again: put its option back. */
  onShown: (id: string) => void;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<CategoryRow | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; key: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const active = activeOf(categories, direction);
  const hidden = hiddenOf(categories, direction);
  // K7: the server refuses retiring a direction's last active category; the
  // control is disabled with that reason instead of letting the dialog fail.
  const lastActive = active.length === 1;

  const hide = (row: CategoryRow) =>
    start(async () => {
      setError(null);
      const result = await setCategoryActive(row.id, false);
      if (!result.ok) {
        setError({ id: row.id, key: result.error });
        return;
      }
      if (reduced) {
        onHidden(row.id);
        return;
      }
      setLeaving(row.id);
      timer.current = setTimeout(() => {
        setLeaving(null);
        onHidden(row.id);
      }, FADE_MS);
    });

  const show = (row: CategoryRow) =>
    start(async () => {
      setError(null);
      const result = await setCategoryActive(row.id, true);
      if (!result.ok) {
        // c5: a name an active category has reused since → err.categoryDuplicate, shown, not swallowed.
        setError({ id: row.id, key: result.error });
        return;
      }
      onShown(row.id);
    });

  const chipError = (id: string) =>
    error?.id === id ? (
      <p role="alert" className="mt-1 text-xs font-medium text-money-out">
        {errorMessage(error.key)}
      </p>
    ) : null;

  return (
    <div className="no-print flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <ul aria-label={t.categoryQuick.chipsLabel} className="flex flex-wrap gap-2">
        {active.map((row) => (
          <li key={row.id} className={`flex flex-col ${leaving === row.id ? "v14-fade-out" : "v14-wiggle"}`}>
            <span className="inline-flex items-center gap-1 rounded-full border border-accent-line bg-white ps-3 text-sm text-gray-900">
              {row.nameAr}
              <button
                type="button"
                aria-label={fillName(t.categoryQuick.hide, row.nameAr)}
                title={lastActive ? errorMessage(LAST_ACTIVE) : undefined}
                disabled={lastActive || pending}
                onClick={() => setTarget(row)}
                className="inline-flex size-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200 disabled:text-gray-400"
              >
                <CloseIcon size={16} />
              </button>
            </span>
            {lastActive ? <span className="sr-only">{errorMessage(LAST_ACTIVE)}</span> : null}
            {chipError(row.id)}
          </li>
        ))}
      </ul>

      {hidden.length > 0 ? (
        <ul aria-label={t.categoryQuick.hiddenChipsLabel} className="flex flex-wrap gap-2">
          {hidden.map((row) => (
            <li key={row.id} className="flex flex-col">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 ps-3 text-sm text-gray-600">
                {row.nameAr}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => show(row)}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-accent-dark hover:bg-gray-200 disabled:text-gray-400"
                >
                  {t.categoryQuick.show}
                </button>
              </span>
              {chipError(row.id)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onDone}>
          {t.categoryQuick.done}
        </Button>
        <Link
          href="/owner/settings/categories"
          className="inline-flex min-h-11 items-center text-sm font-medium text-accent-dark underline"
        >
          {t.categoryQuick.more}
        </Link>
      </div>

      {/* Rendered only while asked (one <dialog>, not one per chip). Hiding is reversible → accent. */}
      {target ? (
        <ConfirmDialog
          open
          title={fillName(t.categoryQuick.hide, target.nameAr)}
          message={fillName(t.categoryQuick.hideConfirm, target.nameAr)}
          tone="accent"
          pending={pending}
          onCancel={() => setTarget(null)}
          onConfirm={() => {
            const row = target;
            setTarget(null);
            hide(row);
          }}
        />
      ) : null}
    </div>
  );
}

export default CategoryChips;
