import type { Metadata } from "next";

import { listPartyOptions } from "@/features/parties/queries";
import { createPlan } from "@/features/plans/actions";
import { DEFAULT_DIRECTION } from "@/features/plans/components/PlanBits";
import { PlanForm } from "@/features/plans/components/PlanForm";
import { listCategories } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.plans.newTitle };

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireOwner();
  const [parties, categories] = await Promise.all([
    listPartyOptions(establishmentId),
    listCategories(establishmentId),
  ]);
  // A party's page may link here with ?partyId=; only an active party of this
  // establishment is preselected.
  const wanted = (await searchParams).partyId;
  const party = parties.find((p) => p.id === wanted && p.active);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.plans.newTitle}</h1>
      <PlanForm
        action={createPlan}
        parties={parties}
        categories={categories}
        initial={{
          partyId: party?.id ?? "",
          direction: party ? DEFAULT_DIRECTION[party.type] : "",
          title: "",
          total: "",
          categoryId: "",
          startDate: todayISO(),
          reminderDays: "3",
          notes: "",
          rows: [],
        }}
      />
    </div>
  );
}
