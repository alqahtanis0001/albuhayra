import { DateText } from "@/components/DateText";
import { t } from "@/i18n/ar";

/**
 * Print only: the sheet has to say whose books these are and for when, because
 * it leaves the screen where the nav answered both. Above that, the brand: the
 * outline icon in its own colour and the app name in the brand face, over a
 * green rule; the print stylesheet keeps the colour with print-color-adjust.
 *
 * The inner wrappers carry the flex and grid because the unlayered print rule
 * `.print-only { display: block }` beats any layout utility on the header
 * itself. The icon's alt is empty: the name beside it says the same thing.
 */
export function PrintHeader({
  establishmentName,
  from,
  to,
  title,
  subject,
  printedAt,
}: {
  establishmentName: string | null;
  /** The report's period; omitted by documents that have none (v1.2a summaries). */
  from?: string;
  to?: string;
  /** v1.2a: the document's name under the brand, e.g. «ملخص الإضافة». */
  title?: string;
  /** v1.2a: what the document is about — the إضافة's or the party's name. */
  subject?: string;
  /** `YYYY-MM-DD` from todayISO() — the server render, not the moment of printing. */
  printedAt: string;
}) {
  return (
    <header className="print-only">
      <div className="flex items-center gap-3 border-b-2 border-accent pb-3">
        <img
          src="/brand/zakham-brand/icon-512-outline.png"
          alt=""
          width={512}
          height={512}
          className="h-12 w-12 shrink-0"
        />
        <span className="font-brand text-2xl text-accent">{t.app.name}</span>
      </div>
      {title ? <p className="mt-3 text-lg font-semibold text-gray-900">{title}</p> : null}
      {subject ? <p className="text-base font-semibold text-accent-dark">{subject}</p> : null}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-gray-600">{t.reports.printedFor}</dt>
        <dd className="text-base font-semibold text-gray-900">{establishmentName}</dd>
        {from && to ? (
          <>
            <dt className="text-gray-600">{t.reports.rangeLabel}</dt>
            <dd className="text-gray-900">
              <bdi>{from}</bdi> — <bdi>{to}</bdi>
            </dd>
          </>
        ) : null}
        <dt className="text-gray-600">{t.print.printedAt}</dt>
        <dd className="text-gray-900">
          {/* items-start: a stretched LTR <bdi> would push the digits to the
              far (left) edge of the row. */}
          <DateText date={printedAt} className="items-start" />
        </dd>
      </dl>
    </header>
  );
}

export default PrintHeader;
