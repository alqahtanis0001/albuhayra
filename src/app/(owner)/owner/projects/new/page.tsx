import type { Metadata } from "next";

import { createProject } from "@/features/projects/actions";
import { ProjectForm } from "@/features/projects/components/ProjectForm";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.projects.newTitle };

export default async function NewProjectPage() {
  await requireOwner();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.projects.newTitle}</h1>
      <ProjectForm
        action={createProject}
        initial={{ name: "", description: "", budget: "", startDate: todayISO(), endDate: "" }}
      />
    </div>
  );
}
