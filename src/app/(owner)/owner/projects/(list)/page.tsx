import { redirect } from "next/navigation";

import { requireOwner } from "@/lib/auth";

import { activitiesHref, parseActivitiesStatus } from "../../transactions/(list)/ledgerTab";

/**
 * v1.4 (docs/V14-SPEC.md B3): the projects list now lives in the «الأنشطة» tab
 * of السجل. Old links and bookmarks land here and are sent on, keeping a
 * `status` only when it is one the list accepts (A4). No loading.tsx beside
 * this page: a redirect-only page must answer 307, not stream (D13).
 * `redirect()` throws, so it sits outside any try/catch. /owner/projects/new,
 * [id] and [id]/edit are untouched.
 */
export default async function ProjectsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const status = parseActivitiesStatus((await searchParams).status);
  redirect(activitiesHref(status));
}
