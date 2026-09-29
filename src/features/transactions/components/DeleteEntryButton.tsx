"use client";

/**
 * The only interactive island in the ledger. Whether it is rendered at all is
 * decided on the server from role and lock state — this component never asks
 * "may I?", it only performs a deletion the page already permitted.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Toast } from "@/components/Toast";
import { TrashIcon } from "@/components/icons";
import { errorMessage, t } from "@/i18n/ar";

import { deleteTransaction } from "./actions";

export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t.common.delete}
      >
        <TrashIcon size={18} />
        <span className="sr-only md:not-sr-only">{t.common.delete}</span>
      </Button>

      <ConfirmDialog
        open={open}
        title={t.transaction.deleteTitle}
        message={t.transaction.deleteConfirm}
        confirmLabel={t.common.delete}
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const result = await deleteTransaction(id);
            setOpen(false);
            // The server soft-deletes and revalidates; refresh re-reads the list
            // so the row disappears without a full navigation.
            if (result.ok) router.refresh();
            else setError(result.error);
          })
        }
      />

      {error ? (
        <Toast message={errorMessage(error)} onDismiss={() => setError(null)} />
      ) : null}
    </>
  );
}

export default DeleteEntryButton;
