import type { ReactNode } from "react";

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
      <div className="mb-6 text-center">
        <p className="text-lg font-semibold text-accent-dark">{t.app.name}</p>
        <p className="text-sm text-gray-600">{t.app.tagline}</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-start text-lg font-semibold text-gray-900">{title}</h1>
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
