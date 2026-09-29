import type { Metadata } from "next";

import { createTransaction } from "@/features/transactions/components/actions";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { listLocks } from "@/features/locks/queries";
import { listCategories } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { requireStaff } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.transaction.newTitle };

/** Any ACTIVE member may add an entry, so this needs only requireStaff. */
export default async function StaffNewTransactionPage() {
  const { establishmentId } = await requireStaff();
  const [categories, locks] = await Promise.all([
    listCategories(establishmentId),
    listLocks(establishmentId),
  ]);
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
        doneHref="/staff/transactions"
      />
    </div>
  );
}
