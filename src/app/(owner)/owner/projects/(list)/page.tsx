import type { Metadata } from "next";

import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { Tabs } from "@/components/Tabs";
import { PlusIcon } from "@/components/icons";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { listProjects } from "@/features/projects/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { ProjectStatusEnum, type ProjectStatusValue } from "@/lib/validation";

export const metadata: Metadata = { title: t.projects.listTitle };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireOwner();
  // The URL only narrows the list; anything unrecognised shows every status.
  const parsed = ProjectStatusEnum.safeParse((await searchParams).status);
  const status: ProjectStatusValue | undefined = parsed.success ? parsed.data : undefined;
  const rows = await listProjects(establishmentId, { status });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">{t.projects.listTitle}</h1>
        <LinkButton href="/owner/projects/new" className="no-print">
          <PlusIcon size={18} />
          {t.projects.add}
        </LinkButton>
      </div>

      <Tabs
        label={t.projectStatus.label}
        active={status ?? "ALL"}
        tabs={[
          { key: "ALL", label: t.plans.allStatuses, href: "/owner/projects" },
          ...ProjectStatusEnum.options.map((key) => ({
            key,
            label: t.projectStatus[key],
            href: `/owner/projects?status=${key}`,
          })),
        ]}
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState
            title={status ? t.projects.emptyFiltered : t.projects.empty}
            hint={status ? undefined : t.projects.emptyHint}
          />
        </div>
      ) : (
        <ProjectList rows={rows} />
      )}
    </div>
  );
}
