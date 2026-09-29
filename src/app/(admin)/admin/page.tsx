import type { Metadata } from "next";

import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PendingOwnerActions } from "@/features/admin/components/PendingOwnerActions";
import { getAdminOverview } from "@/features/admin/queries";
import { t } from "@/i18n/ar";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: t.admin.requestsTitle };

/** No amount is rendered on any admin screen — see the note in the layout. */
export default async function AdminRequestsPage() {
  await requireAdmin();
  const { pendingOwners } = await getAdminOverview();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {t.admin.requestsTitle}
      </h1>

      <Card bodyClassName="">
        {pendingOwners.length === 0 ? (
          <EmptyState title={t.admin.noRequests} />
        ) : (
          <ul>
            {pendingOwners.map((row) => (
              <li
                key={row.userId}
                className="flex flex-col gap-2 border-b border-gray-200 p-3 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">{row.fullName}</span>
                  <bdi className="text-sm text-gray-600">{row.email}</bdi>
                  <VerifiedBadge verified={row.emailVerified} />
                </div>
                <p className="text-sm text-gray-700">
                  {t.admin.establishment}: {row.establishmentName}
                </p>
                <p className="text-xs text-gray-500">
                  {t.admin.requestedAt}: <DateText date={row.requestedAt} compact />
                </p>
                <PendingOwnerActions userId={row.userId} emailVerified={row.emailVerified} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
