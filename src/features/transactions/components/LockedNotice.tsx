import { LockBadge } from "@/components/LockBadge";
import { t } from "@/i18n/ar";

/** Shown above the form when the month in play is closed. */
export function LockedNotice({ hint }: { hint?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-3"
    >
      <div className="flex items-center gap-2">
        <LockBadge />
        <p className="text-sm font-semibold text-amber-900">
          {t.lock.blockedTitle}
        </p>
      </div>
      <p className="text-sm text-amber-800">{hint ?? t.lock.blockedHint}</p>
    </div>
  );
}

export default LockedNotice;
