import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateProject } from "@/features/projects/actions";
import { ProjectForm } from "@/features/projects/components/ProjectForm";
import { getProject } from "@/features/projects/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.projects.editTitle };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { establishmentId } = await requireOwner();
  // The id comes from the route only; another establishment's reads as missing.
  const { id } = await params;
  const project = await getProject(establishmentId, id);
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.projects.editTitle}</h1>
      <ProjectForm
        action={updateProject.bind(null, project.id)}
        projectId={project.id}
        initial={{
          name: project.name,
          description: project.description ?? "",
          budget: project.budgetHalalas === null ? "" : (project.budgetHalalas / 100).toFixed(2),
          startDate: project.startDate,
          endDate: project.endDate ?? "",
        }}
      />
    </div>
  );
}
