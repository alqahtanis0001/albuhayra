/**
 * الجهات: stacked cards on a phone, a table from md — the same rows twice, like
 * the ledger. Each row leads to the party's page; inactive rows are greyed and
 * say «(موقوف)» in words.
 */
import Link from "next/link";

import { Table, TBody, Td, Th, Tr } from "@/components/Table";
import { t } from "@/i18n/ar";
import type { PartyRow } from "@/features/parties/queries";

import { PartyBalance, PartyTypeBadge, partyLabel } from "./PartyBits";

const href = (row: PartyRow) => `/owner/parties/${row.id}`;

export function PartyList({ rows }: { rows: PartyRow[] }) {
  return (
    <>
      {/* Phone */}
      <ul className="flex flex-col md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="border-b border-gray-200 last:border-b-0">
            <Link
              href={href(row)}
              className={`flex items-start gap-3 p-3 hover:bg-gray-50 ${row.active ? "" : "bg-gray-50 text-gray-600"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{partyLabel(row.name, row.active)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <PartyTypeBadge type={row.type} />
                  {row.phone ? (
                    <span dir="ltr" className="text-xs text-gray-600 tabular-nums">
                      {row.phone}
                    </span>
                  ) : null}
                </div>
              </div>
              <PartyBalance
                owedToUsHalalas={row.owedToUsHalalas}
                owedByUsHalalas={row.owedByUsHalalas}
                className="items-end text-end"
              />
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop */}
      <div className="hidden md:block">
        <Table
          caption={t.parties.title}
          head={
            <Tr>
              <Th>{t.parties.name}</Th>
              <Th>{t.partyType.label}</Th>
              <Th>{t.parties.phone}</Th>
              <Th>{t.statement.balance}</Th>
            </Tr>
          }
        >
          <TBody>
            {rows.map((row) => (
              <Tr key={row.id} className={row.active ? "" : "bg-gray-50 text-gray-600"}>
                <Td>
                  <Link
                    href={href(row)}
                    className="font-medium text-accent-dark underline-offset-2 hover:underline"
                  >
                    {partyLabel(row.name, row.active)}
                  </Link>
                </Td>
                <Td>
                  <PartyTypeBadge type={row.type} />
                </Td>
                <Td>
                  {row.phone ? (
                    <span dir="ltr" className="tabular-nums">
                      {row.phone}
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <PartyBalance
                    owedToUsHalalas={row.owedToUsHalalas}
                    owedByUsHalalas={row.owedByUsHalalas}
                  />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}

export default PartyList;
