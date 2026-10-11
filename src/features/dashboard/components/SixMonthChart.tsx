"use client";

/**
 * The one chart in the app. A client component because recharts needs the DOM —
 * so everything it imports must be pure: `@/lib/money` and `@/lib/dates` are,
 * and no `server-only` module may be pulled across this boundary. Every prop
 * below is a plain number or string; a Date or a Prisma Decimal reaching here is
 * the usual way this build breaks.
 *
 * The bars alone would carry the six-month comparison in pixels only, so the
 * same figures are repeated in a visually-hidden table for screen readers and
 * for anyone who cannot separate the two colours.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MoneyText } from "@/components/MoneyText";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import { t } from "@/i18n/ar";
import { monthNameAr } from "@/lib/dates";
import { formatAmount, formatSAR } from "@/lib/money";

import type { MonthTotals } from "./data";

type Row = { label: string; inHalalas: number; outHalalas: number };

/**
 * v1.5 (D32, theme's list): recharts' built-in greys as token values, so the
 * chart follows the dark theme. Light mode does not move: each light value is
 * recharts' own default (the light grey of grid, cursor and tooltip border, the mid grey of axes and ticks,
 * a white tooltip). Tooltip label and items, and the legend, keep recharts'
 * colours: inherited text and each series' own (token) fill.
 */
export const CHART_TOKENS = {
  grid: "var(--color-chart-grid)",
  tick: { fill: "var(--color-gray-500)" },
  axis: "var(--color-gray-500)",
  tooltipBox: { backgroundColor: "var(--color-white)", borderColor: "var(--color-chart-grid)" },
  cursor: { fill: "var(--color-chart-grid)", stroke: "var(--color-chart-grid)" },
} as const;

export function SixMonthChart({ months }: { months: MonthTotals[] }) {
  const rows: Row[] = months.map((m) => ({
    label: monthNameAr(Number(m.ym.slice(5, 7))),
    inHalalas: m.inHalalas,
    outHalalas: m.outHalalas,
  }));

  const hasData = rows.some((r) => r.inHalalas > 0 || r.outHalalas > 0);
  if (!hasData) {
    return <p className="p-4 text-sm text-gray-500">{t.dashboard.emptyChart}</p>;
  }

  return (
    <>
      <div className="h-64 w-full p-2" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_TOKENS.grid} />
            {/* Reversed so the months read right-to-left with the rest of the UI. */}
            <XAxis dataKey="label" reversed tickLine={false} fontSize={12} tick={CHART_TOKENS.tick} stroke={CHART_TOKENS.axis} />
            <YAxis
              orientation="right"
              tickFormatter={(v: number) => formatAmount(v)}
              tickLine={false}
              width={64}
              fontSize={12}
              tick={CHART_TOKENS.tick}
              stroke={CHART_TOKENS.axis}
            />
            {/* recharts wants a string here, so formatSAR rather than
                <MoneyText>. The rule is Western digits; MoneyText is only its
                usual mechanism, not the rule itself. */}
            <Tooltip
              formatter={(v) => formatSAR(Number(v))}
              contentStyle={CHART_TOKENS.tooltipBox}
              cursor={CHART_TOKENS.cursor}
            />
            <Legend />
            <Bar
              dataKey="inHalalas"
              name={t.direction.IN}
              fill="var(--color-money-in)"
            />
            <Bar
              dataKey="outHalalas"
              name={t.direction.OUT}
              fill="var(--color-money-out)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="sr-only">
        {/* <MoneyText> here, unlike the tickFormatter and Tooltip above, which
            need a string rather than an element — see the note on those lines. */}
        <Table caption={t.dashboard.last6Months}>
          <thead>
            <Tr>
              <Th>{t.reports.month}</Th>
              <Th>{t.direction.IN}</Th>
              <Th>{t.direction.OUT}</Th>
            </Tr>
          </thead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.label}>
                <Td>{r.label}</Td>
                <Td>
                  <MoneyText halalas={r.inHalalas} direction="IN" />
                </Td>
                <Td>
                  <MoneyText halalas={r.outHalalas} direction="OUT" />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}

export default SixMonthChart;
