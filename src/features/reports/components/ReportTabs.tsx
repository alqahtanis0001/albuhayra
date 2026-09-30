/**
 * v1.2c: التقارير has two tabs — the existing report «حسب التصنيف» and
 * «أعمار المستحقات» (C13). Link tabs, so each is a URL and a server page.
 */
import { Tabs } from "@/components/Tabs";
import { t } from "@/i18n/ar";

export function ReportTabs({ active }: { active: "category" | "aging" }) {
  return (
    <Tabs
      label={t.reports.title}
      active={active}
      tabs={[
        { key: "category", label: t.reportFilter.byCategoryTab, href: "/owner/reports" },
        { key: "aging", label: t.aging.tab, href: "/owner/reports/aging" },
      ]}
    />
  );
}

export default ReportTabs;
