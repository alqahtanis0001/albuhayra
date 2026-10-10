import Link from "next/link";

import { Badge } from "@/components/Badge";
import { LockBadge } from "@/components/LockBadge";
import { PencilIcon } from "@/components/icons";
import { t } from "@/i18n/ar";

import { DeleteEntryButton } from "./DeleteEntryButton";

/**
 * What a row offers. Every flag is decided on the server from the session's
 * role, the live `canEdit` and the month's lock state — never recomputed here.
 * The server re-checks on every mutation regardless; this is about not offering
 * a button that is going to fail.
 *
 * v1.4 (D17 c12, P4): a payment of an open-ended agreement (`planId`) is
 * OWNER-only to edit — the staff ledger shows «سداد اتفاقية» instead of the
 * pencil, and the staff edit page redirects if reached anyway (the control).
 */
export type RowPermissions = {
  canEdit: boolean;
  canDelete: boolean;
};

export function LedgerRowActions({
  id,
  editHref,
  locked,
  lockHref,
  planId,
  ownerLedger = false,
  permissions,
}: {
  id: string;
  editHref: string;
  /** The entry's month is closed: nothing may change, by anyone. */
  locked: boolean;
  /** v1.4 (D17 c4): the owner ledger's link beside «شهر مقفل»; staff pass nothing. */
  lockHref?: string;
  /** v1.4 (D17 c12): set on an open-plan payment — badge for everyone, pencil for the owner only. */
  planId?: string | null;
  /** Derived by LedgerList from its basePath (D21 M1). */
  ownerLedger?: boolean;
  permissions: RowPermissions;
}) {
  if (locked) return <LockBadge href={lockHref} />;

  const planPayment = Boolean(planId);
  const canEdit = permissions.canEdit && (ownerLedger || !planPayment);
  const canDelete = permissions.canDelete;
  const badge = planPayment ? <Badge tone="accent">{t.ledger.openPlanPaymentBadge}</Badge> : null;
  if (!canEdit && !canDelete) return badge;

  return (
    <div className="flex items-center justify-end gap-1">
      {badge}
      {canEdit ? (
        <Link
          href={editHref}
          aria-label={t.common.edit}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-accent-dark hover:bg-accent-soft"
        >
          <PencilIcon size={18} />
          <span className="sr-only md:not-sr-only">{t.common.edit}</span>
        </Link>
      ) : null}
      {canDelete ? <DeleteEntryButton id={id} /> : null}
    </div>
  );
}

export default LedgerRowActions;
