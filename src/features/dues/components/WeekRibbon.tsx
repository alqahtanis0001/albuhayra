/**
 * v1.3 item 6 — the week ribbon above المستحقات: a leading red «متأخرة» tile,
 * then one tile per day from today to `weekEnd` (every day shown, «لا شيء» when
 * empty, today labelled «اليوم»), each with its count and لنا / علينا totals.
 * Rendered on the server from `getDues` (grouping in ../ribbon.ts); a tile
 * with rows is a button that `RibbonJump` wires to scroll to and highlight
 * them. Hidden in print — the lists below carry the same numbers.
 */
import type { ReactNode } from "react";

import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import { t } from "@/i18n/ar";
import { plural } from "@/lib/plural";

import { tileDate, weekdayAr, type RibbonDay, type RibbonTotals } from "../ribbon";
import { RibbonJump } from "./RibbonJump";

const RIBBON_ID = "dues-ribbon";

function Totals({ totals }: { totals: RibbonTotals }) {
  if (totals.count === 0) return <span className="text-xs text-gray-600">{t.duesRibbon.nothing}</span>;
  return (
    <>
      <span className="text-xs font-medium text-gray-900">{plural(t.duesRibbon.count, totals.count)}</span>
      {totals.inHalalas > 0 ? (
        <span className="text-xs text-gray-700">
          {t.duesRibbon.toUs}: <MoneyText halalas={totals.inHalalas} />
        </span>
      ) : null}
      {totals.outHalalas > 0 ? (
        <span className="text-xs text-gray-700">
          {t.duesRibbon.fromUs}: <MoneyText halalas={totals.outHalalas} />
        </span>
      ) : null}
    </>
  );
}

function Tile({
  jump,
  dateLabel,
  heading,
  totals,
  className,
}: {
  jump: string;
  dateLabel: string;
  heading: ReactNode;
  totals: RibbonTotals;
  className: string;
}) {
  const body = (
    <span id={`${RIBBON_ID}-${jump}`} className="flex flex-col items-start gap-1 text-start">
      {heading}
      <Totals totals={totals} />
    </span>
  );
  const shape = `flex h-full w-36 flex-col rounded-lg border bg-white p-2.5 ${className}`;
  if (totals.count === 0) return <div className={shape}>{body}</div>;
  return (
    <button
      type="button"
      data-jump={jump}
      aria-label={t.duesRibbon.jump.replace("{date}", dateLabel)}
      aria-describedby={`${RIBBON_ID}-${jump}`}
      className={`${shape} transition-colors duration-150 hover:bg-gray-50 motion-reduce:transition-none`}
    >
      {body}
    </button>
  );
}

export function WeekRibbon({ overdue, days }: { overdue: RibbonTotals; days: RibbonDay[] }) {
  return (
    <section id={RIBBON_ID} aria-label={t.duesRibbon.label} className="no-print">
      <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        <li className="shrink-0 snap-start">
          <Tile
            jump="overdue"
            dateLabel={t.duesRibbon.overdue}
            heading={<span className="text-sm font-semibold text-money-out">{t.duesRibbon.overdue}</span>}
            totals={overdue}
            className="border-money-out"
          />
        </li>
        {days.map((day) => (
          <li key={day.date} className="shrink-0 snap-start">
            <Tile
              jump={day.date}
              dateLabel={`${day.isToday ? t.duesRibbon.today : weekdayAr(day.date)} ${tileDate(day.date)}`}
              heading={
                <span className="flex flex-col">
                  <span className={`text-sm font-semibold ${day.isToday ? "text-accent-dark" : "text-gray-900"}`}>
                    {day.isToday ? t.duesRibbon.today : weekdayAr(day.date)}
                  </span>
                  <DateText date={day.date} compact className="text-xs text-gray-600" />
                </span>
              }
              totals={day}
              className={day.isToday ? "border-accent" : "border-gray-200"}
            />
          </li>
        ))}
      </ul>
      <RibbonJump ribbonId={RIBBON_ID} />
    </section>
  );
}

export default WeekRibbon;
