"use client";

/**
 * v1.3 (docs/V13-SPEC.md item 4): this month's expenses as a donut — the month
 * total in the centre, top five + «أخرى», a legend with amounts and shares.
 * A slice or a legend row opens السجل filtered to that category and month;
 * «أخرى» is not a link. The slices are pointer-only (aria-hidden): the legend
 * links are the keyboard and screen-reader path, and the table in
 * TopOutCategories is the text equivalent. recharts, like SixMonthChart — the
 * dashboard is the one place it is bundled. Screen only.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { MoneyText } from "@/components/MoneyText";
import { useReducedMotion } from "@/components/useReducedMotion";
import { PALETTE } from "@/components/visualPalette";
import { t } from "@/i18n/ar";

import type { DonutSlice } from "../visuals";
import { fillText } from "../visuals";
import { formatPercent } from "./percent";

export type DonutEntry = DonutSlice & { href: string | null };

/** Named slices in order; «أخرى» always grey. Colour is backed by the legend. */
const COLOURS = [PALETTE.out, PALETTE.amber, PALETTE.gold, PALETTE.blue, PALETTE.teal];

function colourOf(entry: DonutEntry, i: number): string {
  return entry.key === "other" ? PALETTE.grey : (COLOURS[i] ?? PALETTE.grey);
}

export function ExpenseDonut({ slices, totalHalalas }: { slices: DonutEntry[]; totalHalalas: number }) {
  const router = useRouter();
  const reduced = useReducedMotion();

  return (
    <div className="no-print flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="relative mx-auto h-48 w-48 shrink-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="totalHalalas"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={!reduced}
              animationDuration={600}
              animationEasing="ease-out"
              onClick={(_, i) => {
                const href = slices[i]?.href;
                if (href) router.push(href);
              }}
            >
              {slices.map((s, i) => (
                <Cell key={s.key} fill={colourOf(s, i)} cursor={s.href ? "pointer" : "default"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-gray-600">{t.dashVisual.donutCenter}</span>
          <MoneyText halalas={totalHalalas} className="text-sm" />
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-1">
        {slices.map((s, i) => {
          const body = (
            <>
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: colourOf(s, i) }}
              />
              {s.href ? (
                <span className="sr-only">{fillText(t.dashVisual.donutSliceLink, { name: s.name })}</span>
              ) : null}
              <span aria-hidden={s.href ? true : undefined} className="flex-1 truncate text-start text-gray-900">
                {s.name}
              </span>
              <MoneyText halalas={s.totalHalalas} direction="OUT" className="text-sm" />
              <bdi dir="ltr" className="w-14 text-end text-sm tabular-nums text-gray-700">
                {formatPercent(s.share)}
              </bdi>
            </>
          );
          const row = "flex min-h-11 items-center gap-2 rounded-md px-2 text-sm";
          return (
            <li key={s.key}>
              {s.href ? (
                <Link
                  href={s.href}
                  className={`${row} hover:bg-gray-50`}
                >
                  {body}
                </Link>
              ) : (
                <div className={row}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ExpenseDonut;
