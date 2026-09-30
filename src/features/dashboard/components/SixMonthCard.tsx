"use client";

/**
 * v1.3 (docs/V13-SPEC.md item 5): the six-month card with two tabs —
 * «الوارد والصادر» (the existing bar chart) and «التدفق النقدي» (the
 * waterfall). A client tablist, not the link-based `Tabs` (lead ruling S2): a
 * link tab would navigate, show the skeleton again and replay the count-ups.
 * Styled like `Tabs`; ARIA tablist/tab/tabpanel with roving focus and arrow keys.
 */
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { t } from "@/i18n/ar";

import { CashFlowWaterfall } from "./CashFlowWaterfall";
import type { MonthTotals } from "./data";
import { SixMonthChart } from "./SixMonthChart";

const TABS = [
  { key: "bars", label: t.dashVisual.tabBars },
  { key: "waterfall", label: t.dashVisual.tabWaterfall },
] as const;

type Key = (typeof TABS)[number]["key"];

export function SixMonthCard({ months }: { months: MonthTotals[] }) {
  const id = useId();
  const [active, setActive] = useState<Key>("bars");
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  // The waterfall has something to show whenever any month opens or moves
  // money — an owner with only an opening balance still gets it.
  const hasFlow = months.some(
    (m) => m.inHalalas > 0 || m.outHalalas > 0 || m.openingBalanceHalalas !== 0,
  );

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1;
    let next: number | null = null;
    // RTL: the next tab sits to the left.
    if (e.key === "ArrowLeft") next = index === last ? 0 : index + 1;
    if (e.key === "ArrowRight") next = index === 0 ? last : index - 1;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(TABS[next]!.key);
    refs.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label={t.dashboard.last6Months} className="no-print flex gap-1 border-b border-gray-200 px-4">
        {TABS.map((tab, i) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={[
                "flex min-h-11 items-center rounded-t-lg border-b-2 px-3 text-sm font-medium",
                selected
                  ? "border-accent text-accent-dark"
                  : "border-transparent text-gray-600 hover:text-gray-900",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`${id}-panel-${tab.key}`}
          aria-labelledby={`${id}-tab-${tab.key}`}
          hidden={tab.key !== active}
        >
          {tab.key === "bars" ? (
            <SixMonthChart months={months} />
          ) : hasFlow ? (
            <CashFlowWaterfall months={months} />
          ) : (
            <p className="p-4 text-sm text-gray-500">{t.dashboard.emptyChart}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default SixMonthCard;
