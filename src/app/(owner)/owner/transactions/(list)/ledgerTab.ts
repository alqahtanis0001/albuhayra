/**
 * v1.4 (docs/V14-SPEC.md B3): /owner/transactions has two tabs — «الحركات»
 * (today's ledger, default) and «الأنشطة» (`?tab=activities`, the projects
 * list). v1.5 (docs/V15-SPEC.md B2, D14, D24) adds «التقارير»
 * (`?tab=reports`), with its own sub-tab `report` («حسب التصنيف» by default,
 * `&report=aging`). Pure helpers, so the URL rules are unit-testable and shared
 * by the ledger page and the /owner/projects and /owner/reports redirects. `tab`
 * and `report` are not ledger filters: `TransactionFilterSchema` strips them,
 * and no ledger link emits them, so every filter and paging link lands on the
 * entries tab.
 */
import { ProjectStatusEnum, type ProjectStatusValue } from "@/lib/validation";

export type LedgerTab = "entries" | "activities" | "reports";

/** The reports tab's two reports — the keys `ReportTabs` marks active. */
export type ReportKind = "category" | "aging";

export const ACTIVITIES_HREF = "/owner/transactions?tab=activities";
export const REPORTS_HREF = "/owner/transactions?tab=reports";
export const AGING_HREF = "/owner/transactions?tab=reports&report=aging";

/** Only an exact single value selects a tab ("activities", "reports"); anything else is the ledger. */
export function ledgerTab(raw: string | string[] | undefined): LedgerTab {
  if (raw === "activities") return "activities";
  if (raw === "reports") return "reports";
  return "entries";
}

/** Only the exact single value "aging" selects that report; anything else is the category report. */
export function reportKind(raw: string | string[] | undefined): ReportKind {
  return raw === "aging" ? "aging" : "category";
}

/**
 * D14, D24: where /owner/reports (`kind` "category") and /owner/reports/aging
 * send an old link — the reports tab first, then the rest of the query. `tab`
 * and `report` are set, never copied from the old query, so a stray one there
 * cannot duplicate the key or pick another tab or report.
 */
export function reportsRedirectHref(
  query: Record<string, string | string[] | undefined>,
  kind: ReportKind,
): string {
  const params = new URLSearchParams();
  params.set("tab", "reports");
  if (kind === "aging") params.set("report", "aging");
  for (const [key, value] of Object.entries(query)) {
    if (key === "tab" || key === "report") continue;
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  }
  return `/owner/transactions?${params.toString()}`;
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
