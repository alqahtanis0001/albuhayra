import type { Metadata } from "next";
import Link from "next/link";

import { CategoriesTab } from "@/features/settings/components/CategoriesTab";
import { listCategories } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.categories };

/**
 * v1.4 A5: every function stays (list, add, rename, activate/deactivate, move);
 * the page left the menus, so it gets a back link and a hint that the entry form
 * now does the everyday part. «← الإعدادات» is the spec's text, kept verbatim
 * (Q6); /owner/settings lands on رمز الانضمام since D11.
 */
export default async function CategoriesSettingsPage() {
  const { establishmentId } = await requireOwner();
  const categories = await listCategories(establishmentId);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/owner/settings"
        className="no-print inline-flex min-h-11 items-center self-start text-sm font-medium text-accent-dark hover:underline"
      >
        {t.categoriesPage.back}
      </Link>
      <h1 className="text-xl font-semibold text-gray-900">{t.navItem.categories}</h1>
      <p className="text-sm text-gray-600">{t.categoriesPage.hint}</p>
      <CategoriesTab categories={categories} />
    </div>
  );
}
