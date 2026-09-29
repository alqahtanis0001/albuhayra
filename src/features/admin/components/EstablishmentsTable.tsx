import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import { t } from "@/i18n/ar";
import type { EstablishmentSummary } from "@/features/admin/queries";

import { resetOwnerPassword } from "@/features/admin/actions";

import { EstablishmentActions } from "./EstablishmentActions";
import { ResetStaffPasswordForm } from "@/features/settings/components/ResetStaffPasswordForm";

/**
 * Counts and statuses only. No amount appears on this screen or anywhere else
 * under /admin — `getAdminOverview` returns none, and nothing here computes one.
 */
export function EstablishmentsTable({ rows }: { rows: EstablishmentSummary[] }) {
  if (rows.length === 0) return <EmptyState title={t.admin.noEstablishments} />;

  return (
    <Table
      caption={t.admin.establishmentsTitle}
      head={
        <Tr>
          <Th>{t.admin.establishment}</Th>
          <Th>{t.admin.owner}</Th>
          <Th>{t.status.label}</Th>
          <Th className="text-end">{t.admin.staffCount}</Th>
          <Th className="text-end">{t.admin.transactionCount}</Th>
          <Th>{t.admin.lastActivity}</Th>
          <Th>{t.a11y.rowActions}</Th>
        </Tr>
      }
    >
      <TBody>
        {rows.map((row) => (
          <Tr key={row.id}>
            <Td>{row.name}</Td>
            <Td>
              <span className="block">{row.ownerName}</span>
              <bdi className="block text-xs text-gray-500">{row.ownerEmail}</bdi>
            </Td>
            <Td>
              <StatusBadge status={row.status} />
            </Td>
            <Td className="text-end tabular-nums">{row.staffCount}</Td>
            <Td className="text-end tabular-nums">{row.transactionCount}</Td>
            <Td>
              {row.lastActivityAt ? (
                <DateText date={row.lastActivityAt} compact />
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </Td>
            <Td>
              <div className="flex flex-col gap-2">
                <EstablishmentActions
                  establishmentId={row.id}
                  active={row.status !== "DISABLED"}
                />
                {/* `ownerUserId` is nullable, so the control appears only when
                    there is an owner to reset. The id is bound on the server,
                    the same shape as resetStaffPassword. */}
                {row.ownerUserId ? (
                  <ResetStaffPasswordForm
                    action={resetOwnerPassword.bind(null, row.ownerUserId)}
                    inputId={`reset-owner-${row.id}`}
                    label={t.admin.resetOwnerPassword}
                  />
                ) : null}
              </div>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

export default EstablishmentsTable;
