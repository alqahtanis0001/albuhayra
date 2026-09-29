import type { Metadata } from "next";

import { createTransaction } from "@/features/transactions/components/actions";
import { listCategories } from "@/features/settings/queries";
import { listLocks } from "@/features/locks/queries";
import { listPartyOptions } from "@/features/parties/queries";
import { listProjectOptions } from "@/features/projects/queries";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.transaction.newTitle };

export default async function OwnerNewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireOwner();
  const [categories, locks, parties, projects] = await Promise.all([
    listCategories(establishmentId),
    listLocks(establishmentId),
    listPartyOptions(establishmentId),
    listProjectOptions(establishmentId),
  ]);
  // The form only needs which months are closed, not the whole lock row.
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
        // From «تسجيل تكلفة», حفظ goes back to the إضافة.
        doneHref={presetProjectId ? `/owner/projects/${presetProjectId}` : "/owner/transactions"}
      />
    </div>
  );
}
