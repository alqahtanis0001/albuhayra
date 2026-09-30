/**
 * Owner home: «الإضافات الجارية» — the three ACTIVE إضافات with the highest
 * spend (Decision 8), each with flow's v1.3 `BudgetMeter` (fill coloured by
 * how much of the budget is spent, amounts under the bar), or the spend alone
 * without a budget. Hidden when there are none.
 */
import Link from "next/link";

import { Card } from "@/components/Card";
import { BudgetMeter } from "@/features/projects/components/ProjectBits";
import type { ProjectRow } from "@/features/projects/queries";
import { t } from "@/i18n/ar";

export function ActiveProjects({ rows }: { rows: ProjectRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Card
      title={t.projects.activeOnHome}
      action={
        <Link href="/owner/projects" className="text-sm text-accent-dark underline-offset-2 hover:underline">
          {t.projects.viewAll}
        </Link>
      }
      bodyClassName=""
    >
      <ul>
        {rows.map((row) => (
          <li key={row.id} className="border-b border-gray-200 last:border-b-0">
            <Link href={`/owner/projects/${row.id}`} className="flex flex-col gap-2 p-3 hover:bg-gray-50">
              <span className="font-medium text-gray-900">{row.name}</span>
              <BudgetMeter
                budgetHalalas={row.budgetHalalas}
                spentHalalas={row.spentHalalas}
                remainingHalalas={row.remainingHalalas}
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default ActiveProjects;
