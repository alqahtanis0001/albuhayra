"use client";

/**
 * تعطيل / تفعيل one establishment. Disabling locks out its owner and all of its
 * staff, which `requireUser()` enforces on their next request — so this is not a
 * cosmetic flag and it stays behind an explicit click rather than a toggle that
 * fires on focus.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";
import { errorMessage, t } from "@/i18n/ar";
import { setEstablishmentActive } from "@/features/admin/actions";

export function EstablishmentActions({
  establishmentId,
  active,
}: {
  establishmentId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        pending={pending}
        onClick={() =>
          start(async () => {
            const result = await setEstablishmentActive(establishmentId, !active);
            if (result.ok) router.refresh();
            else setError(result.error);
          })
        }
      >
        {active ? t.common.disable : t.common.enable}
      </Button>

      {error ? (
        <Toast message={errorMessage(error)} onDismiss={() => setError(null)} />
      ) : null}
    </>
  );
}

export default EstablishmentActions;
