/**
 * Pieces the إضافة screens share. Server components.
 *
 * The budget bar is decoration (aria-hidden): the text under
 * it always states the numbers — spent, budget, المتبقي or by how much the
 * budget is exceeded, and the percent — so nothing depends on reading a bar or
 * its colour. v1.3: the fill grows in on mount and turns gold at 80%, red over.
 */
import { Badge, type BadgeTone } from "@/components/Badge";
import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import { fillTemplate } from "@/components/fillTemplate";
import { PALETTE } from "@/components/visualPalette";
import { t } from "@/i18n/ar";
import type { ProjectStatusValue } from "@/lib/validation";

import { budgetFill, budgetPct, budgetTone, type BudgetTone } from "./budgetVisual";

/** v1.3 item 9: green < 80%, gold 80–100%, red over (./budgetVisual.ts). */
const TONE: Record<BudgetTone, string> = {
  green: PALETTE.green,
  gold: PALETTE.gold,
  red: PALETTE.out,
};

const STATUS_TONE: Record<ProjectStatusValue, BadgeTone> = {
  ACTIVE: "accent",
  COMPLETED: "neutral",
  CANCELLED: "warn",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatusValue }) {
  return <Badge tone={STATUS_TONE[status]}>{t.projectStatus[status]}</Badge>;
}

export function BudgetMeter({
  budgetHalalas,
  spentHalalas,
  remainingHalalas,
}: {
  budgetHalalas: number | null;
  spentHalalas: number;
  remainingHalalas: number | null;
}) {
  if (budgetHalalas === null || remainingHalalas === null) {
    return (
      <p className="text-sm text-gray-700">
        {t.projects.spent}: <MoneyText halalas={spentHalalas} />{" "}
        <span className="text-gray-600">({t.projects.noBudget})</span>
      </p>
    );
  }

  const over = remainingHalalas < 0;
  const tone = budgetTone(spentHalalas, budgetHalalas) ?? "green";
  const pct = budgetPct(spentHalalas, budgetHalalas);

  return (
    <div className="flex flex-col gap-1.5">
      <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="v13-grow-inline h-full rounded-full"
          style={{ width: `${budgetFill(spentHalalas, budgetHalalas)}%`, backgroundColor: TONE[tone] }}
        />
      </div>
      <p className="flex flex-wrap justify-between gap-x-3 text-xs text-gray-700">
        <span>
          {fillTemplate(t.budgetMeter.spent, { amount: <MoneyText halalas={spentHalalas} /> })}
        </span>
        <span>
          {fillTemplate(t.budgetMeter.budget, { amount: <MoneyText halalas={budgetHalalas} /> })}
        </span>
      </p>
      <p className={`flex flex-wrap justify-between gap-x-3 text-sm ${over ? "font-medium text-money-out" : "text-gray-700"}`}>
        <span>
          {fillTemplate(over ? t.budgetMeter.over : t.budgetMeter.remaining, {
            amount: <MoneyText halalas={Math.abs(remainingHalalas)} inheritColor={over} />,
          })}
        </span>
        {pct !== null ? (
          <span>
            {fillTemplate(t.budgetMeter.pct, {
              pct: <bdi dir="ltr" className="tabular-nums">{`${pct}%`}</bdi>,
            })}
          </span>
        ) : null}
      </p>
    </div>
  );
}

/** «start — end», or the start alone while the end is open. */
export function ProjectDates({ startDate, endDate }: { startDate: string; endDate: string | null }) {
  return (
    <span className="flex flex-wrap items-start gap-x-2 text-xs text-gray-600">
      <span>{t.projects.startDate}:</span>
      <DateText date={startDate} className="items-start" />
      {endDate ? (
        <>
          <span>{t.projects.endDate}:</span>
          <DateText date={endDate} className="items-start" />
        </>
      ) : null}
    </span>
  );
}
