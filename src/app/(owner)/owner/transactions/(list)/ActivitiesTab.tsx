/**
 * The «الأنشطة» tab of /owner/transactions (v1.4 B3): the former /owner/projects
 * page body, unchanged — its status tabs, its empty states and the projects
 * list component itself — with every status link pointing back into this tab
 * (A4), never through the /owner/projects redirect.
 */
import { EmptyState } from "@/components/EmptyState";
import { Tabs } from "@/components/Tabs";
import { ProjectList } from "@/features/projects/components/ProjectList";
import type { ProjectRow } from "@/features/projects/queries";
import { t } from "@/i18n/ar";
import { ProjectStatusEnum, type ProjectStatusValue } from "@/lib/validation";

import { ACTIVITIES_HREF, activitiesHref } from "./ledgerTab";

export function ActivitiesTab({ rows, status }: { rows: ProjectRow[]; status: ProjectStatusValue | undefined }) {
  return (
    <>
      <Tabs
        label={t.projectStatus.label}
        active={status ?? "ALL"}
        tabs={[
          { key: "ALL", label: t.plans.allStatuses, href: ACTIVITIES_HREF },
          ...ProjectStatusEnum.options.map((key) => ({
            key,
            label: t.projectStatus[key],
            href: activitiesHref(key),
          })),
        ]}
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState
            title={status ? t.projects.emptyFiltered : t.projects.empty}
            hint={status ? undefined : t.projects.emptyHint}
            kind={status ? undefined : "projects"}
          />
        </div>
      ) : (
        <ProjectList rows={rows} />
      )}
    </>
  );
}
