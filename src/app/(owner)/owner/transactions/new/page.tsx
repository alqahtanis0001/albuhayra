import type { Metadata } from "next";

import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { createTransaction } from "@/features/transactions/components/actions";
import { listCategories } from "@/features/settings/queries";
import { listLocks } from "@/features/locks/queries";
import { listPartyOptions } from "@/features/parties/queries";
import { getInstalmentForPayment } from "@/features/plans/dues";
import { listProjectOptions } from "@/features/projects/queries";
import { PaymentBanner } from "@/features/transactions/components/PaymentBanner";
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
  // D2: this month's salary rows exist before anything reads them (cached per request).
  await ensureSalaryInstalments(establishmentId);
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
  const sp = await searchParams;
  const presetProjectId = projects.find((p) => p.id === sp.projectId && p.status === "ACTIVE")?.id;
  // «تسجيل دفعة» links here with ?instalmentId= (it wins over ?projectId=, W9,
  // though a valid project still preselects). Unknown, closed or fully paid →
  // the ordinary form with a toast.
  const pay =
    typeof sp.instalmentId === "string"
      ? await getInstalmentForPayment(establishmentId, sp.instalmentId)
      : null;
  const notice = sp.instalmentId !== undefined && !pay ? "err.instalmentInvalid" : undefined;
  const doneHref = pay
    ? `/owner/plans/${pay.planId}`
    : presetProjectId
      ? `/owner/projects/${presetProjectId}`
      : "/owner/transactions";

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
        // حفظ returns to the plan (payment) or the إضافة («تسجيل تكلفة»).
        doneHref={doneHref}
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
              plan={{
                planId: pay.planId,
                planTitle: pay.planTitle,
                seq: pay.seq,
                periodYm: pay.periodYm,
                planRemainingHalalas: pay.planRemainingHalalas,
              }}
            />
          ) : undefined
        }
      />
    </div>
  );
}
