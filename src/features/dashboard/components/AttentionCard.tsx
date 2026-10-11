/**
 * v1.5 (docs/V15-SPEC.md A2, D8, D34): «يحتاج انتباهك» — one card in place of
 * the red متأخرات strip, «مستحقات هذا الأسبوع» and the join-request notice.
 * Rows come from `attentionRows` (pure, tested); each is a link with a 44 px
 * target. Nothing at all when no row has something to say. The heading badge
 * counts the rows, with its words for screen readers. Server component; it
 * prints (content, not chrome).
 */
import Link from "next/link";

import { Card } from "@/components/Card";
import { MoneyText } from "@/components/MoneyText";
import { AlertIcon, ChevronEndIcon } from "@/components/icons";
import { t } from "@/i18n/ar";
import { plural } from "@/lib/plural";

import type { AttentionRow } from "../attention";

/** D40 (R1-H5): only the non-zero side(s) — a row exists because at least one is. */
function Totals({ inHalalas, outHalalas }: { inHalalas: number; outHalalas: number }) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
      {inHalalas !== 0 ? (
        <span>
          {t.dues.toUs}: <MoneyText halalas={inHalalas} />
        </span>
      ) : null}
      {outHalalas !== 0 ? (
        <span>
          {t.dues.fromUs}: <MoneyText halalas={outHalalas} />
        </span>
      ) : null}
    </span>
  );
}

/** The row's main line. */
export function attentionText(row: AttentionRow): string {
  switch (row.key) {
    case "overdue":
      return plural(t.attention.overdue, row.count);
    case "week":
      return t.attention.thisWeek;
    case "pending":
      return plural(t.attention.pending, row.names.length).replace("{name}", row.names.join("، "));
    case "salary":
      return row.days === 0 ? t.attention.salaryToday : plural(t.attention.salaryIn, row.days);
  }
}

function Row({ row }: { row: AttentionRow }) {
  const overdue = row.key === "overdue";
  return (
    <li className="border-b border-gray-200 last:border-b-0">
      <Link
        href={row.href}
        className={`flex min-h-11 items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 ${overdue ? "text-money-out" : "text-gray-900"}`}
      >
        {overdue ? <AlertIcon size={18} className="shrink-0" /> : null}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-medium">{attentionText(row)}</span>
          {row.key === "overdue" || row.key === "week" ? (
            <Totals inHalalas={row.inHalalas} outHalalas={row.outHalalas} />
          ) : null}
        </span>
        <ChevronEndIcon size={18} className="shrink-0 text-gray-500" />
      </Link>
    </li>
  );
}

export function AttentionCard({ rows }: { rows: AttentionRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Card bodyClassName="">
      <header className="border-b border-gray-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-start text-base font-semibold text-gray-900">
          {t.attention.title}
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-money-out px-1.5 text-xs font-semibold text-on-accent tabular-nums">
            <span aria-hidden="true">{rows.length}</span>
            <span className="sr-only">{plural(t.attention.badge, rows.length)}</span>
          </span>
        </h2>
      </header>
      <ul>
        {rows.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </ul>
    </Card>
  );
}

export default AttentionCard;
