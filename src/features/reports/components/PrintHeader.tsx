import { t } from "@/i18n/ar";

/**
 * Print only: the sheet has to say whose books these are and for when, because
 * it leaves the screen where the nav answered both. Above that, the brand: the
 * outline icon and the app name in the brand face.
 *
 * The icon row is an inner div because the unlayered print rule
 * `.print-only { display: block }` beats `flex` on the header itself. The icon
 * is `grayscale` because the print stylesheet recolours text and backgrounds
 * only, not images. Its alt is empty: the name beside it says the same thing.
 */
export function PrintHeader({
  establishmentName,
  from,
  to,
}: {
  establishmentName: string | null;
  from: string;
  to: string;
}) {
  return (
    <header className="print-only">
      <div className="mb-2 flex items-center gap-2">
        <img
          src="/brand/zakham-brand/icon-512-outline.png"
          alt=""
          width={512}
          height={512}
          className="h-10 w-10 shrink-0 grayscale"
        />
        <span className="font-brand text-xl">{t.app.name}</span>
      </div>
      <p className="text-lg font-semibold">
        {t.reports.printedFor}: {establishmentName}
      </p>
      <p className="text-sm">
        {t.reports.rangeLabel}: <bdi>{from}</bdi> — <bdi>{to}</bdi>
      </p>
    </header>
  );
}

export default PrintHeader;
