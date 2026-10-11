import { redirect } from "next/navigation";

import { requireOwner } from "@/lib/auth";

import { reportsRedirectHref } from "../../transactions/(list)/ledgerTab";

/**
 * v1.5 (docs/V15-SPEC.md B2, D14): the report now lives in the «التقارير» tab
 * of السجل. Old links and bookmarks land here and are sent on with their query
 * (`month`, `from`, `to`, `partyId` …) kept. No loading.tsx beside this page: a
 * redirect-only page must answer 307, not stream (v1.4 D13). `redirect()`
 * throws, so it sits outside any try/catch.
 */
export default async function ReportsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  redirect(reportsRedirectHref(await searchParams, "category"));
}
