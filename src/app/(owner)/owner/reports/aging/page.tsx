import { redirect } from "next/navigation";

import { requireOwner } from "@/lib/auth";

import { reportsRedirectHref } from "../../transactions/(list)/ledgerTab";

/**
 * v1.5 (docs/V15-SPEC.md B2, D14): أعمار المستحقات is now the «المتأخرات حسب
 * المدة» sub-tab of السجل › التقارير. Old links land here and are sent on with
 * their query kept. No loading.tsx: a redirect-only page answers 307 (v1.4
 * D13); `redirect()` sits outside any try/catch.
 */
export default async function AgingRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  redirect(reportsRedirectHref(await searchParams, "aging"));
}
