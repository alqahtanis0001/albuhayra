/**
 * Version and contact line under every screen. Hidden in print, so the report
 * printout is unchanged. The version comes from package.json, so bumping it
 * there is the only step needed; this is a server component, so the file is
 * read at build time and never shipped to the browser. The version and the
 * email are LTR runs inside RTL text, hence the <bdi>.
 */
import { t } from "@/i18n/ar";

import pkg from "../../../package.json";

export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer
      className={["no-print border-t border-gray-200 bg-white", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs text-gray-600">
        <p>
          {t.app.name} · {t.footer.version} <bdi dir="ltr">{pkg.version}</bdi>
        </p>
        <p>
          {t.footer.contactLabel} <bdi dir="ltr">{t.footer.contactValue}</bdi>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
