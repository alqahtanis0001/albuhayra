import { t } from "@/i18n/ar";

/**
 * Print only: one closing line after the last table. An ordinary element at the
 * end of the page, so it prints once. Never `position: fixed` — Chrome repeats a
 * fixed element on every page without reserving room, so it would overprint the
 * last lines of each. Page numbers come from the @page margin box instead.
 */
export function PrintFooter() {
  return (
    <p className="print-only report-print-footer">{t.print.generatedBy}</p>
  );
}

export default PrintFooter;
