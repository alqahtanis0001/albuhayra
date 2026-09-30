import type { Metadata } from "next";

import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { Tabs } from "@/components/Tabs";
import { PlusIcon } from "@/components/icons";
import { PartyList } from "@/features/parties/components/PartyList";
import { listParties } from "@/features/parties/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { PartyTypeEnum, type PartyTypeValue } from "@/lib/validation";

export const metadata: Metadata = { title: t.parties.title };

const TAB_KEYS = ["ALL", ...PartyTypeEnum.options] as const;

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireOwner();
  // D2: this month's salary rows exist before anything reads them (cached per request).
  await ensureSalaryInstalments(establishmentId);
  // The URL only narrows the list; anything unrecognised shows them all.
  const parsed = PartyTypeEnum.safeParse((await searchParams).type);
  const type: PartyTypeValue | undefined = parsed.success ? parsed.data : undefined;
  const rows = await listParties(establishmentId, { type });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">{t.parties.title}</h1>
        <LinkButton href="/owner/parties/new" className="no-print">
          <PlusIcon size={18} />
          {t.parties.add}
        </LinkButton>
      </div>

      <Tabs
        label={t.partyType.label}
        active={type ?? "ALL"}
        tabs={TAB_KEYS.map((key) => ({
          key,
          label: t.partyTypeTab[key],
          href: key === "ALL" ? "/owner/parties" : `/owner/parties?type=${key}`,
        }))}
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        {rows.length === 0 ? (
          <EmptyState
            title={type ? t.parties.emptyFiltered : t.parties.empty}
            hint={type ? undefined : t.parties.emptyHint}
            kind={type ? undefined : "parties"}
          />
        ) : (
          <PartyList rows={rows} />
        )}
      </div>
      <p className="text-xs text-gray-600">{t.parties.balanceHint}</p>
    </div>
  );
}
