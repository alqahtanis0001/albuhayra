"use client";

/**
 * Reorder, rename and retire one category.
 *
 * The arrows are genuinely vertical, so they use ChevronUp/Down rather than a
 * rotated horizontal chevron — a rotated `ChevronStartIcon` points up in RTL and
 * down in LTR, which is a trap for whoever reads it next.
 *
 * The arrows are rendered **only for active rows**: `setCategoryOrder` refuses an
 * inactive category with `err.notFound`, so not offering the control keeps that
 * key unreachable rather than merely unlikely. The ends of each direction group
 * are disabled for the same reason — the server would refuse, so do not ask.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons";
import { errorMessage, t } from "@/i18n/ar";
import { setCategoryActive, setCategoryOrder } from "@/features/settings/actions";

export function CategoryRowActions({
  id,
  active,
  isFirst,
  isLast,
  isOnlyActive,
}: {
  id: string;
  active: boolean;
  isFirst: boolean;
  isLast: boolean;
  /** The last active category of its direction: deactivating it is refused. */
  isOnlyActive: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // `setCategoryActive` refuses retiring the last active category of a direction
  // with `err.lastActiveCategory`. Not offering it keeps that key unreachable,
  // the same standard as the reorder arrows.
  const blockedFromRetiring = active && isOnlyActive;

  const run = (call: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const result = await call();
      if (result.ok) router.refresh();
      else setError(result.error ?? "err.unexpected");
    });

  return (
    <>
      <div className="flex items-center gap-1">
        {active ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t.common.moveUp}
              disabled={isFirst || pending}
              onClick={() => run(() => setCategoryOrder(id, "UP"))}
            >
              <ChevronUpIcon size={18} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t.common.moveDown}
              disabled={isLast || pending}
              onClick={() => run(() => setCategoryOrder(id, "DOWN"))}
            >
              <ChevronDownIcon size={18} />
            </Button>
          </>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          pending={pending}
          disabled={blockedFromRetiring || pending}
          onClick={() => run(() => setCategoryActive(id, !active))}
        >
          {active ? t.common.disable : t.common.enable}
        </Button>
      </div>

      {/* Disabled *and* explained. The arrows need no note — first and last are
          self-evident — but "why can't I retire this one?" is not, and a dead
          control that says nothing is worse than an error. The sentence is the
          same one the server would return, resolved from its key. */}
      {blockedFromRetiring ? (
        <p className="text-xs text-gray-500">
          {errorMessage("err.lastActiveCategory")}
        </p>
      ) : null}

      {error ? (
        <Toast message={errorMessage(error)} onDismiss={() => setError(null)} />
      ) : null}
    </>
  );
}

export default CategoryRowActions;
