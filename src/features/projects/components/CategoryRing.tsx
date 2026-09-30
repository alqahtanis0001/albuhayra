/**
 * v1.3 item 9 — an إضافة's costs by category as a small hand-written SVG ring
 * (not recharts: the spec keeps it on the dashboard; PROGRESS ruling 3). Top 5
 * categories + «أخرى». The ring is decorative (aria-hidden); the legend beside
 * it — name, amount, share — is its text equivalent. Screen only: the
 * «حسب التصنيف» table below already prints.
 */
import { Card } from "@/components/Card";
import { MoneyText } from "@/components/MoneyText";
import { PALETTE } from "@/components/visualPalette";
import type { ProjectCategoryTotal } from "@/features/projects/queries";
import { t } from "@/i18n/ar";

import { categorySlices, ringArcs, ringCircumference } from "./budgetVisual";

const R = 16;

/** In slice order; «أخرى» is always grey. */
const COLOURS = [PALETTE.green, PALETTE.gold, PALETTE.teal, PALETTE.blue, PALETTE.amber];

function colourOf(key: string, index: number): string {
  return key === "other" ? PALETTE.grey : COLOURS[index % COLOURS.length]!;
}

export function CategoryRing({ rows }: { rows: ProjectCategoryTotal[] }) {
  const slices = categorySlices(rows);
  if (slices.length === 0) return null;
  const arcs = ringArcs(slices.map((s) => s.share), R);
  const circumference = ringCircumference(R);

  return (
    <Card title={t.budgetMeter.byCategory} className="no-print" bodyClassName="flex flex-wrap items-center gap-6 p-4">
      <svg viewBox="0 0 42 42" width={112} height={112} aria-hidden="true" focusable="false" className="shrink-0">
        <circle cx="21" cy="21" r={R} fill="none" stroke={PALETTE.greySoft} strokeWidth="6" />
        {slices.map((slice, i) => (
          <circle
            key={slice.key}
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke={colourOf(slice.key, i)}
            strokeWidth="6"
            strokeDasharray={`${arcs[i]!.length} ${circumference}`}
            strokeDashoffset={-arcs[i]!.offset}
            transform="rotate(-90 21 21)"
          />
        ))}
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        {slices.map((slice, i) => (
          <li key={slice.key} className="flex flex-wrap items-center gap-x-2">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: colourOf(slice.key, i) }}
            />
            <span className="min-w-0 flex-1 truncate text-gray-900">{slice.nameAr ?? t.budgetMeter.other}</span>
            <MoneyText halalas={slice.totalHalalas} />
            <bdi dir="ltr" className="w-12 text-end text-xs tabular-nums text-gray-600">
              {`${Math.round(slice.share)}%`}
            </bdi>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default CategoryRing;
