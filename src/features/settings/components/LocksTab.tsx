import { Card } from "@/components/Card";
import { t } from "@/i18n/ar";
import type { LockRow } from "@/features/locks/queries";
import { monthNameAr } from "@/lib/dates";

import { LockCell } from "./LockCell";

/**
 * 24 months, newest first — `listLocks` returns them that way because an owner
 * locks the month that has just ended. Note this is the opposite order from the
 * dashboard's `last6Months`, and both are deliberate.
 */
export function LocksTab({ locks }: { locks: LockRow[] }) {
  return (
    <Card title={t.settings.locksTitle}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-600">{t.settings.locksHint}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {locks.map((row) => (
            <LockCell
              key={row.ym}
              row={row}
              label={`${monthNameAr(row.month)} ${row.year}`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export default LocksTab;
