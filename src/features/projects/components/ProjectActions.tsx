"use client";

/**
 * An إضافة's controls: تسجيل تكلفة (a new صادر entry pre-linked to it — only
 * while ACTIVE, since a closed إضافة refuses new entries), تعديل, the status
 * moves (تعليم كمكتملة · إلغاء الإضافة on an ACTIVE one, إعادة فتح otherwise —
 * all reversible, so no dialog), طباعة الملخص, and حذف only while no entry
 * has ever pointed at it (a ConfirmDialog; otherwise the reason is shown).
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LinkButton } from "@/components/LinkButton";
import { Toast } from "@/components/Toast";
import { PencilIcon, PlusIcon } from "@/components/icons";
import { deleteProject, setProjectStatus } from "@/features/projects/actions";
import { errorMessage, t } from "@/i18n/ar";
import type { ActionResult, ProjectStatusValue } from "@/lib/validation";

export function ProjectActions({
  projectId,
  status,
  hasHistory,
}: {
  projectId: string;
  status: ProjectStatusValue;
  hasHistory: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = (call: () => Promise<ActionResult<null>>, then: () => void) =>
    start(async () => {
      const result = await call();
      if (result.ok) then();
      else setError(result.error);
    });
  const move = (next: ProjectStatusValue) =>
    run(() => setProjectStatus(projectId, next), () => router.refresh());

  return (
    <div className="no-print flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "ACTIVE" ? (
          <LinkButton href={`/owner/transactions/new?projectId=${projectId}`}>
            <PlusIcon size={18} />
            {t.projects.recordCost}
          </LinkButton>
        ) : null}
        <LinkButton href={`/owner/projects/${projectId}/edit`} variant="secondary">
          <PencilIcon size={18} />
          {t.common.edit}
        </LinkButton>
        {status === "ACTIVE" ? (
          <>
            <Button variant="secondary" pending={pending} onClick={() => move("COMPLETED")}>
              {t.projects.markCompleted}
            </Button>
            <Button variant="secondary" pending={pending} onClick={() => move("CANCELLED")}>
              {t.projects.markCancelled}
            </Button>
          </>
        ) : (
          <Button variant="secondary" pending={pending} onClick={() => move("ACTIVE")}>
            {t.projects.reopen}
          </Button>
        )}
        <Button variant="secondary" onClick={() => window.print()}>
          {t.projects.printSummary}
        </Button>
        {hasHistory ? null : (
          <Button variant="danger" pending={pending} onClick={() => setConfirmDelete(true)}>
            {t.projects.delete}
          </Button>
        )}
      </div>
      {hasHistory ? <p className="text-xs text-gray-600">{t.projects.hasHistoryHint}</p> : null}

      {hasHistory ? null : (
        <ConfirmDialog
          open={confirmDelete}
          title={t.projects.delete}
          message={t.projects.deleteConfirm}
          confirmLabel={t.common.delete}
          pending={pending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            run(() => deleteProject(projectId), () => router.push("/owner/projects"));
          }}
        />
      )}

      {error ? <Toast message={errorMessage(error)} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}

export default ProjectActions;
