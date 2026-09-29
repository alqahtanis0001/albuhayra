import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { t } from "@/i18n/ar";
import { updateCategory } from "@/features/settings/actions";
import type { CategoryRow } from "@/features/settings/queries";
import type { DirectionValue } from "@/lib/validation";

import { AddCategoryForm, RenameCategoryForm } from "./CategoryForms";
import { CategoryRowActions } from "./CategoryRowActions";

/** One list per direction: a category belongs to exactly one, permanently. */
export function CategoriesTab({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <DirectionGroup
        title={t.settings.categoriesIn}
        type="IN"
        rows={categories.filter((c) => c.type === "IN")}
      />
      <DirectionGroup
        title={t.settings.categoriesOut}
        type="OUT"
        rows={categories.filter((c) => c.type === "OUT")}
      />
    </div>
  );
}

function DirectionGroup({
  title,
  type,
  rows,
}: {
  title: string;
  type: DirectionValue;
  rows: CategoryRow[];
}) {
  // The arrows are bounded by position among the *active* rows only, since
  // inactive ones have no arrows and cannot be a move target.
  const active = rows.filter((r) => r.active);

  return (
    <Card title={title} bodyClassName="">
      {rows.length === 0 ? (
        <EmptyState title={t.reports.empty} />
      ) : (
        <ul>
          {rows.map((row) => {
            const index = active.findIndex((r) => r.id === row.id);
            return (
              <li
                key={row.id}
                className="flex flex-col gap-2 border-b border-gray-200 p-3 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      row.active ? "font-medium text-gray-900" : "text-gray-500"
                    }
                  >
                    {row.active ? row.nameAr : `${row.nameAr} (${t.status.DISABLED})`}
                  </span>
                  <CategoryRowActions
                    id={row.id}
                    active={row.active}
                    isFirst={index === 0}
                    isLast={index === active.length - 1}
                    isOnlyActive={active.length === 1}
                  />
                </div>
                <RenameCategoryForm
                  action={updateCategory.bind(null, row.id)}
                  id={row.id}
                  type={row.type}
                  currentName={row.nameAr}
                />
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-gray-200">
        <AddCategoryForm type={type} />
      </div>
    </Card>
  );
}

export default CategoriesTab;
