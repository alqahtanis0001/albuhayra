/**
 * أعمار المستحقات, one direction (C13, N2): a row per party with what is overdue
 * by days past due — 1–30 · 31–60 · 61–90 · more than 90 — and its total, then
 * the direction's totals. The card title carries the direction word (لنا /
 * علينا); amounts stay neutral, as on المستحقات. Wide at 360px, so the table
 * scrolls sideways inside its card (`<Table>`).
 */
import { Card } from "@/components/Card";
import { MoneyText } from "@/components/MoneyText";
import { TBody, TFoot, Table, Td, Th, Tr } from "@/components/Table";
import type { AgingBuckets, AgingSide } from "@/features/reports/aging";
import { t } from "@/i18n/ar";

const BUCKETS: { key: keyof AgingBuckets; label: string }[] = [
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

export function AgingTable({ title, side }: { title: string; side: AgingSide }) {
  if (side.rows.length === 0) return null;
  return (
    <Card title={title} bodyClassName="" className="report-card">
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
              <Td>{row.partyName}</Td>
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
