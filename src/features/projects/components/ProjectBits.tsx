/**
 * Pieces the إضافة screens share. Server components.
 *
 * The budget bar is decoration (aria-hidden): the text beside it always states
 * the number — المتبقي, or by how much the budget is exceeded — so nothing
 * depends on reading a bar or its colour.
 */
import { Fragment, type ReactNode } from "react";

import { Badge, type BadgeTone } from "@/components/Badge";
import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import { t } from "@/i18n/ar";
import type { ProjectStatusValue } from "@/lib/validation";

const STATUS_TONE: Record<ProjectStatusValue, BadgeTone> = {
  ACTIVE: "accent",
  COMPLETED: "neutral",
  CANCELLED: "warn",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatusValue }) {
  return <Badge tone={STATUS_TONE[status]}>{t.projectStatus[status]}</Badge>;
}

/** Replaces `{key}` placeholders in an i18n template with rendered nodes. */
export function fillTemplate(template: string, nodes: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{key && key in nodes ? nodes[key] : part}</Fragment>;
  });
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
  const ratio = budgetHalalas > 0 ? Math.min(spentHalalas / budgetHalalas, 1) : 1;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-gray-700">
        {fillTemplate(t.projects.spentOfBudget, {
          spent: <MoneyText halalas={spentHalalas} />,
          budget: <MoneyText halalas={budgetHalalas} />,
        })}
      </p>
      <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${over ? "bg-money-out" : "bg-accent"}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <p className={`text-sm ${over ? "font-medium text-money-out" : "text-gray-700"}`}>
        {over ? t.projects.overBudget : t.projects.budgetRemaining}:{" "}
        <MoneyText halalas={Math.abs(remainingHalalas)} />
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
