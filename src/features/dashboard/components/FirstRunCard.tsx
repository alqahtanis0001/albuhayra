"use client";

/**
 * «ابدأ هنا» (docs/V14-SPEC.md D25): the owner home's first-run checklist,
 * between the quick actions and the money cards. Four steps in the spec's
 * order; a done step is a tick with sr «تم», an untried one links to its «+»
 * page. Gone for good once all four are done, and gone on this device once the
 * owner taps «إخفاء» — that choice is read from `localStorage` **after mount**,
 * so the server renders the card `hidden` and a dismissed card never flashes
 * (an un-dismissed one appears after hydration — accepted, like the nav's
 * remembered groups). No animation: nothing to reduce. `no-print`.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CheckIcon, ChevronEndIcon } from "@/components/icons";
import { fillText } from "@/features/dashboard/visuals";
import { t } from "@/i18n/ar";

import {
  firstRunSteps,
  readFirstRunHidden,
  rememberFirstRunHidden,
  shouldShowFirstRun,
  type FirstRunFlags,
} from "./firstRun";

/** `mounting`: the server render and the first client paint, before storage is read. */
export type FirstRunPhase = "mounting" | "shown";

const ROW = "flex min-h-11 items-center gap-3 px-4 text-sm";

/** The card itself, with no state of its own — the render tests drive it directly. */
export function FirstRunCardView({
  firstRun,
  phase,
  onHide,
}: {
  firstRun: FirstRunFlags;
  phase: FirstRunPhase;
  onHide: () => void;
}) {
  const steps = firstRunSteps(firstRun);
  const done = steps.filter((s) => s.done).length;

  return (
    <Card
      title={t.firstRun.title}
      className={phase === "mounting" ? "no-print hidden" : "no-print"}
      bodyClassName=""
      action={
        <Button type="button" variant="secondary" size="sm" onClick={onHide}>
          {t.firstRun.hide}
        </Button>
      }
    >
      <div className="flex flex-col gap-1 border-b border-gray-200 px-4 py-3 text-sm">
        <p className="text-gray-700">{t.firstRun.hint}</p>
        <p className="text-xs text-gray-600">{fillText(t.firstRun.progress, { done: String(done) })}</p>
      </div>
      <ol className="flex flex-col divide-y divide-gray-200">
        {steps.map((step) =>
          step.done ? (
            <li key={step.key} className={`${ROW} text-gray-600`}>
              <CheckIcon size={18} className="shrink-0 text-money-in" />
              <span>{step.label}</span>
              <span className="sr-only">{t.firstRun.done}</span>
            </li>
          ) : (
            <li key={step.key}>
              <Link
                href={step.href}
                className={`${ROW} justify-between rounded-lg text-gray-900 hover:bg-gray-200/60`}
              >
                <span>{step.label}</span>
                <ChevronEndIcon size={18} className="shrink-0 text-gray-600" />
              </Link>
            </li>
          ),
        )}
      </ol>
    </Card>
  );
}

export function FirstRunCard({ firstRun }: { firstRun: FirstRunFlags }) {
  // `null` until mounted: the server cannot read localStorage, so it renders `hidden`.
  const [hidden, setHidden] = useState<boolean | null>(null);

  useEffect(() => {
    setHidden(readFirstRunHidden());
  }, []);

  if (!shouldShowFirstRun(firstRun, hidden === true)) return null;

  function hide() {
    rememberFirstRunHidden();
    setHidden(true);
  }

  return <FirstRunCardView firstRun={firstRun} phase={hidden === null ? "mounting" : "shown"} onHide={hide} />;
}

export default FirstRunCard;
