import type { Metadata } from "next";

import { CategoriesTab } from "@/features/settings/components/CategoriesTab";
import { listCategories } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.categories };

export default async function CategoriesSettingsPage() {
  const { establishmentId } = await requireOwner();
  const categories = await listCategories(establishmentId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.navItem.categories}</h1>
      <CategoriesTab categories={categories} />
    </div>
  );
}
