/**
 * v1.4 (docs/V14-SPEC.md B3): /owner/transactions has two tabs — «الحركات»
 * (today's ledger, default) and «الأنشطة» (`?tab=activities`, the projects
 * list). Pure helpers, so the URL rules are unit-testable and shared by the
 * ledger page and the /owner/projects redirect. `tab` is not a ledger filter:
 * `TransactionFilterSchema` strips it, and no ledger link emits it, so every
 * filter and paging link lands on the entries tab.
 */
import { ProjectStatusEnum, type ProjectStatusValue } from "@/lib/validation";

export type LedgerTab = "entries" | "activities";

export const ACTIVITIES_HREF = "/owner/transactions?tab=activities";

/** Only the exact single value "activities" selects that tab; anything else is the ledger. */
export function ledgerTab(raw: string | string[] | undefined): LedgerTab {
  return raw === "activities" ? "activities" : "entries";
}

/** The activities status filter, or undefined for every status (the URL only narrows). */
export function parseActivitiesStatus(raw: string | string[] | undefined): ProjectStatusValue | undefined {
  const parsed = ProjectStatusEnum.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/** The activities tab, narrowed to `status` when given — never through the redirect (A4). */
export function activitiesHref(status?: ProjectStatusValue): string {
  return status ? `${ACTIVITIES_HREF}&status=${status}` : ACTIVITIES_HREF;
}
