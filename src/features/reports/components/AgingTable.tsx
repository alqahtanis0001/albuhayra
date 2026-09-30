/**
 * أعمار المستحقات, one direction (C13, N2): a row per party with what is overdue
 * by days past due — 1–30 · 31–60 · 61–90 · more than 90 — and its total, then
 * the direction's totals. The card title carries the direction word (لنا /
 * علينا); amounts stay neutral, as on المستحقات. Wide at 360px, so the table
 * scrolls sideways inside its card (`<Table>`).
 *
 * v1.3 item 14: four bucket tiles (count + total, tinted by age, the label
 * always written) open the card, and each party row carries a stacked bar of
 * its buckets (`bucketShares`). Both are screen-only (`no-print`) and the bar
 * is `aria-hidden`: the table is their text equivalent and what prints.
 */
import { Card } from "@/components/Card";
import { MoneyText } from "@/components/MoneyText";
import { TBody, TFoot, Table, Td, Th, Tr } from "@/components/Table";
import type { AgingBuckets, AgingSide } from "@/features/reports/aging";
import { t } from "@/i18n/ar";
import { formatSAR } from "@/lib/money";
import { plural } from "@/lib/plural";

import { BUCKET_KEYS, bucketShares, SEGMENT_FILL, TILE_TINT } from "./agingVisual";

const BUCKETS: { key: (typeof BUCKET_KEYS)[number]; label: string }[] = [
  { key: "upTo30Halalas", label: t.aging.bucket0 },
  { key: "upTo60Halalas", label: t.aging.bucket31 },
  { key: "upTo90Halalas", label: t.aging.bucket61 },
  { key: "over90Halalas", label: t.aging.bucketOver },
];

function Amounts({ row, inFoot = false }: { row: AgingBuckets; inFoot?: boolean }) {
  return (
    <>
      {BUCKETS.map((b) => (
        <Td key={b.key} className="whitespace-nowrap text-end">
          {row[b.key] === 0 ? <span className="text-gray-500">—</span> : <MoneyText halalas={row[b.key]} />}
        </Td>
      ))}
      <Td className={`whitespace-nowrap text-end ${inFoot ? "" : "font-medium"}`}>
        <MoneyText halalas={row.totalHalalas} />
      </Td>
    </>
  );
}

const COUNT_OF = { upTo30Halalas: "upTo30", upTo60Halalas: "upTo60", upTo90Halalas: "upTo90", over90Halalas: "over90" } as const;

function Tiles({ side }: { side: AgingSide }) {
  return (
    <ul aria-label={t.agingVisual.tilesLabel} className="no-print grid grid-cols-2 gap-2 border-b border-gray-200 p-3 sm:grid-cols-4">
      {BUCKETS.map((b) => (
        <li key={b.key} className={`flex flex-col gap-1 rounded border border-gray-200 p-2 text-gray-900 ${TILE_TINT[b.key]}`}>
          <span className="text-xs font-semibold">{b.label}</span>
          <span className="text-xs">{plural(t.agingVisual.count, side.counts[COUNT_OF[b.key]])}</span>
          <MoneyText halalas={side.totals[b.key]} className="text-sm" />
        </li>
      ))}
    </ul>
  );
}

/** Screen-only; the youngest bucket at the inline start (right, in RTL). */
function StackedBar({ row }: { row: AgingBuckets }) {
  const shares = bucketShares(row);
  return (
    <div aria-hidden="true" className="no-print mt-1 flex h-1.5 min-w-24 gap-px overflow-hidden rounded bg-gray-100">
      {BUCKETS.filter((b) => shares[b.key] > 0).map((b) => (
        <span
          key={b.key}
          title={t.agingVisual.segment.replace("{bucket}", b.label).replace("{amount}", formatSAR(row[b.key]))}
          className={`v13-grow-inline h-full ${SEGMENT_FILL[b.key]}`}
          style={{ width: `${shares[b.key]}%` }}
        />
      ))}
    </div>
  );
}

export function AgingTable({ title, side }: { title: string; side: AgingSide }) {
  if (side.rows.length === 0) return null;
  return (
    <Card title={title} bodyClassName="" className="report-card">
      <Tiles side={side} />
      <Table
        caption={title}
        head={
          <Tr>
            <Th>{t.aging.party}</Th>
            {BUCKETS.map((b) => (
              <Th key={b.key} className="whitespace-nowrap text-end">
                {b.label}
              </Th>
            ))}
            <Th className="text-end">{t.aging.total}</Th>
          </Tr>
        }
      >
        <TBody>
          {side.rows.map((row) => (
            <Tr key={row.partyId}>
              <Td>
                {row.partyName}
                <StackedBar row={row} />
              </Td>
              <Amounts row={row} />
            </Tr>
          ))}
        </TBody>
        {/* After TBody: print makes tfoot a plain row group, so it prints once, last. */}
        <TFoot>
          <Tr>
            <Td>{t.aging.total}</Td>
            <Amounts row={side.totals} inFoot />
          </Tr>
        </TFoot>
      </Table>
    </Card>
  );
}

export default AgingTable;
