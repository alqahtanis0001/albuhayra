/**
 * v1.2c: the report has two tabs — «حسب التصنيف» and «المتأخرات حسب المدة»
 * (C13). v1.5 (B2, D24): the strip is the sub-tab row inside السجل's
 * «التقارير» tab, so its hrefs point there (ledgerTab.ts REPORTS_HREF /
 * AGING_HREF — pinned equal by a test). Link tabs, so each is a URL.
 */
import { Tabs } from "@/components/Tabs";
import { t } from "@/i18n/ar";

export function ReportTabs({ active }: { active: "category" | "aging" }) {
  return (
    <Tabs
      label={t.reportsTabs.label}
      active={active}
      tabs={[
        { key: "category", label: t.reportFilter.byCategoryTab, href: "/owner/transactions?tab=reports" },
        { key: "aging", label: t.aging.tab, href: "/owner/transactions?tab=reports&report=aging" },
      ]}
    />
  );
}

export default ReportTabs;
