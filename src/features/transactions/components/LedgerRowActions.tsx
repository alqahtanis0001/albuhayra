import Link from "next/link";

import { LockBadge } from "@/components/LockBadge";
import { PencilIcon } from "@/components/icons";
import { t } from "@/i18n/ar";

import { DeleteEntryButton } from "./DeleteEntryButton";

/**
 * What a row offers. Every flag is decided on the server from the session's
 * role, the live `canEdit` and the month's lock state — never recomputed here.
 * The server re-checks on every mutation regardless; this is about not offering
 * a button that is going to fail.
 */
export type RowPermissions = {
  canEdit: boolean;
  canDelete: boolean;
};

export function LedgerRowActions({
  id,
  editHref,
  locked,
  permissions,
}: {
  id: string;
  editHref: string;
  /** The entry's month is closed: nothing may change, by anyone. */
  locked: boolean;
  permissions: RowPermissions;
}) {
  if (locked) return <LockBadge />;

  const canEdit = permissions.canEdit;
  const canDelete = permissions.canDelete;
  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex items-center justify-end gap-1">
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
