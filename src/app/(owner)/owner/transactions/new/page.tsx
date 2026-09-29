import type { Metadata } from "next";

import { createTransaction } from "@/features/transactions/components/actions";
import { listCategories, listLocks } from "@/features/transactions/components/data";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.transaction.newTitle };

export default async function OwnerNewTransactionPage() {
  const { establishmentId } = await requireOwner();
  const [categories, locks] = await Promise.all([
    listCategories(establishmentId),
    listLocks(establishmentId),
  ]);
  // The form only needs which months are closed, not the whole lock row.
  const lockedMonths = locks.filter((l) => l.locked).map((l) => l.ym);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {t.transaction.newTitle}
      </h1>
      <TransactionForm
        mode="new"
        action={createTransaction}
        categories={categories}
        lockedMonths={lockedMonths}
        today={todayISO()}
        doneHref="/owner/transactions"
      />
    </div>
  );
}
