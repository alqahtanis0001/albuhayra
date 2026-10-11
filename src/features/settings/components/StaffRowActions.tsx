"use client";

/**
 * Per-row staff controls. Which buttons exist is decided by `status`, which comes
 * from the server; every action re-checks ownership of the staff member against
 * the session, so this component never carries an establishment id.
 * v1.4 part 3 (D29 R5): «السماح بالتعديل» is a labelled Switch that states
 * its state — «التعديل: مسموح» / «التعديل: غير مسموح» — with the helper that
 * the employee always adds entries.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Switch } from "@/components/Switch";
import { Toast } from "@/components/Toast";
import { errorMessage, t } from "@/i18n/ar";
import type { StaffRow } from "@/features/establishments/queries";

import {
  approveStaff,
  rejectStaff,
  setCanEdit,
  setStaffActive,
} from "@/features/establishments/actions";

/** The switch's own label says which state it is in (R5). */
export function editLabel(canEdit: boolean): string {
  return canEdit ? t.settings.editAllowed : t.settings.editNotAllowed;
}

export function StaffRowActions({ staff }: { staff: StaffRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);

  const run = (call: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const result = await call();
      if (result.ok) router.refresh();
      else setError(result.error ?? "err.unexpected");
    });

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {staff.status === "PENDING" ? (
          <>
            {/* approveStaff refuses an unverified account too
                (err.emailNotVerified); the reason is shown under the row. */}
            <Button
              size="sm"
              pending={pending}
              disabled={!staff.emailVerified}
              aria-describedby={staff.emailVerified ? undefined : `unverified-${staff.id}`}
              onClick={() => run(() => approveStaff(staff.id))}
            >
              {t.common.accept}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              pending={pending}
              onClick={() => setConfirmReject(true)}
            >
              {t.common.reject}
            </Button>
          </>
        ) : (
          <>
            <Switch
              label={editLabel(staff.canEdit)}
              hint={t.settings.editHelp}
              checked={staff.canEdit}
              disabled={pending}
              onChange={(next) => run(() => setCanEdit(staff.id, next))}
            />
            <Button
              size="sm"
              variant="secondary"
              pending={pending}
              onClick={() => run(() => setStaffActive(staff.id, staff.status !== "ACTIVE"))}
            >
              {staff.status === "ACTIVE" ? t.common.disable : t.common.enable}
            </Button>
          </>
        )}
      </div>
      {staff.status === "PENDING" && !staff.emailVerified ? (
        <p id={`unverified-${staff.id}`} className="text-end text-xs text-gray-600">
          {t.err.emailNotVerified}
        </p>
      ) : null}

      {/* Only a pending row can be rejected, so only a pending row carries the
          dialog — otherwise every active staff member has hidden markup titled
          "رفض" describing an action not offered for them. */}
      {staff.status === "PENDING" ? (
        <ConfirmDialog
          open={confirmReject}
          title={t.common.reject}
          message={t.settings.rejectStaffConfirm}
          confirmLabel={t.common.reject}
          pending={pending}
          onCancel={() => setConfirmReject(false)}
          onConfirm={() => {
            setConfirmReject(false);
            run(() => rejectStaff(staff.id));
          }}
        />
      ) : null}

      {error ? (
        <Toast message={errorMessage(error)} onDismiss={() => setError(null)} />
      ) : null}
    </>
  );
}

export default StaffRowActions;
