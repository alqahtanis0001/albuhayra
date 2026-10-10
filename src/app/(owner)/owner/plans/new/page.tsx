import type { Metadata } from "next";

import { listPartyOptions } from "@/features/parties/queries";
import { createPlan } from "@/features/plans/actions";
import { OpenPlanForm } from "@/features/plans/components/OpenPlanForm";
import { DEFAULT_DIRECTION } from "@/features/plans/components/PlanBits";
import { PlanForm } from "@/features/plans/components/PlanForm";
import { PlanKindCards } from "@/features/plans/components/PlanKindCards";
import { createOpenPlan } from "@/features/plans/openActions";
import { listCategories } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.plans.newTitle };

/**
 * v1.4 C2 (Q13 ruling): without `?kind=` the page shows the two choice cards;
 * `?kind=fixed` is today's scheduled form, `?kind=open` the open-ended one.
 * The cards carry a `?partyId=` through.
 */
export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireOwner();
  const sp = await searchParams;
  const kind = sp.kind === "fixed" || sp.kind === "open" ? sp.kind : null;
  const [parties, categories] = await Promise.all([
    listPartyOptions(establishmentId),
    listCategories(establishmentId),
  ]);
  // A party's page may link here with ?partyId=; only an active party of this
  // establishment is preselected.
  const wanted = sp.partyId;
  const party = parties.find((p) => p.id === wanted && p.active);
  const today = todayISO();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.plans.newTitle}</h1>
      {kind === null ? (
        <PlanKindCards partyId={party?.id} />
      ) : kind === "open" ? (
        <OpenPlanForm
          action={createOpenPlan}
          parties={parties}
          categories={categories}
          today={today}
          initial={{
            partyId: party?.id ?? "",
            direction: party ? DEFAULT_DIRECTION[party.type] : "",
            title: "",
            total: "",
            categoryId: "",
            startDate: today,
            expectedEndDate: "",
            notes: "",
          }}
        />
      ) : (
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
            startDate: today,
            reminderDays: "3",
            notes: "",
            rows: [],
          }}
        />
      )}
    </div>
  );
}
