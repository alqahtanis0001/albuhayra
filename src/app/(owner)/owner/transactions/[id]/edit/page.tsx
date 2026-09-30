import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateTransaction } from "@/features/transactions/components/actions";
import { getTransaction } from "@/features/transactions/components/data";
import { listCategories } from "@/features/settings/queries";
import { listLocks } from "@/features/locks/queries";
import { listPartyOptions } from "@/features/parties/queries";
import { getPaymentLink } from "@/features/plans/dues";
import { listProjectOptions } from "@/features/projects/queries";
import { PaymentBanner } from "@/features/transactions/components/PaymentBanner";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { t } from "@/i18n/ar";
import { requireCanEdit } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.transaction.editTitle };

export default async function OwnerEditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Editing is gated on canEdit, not merely on being the owner: the same form is
  // reachable by STAFF whose owner has switched the permission on.
  const { establishmentId } = await requireCanEdit();

  const [row, categories, locks, parties, projects] = await Promise.all([
    getTransaction(establishmentId, id),
    listCategories(establishmentId),
    listLocks(establishmentId),
    listPartyOptions(establishmentId),
    listProjectOptions(establishmentId),
  ]);
  if (!row) notFound();
  // A payment keeps its plan's direction and party (W1): locked, not editable.
  const link = row.instalmentId ? await getPaymentLink(establishmentId, row.instalmentId) : null;
  // The form only needs which months are closed, not the whole lock row.
  const lockedMonths = locks.filter((l) => l.locked).map((l) => l.ym);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {t.transaction.editTitle}
      </h1>
      <TransactionForm
        mode="edit"
        // Bound here, on the server, so the id is never a form field a client
        // could change to point at someone else's entry.
        action={updateTransaction.bind(null, row.id)}
        categories={categories}
        parties={parties}
        projects={projects}
        lockedMonths={lockedMonths}
        today={todayISO()}
        doneHref="/owner/transactions"
        initial={row}
        payment={link ? { direction: link.direction } : undefined}
        banner={
          link ? (
            <PaymentBanner
              mode="edit"
              direction={link.direction}
              partyId={link.partyId}
              partyName={link.partyName}
              plan={{ planId: link.planId, planTitle: link.planTitle }}
            />
          ) : undefined
        }
      />
    </div>
  );
}
