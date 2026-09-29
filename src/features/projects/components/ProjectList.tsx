/**
 * قائمة الإضافات: one card per إضافة — name, status, what it has cost against
 * its budget, and its dates. The whole card leads to the إضافة's page.
 */
import Link from "next/link";

import type { ProjectRow } from "@/features/projects/queries";

import { BudgetMeter, ProjectDates, ProjectStatusBadge } from "./ProjectBits";

export function ProjectList({ rows }: { rows: ProjectRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/owner/projects/${row.id}`}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-[scale,background-color] duration-[80ms] ease-out hover:bg-gray-50 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 font-semibold text-gray-900">{row.name}</span>
              <ProjectStatusBadge status={row.status} />
            </div>
            <BudgetMeter
              budgetHalalas={row.budgetHalalas}
              spentHalalas={row.spentHalalas}
              remainingHalalas={row.remainingHalalas}
            />
            <ProjectDates startDate={row.startDate} endDate={row.endDate} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default ProjectList;
