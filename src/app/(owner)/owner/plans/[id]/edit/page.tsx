import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/Card";
import { LinkButton } from "@/components/LinkButton";
import { listPartyOptions } from "@/features/parties/queries";
import { updatePlan } from "@/features/plans/actions";
import { PlanForm } from "@/features/plans/components/PlanForm";
import { toAmountText } from "@/features/plans/components/scheduleDraft";
import { getPlan } from "@/features/plans/queries";
import { listCategories } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.plans.editTitle };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { establishmentId } = await requireOwner();
  // The id comes from the route only; another establishment's reads as missing.
  const { id } = await params;
  const [plan, parties, categories] = await Promise.all([
    getPlan(establishmentId, id),
    listPartyOptions(establishmentId),
    listCategories(establishmentId),
  ]);
  if (!plan) notFound();
  const closed = plan.status === "ARCHIVED" || plan.status === "CANCELLED";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.plans.editTitle}</h1>
      {closed ? (
        // updatePlan refuses a closed plan (err.planClosed); say so up front.
        <Card>
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-gray-700">{t.err.planClosed}</p>
            <LinkButton href={`/owner/plans/${plan.id}`} variant="secondary">
              {t.common.back}
            </LinkButton>
          </div>
        </Card>
      ) : (
        <PlanForm
          action={updatePlan.bind(null, plan.id)}
          planId={plan.id}
          parties={parties}
          categories={categories}
          initial={{
            partyId: plan.partyId,
            direction: plan.direction,
            title: plan.title,
            total: toAmountText(plan.totalHalalas),
            categoryId: plan.categoryId,
            startDate: plan.startDate,
            reminderDays: String(plan.reminderDays),
            notes: plan.notes ?? "",
            rows: plan.instalments.map((row) => ({
              key: row.id,
              id: row.id,
              dueDate: row.dueDate,
              amount: toAmountText(row.amountDueHalalas),
              fixed: row.fixed,
            })),
          }}
        />
      )}
    </div>
  );
}
