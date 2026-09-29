/**
 * Stacked cards on a phone, a table from md — the same rows rendered twice
 * rather than one layout bent into both, because the table's column order
 * carries no meaning on a 360px screen.
 *
 * A server component: the only interactive part is the delete button inside
 * LedgerRowActions.
 */
import Link from "next/link";

import { DateText } from "@/components/DateText";
import { DirectionBadge } from "@/components/DirectionBadge";
import { MoneyText } from "@/components/MoneyText";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import { t } from "@/i18n/ar";
import type { LedgerPage, LedgerRow } from "@/features/transactions/queries";

import { LedgerRowActions, type RowPermissions } from "./LedgerRowActions";

const monthOf = (iso: string) => iso.slice(0, 7);

export type LedgerListProps = {
  page: LedgerPage;
  /** "YYYY-MM" keys of closed months. */
  lockedMonths: string[];
  permissions: RowPermissions;
  /** `/owner/transactions` or `/staff/transactions`. */
  basePath: string;
};

/** v1.2a: the party's name, else the free-text counterparty. */
const partyText = (row: LedgerRow) => row.partyName ?? row.counterparty;

/**
 * The إضافة an entry belongs to, as a small chip. A link to the إضافة only on
 * the owner's ledger — staff have no إضافة pages (v1.2a V12), so they get text.
 */
function ProjectChip({ row, linked }: { row: LedgerRow; linked: boolean }) {
  if (!row.projectId || !row.projectName) return null;
  const shape = "inline-flex max-w-full items-center rounded-sm border border-accent-line bg-accent-soft px-1.5 text-xs text-accent-dark";
  return linked ? (
    <Link href={`/owner/projects/${row.projectId}`} className={`${shape} truncate hover:underline`}>
      {row.projectName}
    </Link>
  ) : (
    <span className={`${shape} truncate`}>{row.projectName}</span>
  );
}

export function LedgerList({ page, lockedMonths, permissions, basePath }: LedgerListProps) {
  const ownerChips = basePath === "/owner/transactions";
  const isLocked = (row: LedgerRow) => lockedMonths.includes(monthOf(row.date));
  const editHref = (row: LedgerRow) => `${basePath}/${row.id}/edit`;

  return (
    <>
      {/* Phone */}
      <ul className="flex flex-col md:hidden">
        {page.rows.map((row) => (
          <li key={row.id} className="border-b border-gray-200 p-3 last:border-b-0">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DirectionBadge direction={row.direction} />
                  <span className="truncate text-sm font-medium text-gray-900">
                    {row.categoryNameAr}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-gray-600">
                  {t.paymentMethod[row.paymentMethod]}
                  {partyText(row) ? ` · ${partyText(row)}` : ""}
                </p>
                <ProjectChip row={row} linked={ownerChips} />
                <p className="text-xs text-gray-500">
                  {t.transaction.addedBy}: {row.createdByName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <MoneyText halalas={row.amountHalalas} direction={row.direction} />
                <DateText date={row.date} className="text-xs" />
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <LedgerRowActions
                id={row.id}
                editHref={editHref(row)}
                locked={isLocked(row)}
                permissions={permissions}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop */}
      <div className="hidden md:block">
        <Table
          caption={t.ledger.title}
          head={
            <Tr>
              <Th>{t.transaction.date}</Th>
              <Th>{t.direction.label}</Th>
              <Th>{t.transaction.category}</Th>
              <Th>{t.paymentMethod.label}</Th>
              <Th>{t.transaction.addedBy}</Th>
              <Th className="text-end">{t.transaction.amount}</Th>
              <Th className="text-end">{t.a11y.rowActions}</Th>
            </Tr>
          }
        >
          <TBody>
            {page.rows.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <DateText date={row.date} />
                </Td>
                <Td>
                  <DirectionBadge direction={row.direction} />
                </Td>
                <Td>
                  <span className="block">{row.categoryNameAr}</span>
                  {partyText(row) ? (
                    <span className="block text-xs text-gray-500">{partyText(row)}</span>
                  ) : null}
                  <ProjectChip row={row} linked={ownerChips} />
                </Td>
                <Td>{t.paymentMethod[row.paymentMethod]}</Td>
                <Td className="text-xs text-gray-600">{row.createdByName}</Td>
                <Td className="text-end">
                  <MoneyText halalas={row.amountHalalas} direction={row.direction} />
                </Td>
                <Td className="text-end">
                  <LedgerRowActions
                    id={row.id}
                    editHref={editHref(row)}
                    locked={isLocked(row)}
                    permissions={permissions}
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

export default LedgerList;
