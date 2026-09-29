/**
 * The placeholder mark in the top bar and on the auth screens: a framed green
 * square with three ledger rules. Deliberately abstract. It must never be
 * replaced by the Saudi emblem (palm and swords), a ministry logo, or anything
 * that reads as a gov.sa header, because this is a private app, not a
 * government service. Decorative: the name next to it carries the meaning.
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect width="40" height="40" fill="var(--color-accent)" />
      <rect
        x="4"
        y="4"
        width="32"
        height="32"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
      />
      <path
        d="M12 14h16M12 20h16M18 26h10"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

export default BrandMark;
