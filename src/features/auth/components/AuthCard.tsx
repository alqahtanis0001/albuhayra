import type { ReactNode } from "react";

import { t } from "@/i18n/ar";

/**
 * The framed box every auth screen and /pending sit in. The green wordmark
 * carries the tagline inside the image, so the tagline is not also rendered as
 * text; the alt says it for screen readers. At 64px tall the tagline stays
 * legible (about 11px glyphs). Since v1.3 the wordmark and the footer link sit
 * inside the white card: the card overlaps the background's dark green band,
 * and a green wordmark or link on that band would lose its contrast.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="w-full rounded-lg border border-t-4 border-gray-300 border-t-accent bg-white p-5 shadow-lg">
      <div className="mb-5 flex justify-center">
        {/* Served as-is from public/brand, never re-encoded; the attributes
            carry the real 3907×988 ratio so nothing shifts on load. */}
        <img
          src="/brand/zakham-brand/zakham-wordmark-green-tagline.png"
          alt={t.brand.logoWithTaglineAlt}
          width={3907}
          height={988}
          className="h-16 w-auto shrink-0"
        />
      </div>

      <h1 className="border-b border-gray-200 pb-3 text-start text-lg font-bold text-gray-900">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-start text-sm text-gray-600">{subtitle}</p>
      ) : null}
      <div className="mt-4">{children}</div>

      {footer ? (
        <div className="mt-5 border-t border-gray-200 pt-4 text-center text-sm">{footer}</div>
      ) : null}
    </section>
  );
}

export default AuthCard;
