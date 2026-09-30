import type { Metadata } from "next";

import { createTransaction } from "@/features/transactions/components/actions";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { listLocks } from "@/features/locks/queries";
import { listPartyOptions } from "@/features/parties/queries";
import { getStaffPaymentPrefill } from "@/features/plans/dues";
import { listProjectOptions } from "@/features/projects/queries";
import { PaymentBanner } from "@/features/transactions/components/PaymentBanner";
import { salaryCategoryIds } from "@/features/payroll/privacy";
import { StaffSalaryNote } from "@/features/transactions/components/StaffSalaryNote";
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
  const { user, establishmentId } = await requireStaff();
  const [categories, locks, parties, projects, salaryIds] = await Promise.all([
    listCategories(establishmentId),
    listLocks(establishmentId),
    listPartyOptions(establishmentId),
    listProjectOptions(establishmentId),
    salaryCategoryIds(establishmentId),
  ]);
  const lockedMonths = locks.filter((l) => l.locked).map((l) => l.ym);
  // «تسجيل تكلفة» links here with ?projectId=. Only an ACTIVE إضافة of this
  // establishment is preselected; anything else is ignored, not an error.
  const sp = await searchParams;
  const presetProjectId = projects.find((p) => p.id === sp.projectId && p.status === "ACTIVE")?.id;
  // A payment (?instalmentId=, from the home «المستحقات» card) needs canEdit,
  // so without it nothing about the instalment is read at all (W3c); the
  // prefill carries the party and this instalment's remaining only (W2).
  const pay =
    typeof sp.instalmentId === "string" && user.canEdit
      ? await getStaffPaymentPrefill(establishmentId, sp.instalmentId)
      : null;
  const notice =
    sp.instalmentId === undefined || pay
      ? undefined
      : user.canEdit
        ? "err.instalmentInvalid"
        : "err.forbidden";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {pay ? t.payment.title : t.transaction.newTitle}
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
        doneHref={pay ? "/staff" : "/staff/transactions"}
        notice={notice}
        payment={
          pay
            ? { direction: pay.direction, amountHalalas: pay.instalmentRemainingHalalas, categoryId: pay.categoryId }
            : undefined
        }
        banner={
          pay ? (
            <PaymentBanner
              mode="new"
              direction={pay.direction}
              partyId={pay.partyId}
              partyName={pay.partyName}
              instalmentId={pay.instalmentId}
              instalmentRemainingHalalas={pay.instalmentRemainingHalalas}
            />
          ) : (
            <StaffSalaryNote salaryCategoryIds={salaryIds} parties={parties} />
          )
        }
      />
    </div>
  );
}
