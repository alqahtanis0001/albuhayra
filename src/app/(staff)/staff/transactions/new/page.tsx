import type { Metadata } from "next";

import { createTransaction } from "@/features/transactions/components/actions";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { listLocks } from "@/features/locks/queries";
import { listPartyOptions } from "@/features/parties/queries";
import { listProjectOptions } from "@/features/projects/queries";
import { listCategories } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { requireStaff } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.transaction.newTitle };

/** Any ACTIVE member may add an entry, so this needs only requireStaff. */
export default async function StaffNewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireStaff();
  const [categories, locks, parties, projects] = await Promise.all([
    listCategories(establishmentId),
    listLocks(establishmentId),
    listPartyOptions(establishmentId),
    listProjectOptions(establishmentId),
  ]);
  const lockedMonths = locks.filter((l) => l.locked).map((l) => l.ym);
  // «تسجيل تكلفة» links here with ?projectId=. Only an ACTIVE إضافة of this
  // establishment is preselected; anything else is ignored, not an error.
  const wanted = (await searchParams).projectId;
  const presetProjectId = projects.find((p) => p.id === wanted && p.status === "ACTIVE")?.id;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {t.transaction.newTitle}
      </h1>
      <TransactionForm
        mode="new"
        action={createTransaction}
        categories={categories}
        parties={parties}
        projects={projects}
        lockedMonths={lockedMonths}
        today={todayISO()}
        presetProjectId={presetProjectId}
        doneHref="/staff/transactions"
      />
    </div>
  );
}
