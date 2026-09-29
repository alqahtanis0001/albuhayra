import type { ReactNode } from "react";

import { BrandMark } from "@/components/chrome/BrandMark";
import { t } from "@/i18n/ar";

/** The framed box every auth screen sits in. */
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
    <div className="w-full">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <BrandMark size={56} />
        <p className="text-xl font-bold text-gray-900">{t.app.name}</p>
        <p className="text-sm text-gray-600">{t.app.tagline}</p>
      </div>

      <section className="rounded-lg border border-t-4 border-gray-300 border-t-accent bg-white p-5">
        <h1 className="border-b border-gray-200 pb-3 text-start text-lg font-bold text-gray-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-start text-sm text-gray-600">{subtitle}</p>
        ) : null}
        <div className="mt-4">{children}</div>
      </section>

      {footer ? <div className="mt-4 text-center text-sm">{footer}</div> : null}
    </div>
  );
}

export default AuthCard;
