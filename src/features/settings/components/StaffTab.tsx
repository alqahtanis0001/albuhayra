import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { t } from "@/i18n/ar";
import { resetStaffPassword } from "@/features/establishments/actions";
import type { StaffRow } from "@/features/establishments/queries";

import { ResetStaffPasswordForm } from "./ResetStaffPasswordForm";
import { StaffRowActions } from "./StaffRowActions";

/**
 * Pending requests first, then everyone else. `listStaff` already orders them
 * that way — the pending ones are the rows the owner came to act on.
 */
export function StaffTab({ staff }: { staff: StaffRow[] }) {
  const pending = staff.filter((s) => s.status === "PENDING");
  const rest = staff.filter((s) => s.status !== "PENDING");

  return (
    <div className="flex flex-col gap-4">
      <Card title={t.settings.staffPending} bodyClassName="">
        {pending.length === 0 ? (
          <EmptyState title={t.settings.noPendingStaff} />
        ) : (
          <ul>
            {pending.map((row) => (
              <li key={row.id} className="border-b border-gray-200 p-3 last:border-b-0">
                <StaffIdentity row={row} />
                <div className="mt-2">
                  <StaffRowActions staff={row} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t.settings.staffActive} bodyClassName="">
        {rest.length === 0 ? (
          <EmptyState title={t.settings.noStaff} />
        ) : (
          <ul>
            {rest.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 border-b border-gray-200 p-3 last:border-b-0"
              >
                <StaffIdentity row={row} />
                <StaffRowActions staff={row} />
                {/* The id is bound here, on the server, so it is never a form
                    field a client could repoint at someone else's account. */}
                <ResetStaffPasswordForm
                  action={resetStaffPassword.bind(null, row.id)}
                  inputId={`reset-${row.id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StaffIdentity({ row }: { row: StaffRow }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium text-gray-900">{row.name}</span>
      <bdi className="text-sm text-gray-600">{row.email}</bdi>
      <StatusBadge status={row.status} />
      <span className="text-xs text-gray-500">
        <DateText date={row.createdAt} compact />
      </span>
    </div>
  );
}

export default StaffTab;
