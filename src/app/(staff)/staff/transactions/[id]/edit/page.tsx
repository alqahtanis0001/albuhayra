import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateTransaction } from "@/features/transactions/components/actions";
import { salaryCategoryIds } from "@/features/payroll/privacy";
import { StaffSalaryNote } from "@/features/transactions/components/StaffSalaryNote";
import { getTransaction } from "@/features/transactions/components/data";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { listLocks } from "@/features/locks/queries";
import { listPartyOptions } from "@/features/parties/queries";
import { getPaymentLink } from "@/features/plans/dues";
import { listProjectOptions } from "@/features/projects/queries";
import { PaymentBanner } from "@/features/transactions/components/PaymentBanner";
import { listCategories } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { requireCanEdit } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.transaction.editTitle };

/**
 * `requireCanEdit()`, not `requireStaff()`: this route is only reachable while
 * the owner leaves the employee's `canEdit` on, and that is re-read from the
 * database here rather than trusted from the session or from the ledger having
 * rendered an edit link.
 */
export default async function StaffEditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { establishmentId } = await requireCanEdit();

  const [row, categories, locks, parties, projects, salaryIds] = await Promise.all([
    // Spec §3.5: a salary-linked entry reads as missing to staff (notFound below).
    getTransaction(establishmentId, id, { hideSalary: true }),
    listCategories(establishmentId),
    listLocks(establishmentId),
    listPartyOptions(establishmentId),
    listProjectOptions(establishmentId),
    salaryCategoryIds(establishmentId),
  ]);
  if (!row) notFound();
  // A payment keeps its plan's direction and party (W1): locked, not editable.
  const link = row.instalmentId ? await getPaymentLink(establishmentId, row.instalmentId) : null;
  const lockedMonths = locks.filter((l) => l.locked).map((l) => l.ym);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {t.transaction.editTitle}
      </h1>
      <TransactionForm
        mode="edit"
        action={updateTransaction.bind(null, row.id)}
        categories={categories}
        parties={parties}
        projects={projects}
        lockedMonths={lockedMonths}
        today={todayISO()}
        doneHref="/staff/transactions"
        initial={row}
        payment={link ? { direction: link.direction } : undefined}
        banner={
          link ? (
            <PaymentBanner
              mode="edit"
              direction={link.direction}
              partyId={link.partyId}
              partyName={link.partyName}
            />
          ) : (
            <StaffSalaryNote salaryCategoryIds={salaryIds} parties={parties} />
          )
        }
      />
    </div>
  );
}
