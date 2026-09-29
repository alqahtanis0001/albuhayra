"use client";

/**
 * The party page's controls: تعديل, إيقاف/تفعيل (a ConfirmDialog before إيقاف
 * only; reactivating loses nothing), and حذف, offered only while nothing
 * references the party; otherwise the reason is said instead. Every action
 * re-checks ownership and history on the server.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LinkButton } from "@/components/LinkButton";
import { Toast } from "@/components/Toast";
import { PencilIcon } from "@/components/icons";
import { deleteParty, setPartyActive } from "@/features/parties/actions";
import { errorMessage, t } from "@/i18n/ar";
import type { ActionResult } from "@/lib/validation";

export function PartyActions({
  partyId,
  active,
  hasHistory,
}: {
  partyId: string;
  active: boolean;
  hasHistory: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"deactivate" | "delete" | null>(null);

  const run = (call: () => Promise<ActionResult<null>>, then: () => void) =>
    start(async () => {
      const result = await call();
      if (result.ok) then();
      else setError(result.error);
    });

  return (
    <div className="no-print flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/owner/parties/${partyId}/edit`} variant="secondary">
          <PencilIcon size={18} />
          {t.common.edit}
        </LinkButton>
        <Button
          variant="secondary"
          pending={pending}
          onClick={() =>
            active
              ? setConfirm("deactivate")
              : run(() => setPartyActive(partyId, true), () => router.refresh())
          }
        >
          {active ? t.parties.deactivate : t.parties.activate}
        </Button>
        {hasHistory ? null : (
          <Button variant="danger" pending={pending} onClick={() => setConfirm("delete")}>
            {t.parties.delete}
          </Button>
        )}
      </div>
      {hasHistory ? <p className="text-xs text-gray-600">{t.parties.hasHistoryHint}</p> : null}

      <ConfirmDialog
        open={confirm === "deactivate"}
        title={t.parties.deactivate}
        message={t.parties.deactivateConfirm}
        confirmLabel={t.parties.deactivate}
        tone="accent"
        pending={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          run(() => setPartyActive(partyId, false), () => router.refresh());
        }}
      />
      {hasHistory ? null : (
        <ConfirmDialog
          open={confirm === "delete"}
          title={t.parties.delete}
          message={t.parties.deleteConfirm}
          confirmLabel={t.common.delete}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            run(() => deleteParty(partyId), () => router.push("/owner/parties"));
          }}
        />
      )}

      {error ? <Toast message={errorMessage(error)} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}

export default PartyActions;
