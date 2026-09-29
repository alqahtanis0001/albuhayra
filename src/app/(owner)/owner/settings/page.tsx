import type { Metadata } from "next";

import { Tabs } from "@/components/Tabs";
import { CategoriesTab } from "@/features/settings/components/CategoriesTab";
import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { JoinCodeTab } from "@/features/settings/components/JoinCodeTab";
import { LocksTab } from "@/features/settings/components/LocksTab";
import { StaffTab } from "@/features/settings/components/StaffTab";
import {
  parseTab,
  settingsTabs,
  SETTINGS_PATH,
} from "@/features/settings/components/settingsTabs";
import { getJoinCode, listStaff } from "@/features/establishments/queries";
import { listLocks } from "@/features/locks/queries";
import { listCategories } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.settings.title };

export default async function OwnerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireOwner();
  const tab = parseTab((await searchParams).tab);

  // Only the active tab's data is fetched: five tabs' worth of queries on every
  // visit would make the cheap tabs pay for the expensive ones.
  const staff = tab === "staff" ? await listStaff(establishmentId) : [];
  const categories = tab === "categories" ? await listCategories(establishmentId) : [];
  const joinCode = tab === "joinCode" ? await getJoinCode(establishmentId) : null;
  const locks = tab === "locks" ? await listLocks(establishmentId) : [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.settings.title}</h1>

      <Tabs tabs={settingsTabs()} active={tab} label={t.settings.title} />

      {tab === "categories" ? <CategoriesTab categories={categories} /> : null}
      {tab === "staff" ? <StaffTab staff={staff} /> : null}
      {tab === "joinCode" ? <JoinCodeTab code={joinCode} /> : null}
      {tab === "locks" ? <LocksTab locks={locks} /> : null}
      {tab === "account" ? <ChangePasswordForm /> : null}
    </div>
  );
}
