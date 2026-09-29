/**
 * 50 rows per page (PAGE_SIZE). Page lives in the URL, so the ledger stays a
 * server component; every other filter in `params` is carried across.
 */
import Link from "next/link";

import { t } from "@/i18n/ar";
import { PAGE_SIZE } from "@/lib/validation";

import { ChevronEndIcon, ChevronStartIcon } from "./icons";

export type PaginationProps = {
  page: number;
  total: number;
  /** Path without the query string, e.g. "/owner/transactions". */
  basePath: string;
  /** The current filters, minus `page`. */
  params?: Record<string, string | undefined>;
  pageSize?: number;
};

export function Pagination({
  page,
  total,
  basePath,
  params = {},
  pageSize = PAGE_SIZE,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav
      aria-label={t.common.page}
      className="no-print flex items-center justify-between gap-2 py-3"
    >
      <PageLink
        href={href(page - 1)}
        disabled={page <= 1}
        label={t.common.previous}
        icon={<ChevronStartIcon size={18} />}
      />
      <p className="text-sm text-gray-600">
        {t.common.page} <bdi className="tabular-nums">{page}</bdi> {t.common.of}{" "}
        <bdi className="tabular-nums">{pageCount}</bdi>
      </p>
      <PageLink
        href={href(page + 1)}
        disabled={page >= pageCount}
        label={t.common.next}
        icon={<ChevronEndIcon size={18} />}
      />
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  icon,
}: {
  href: string;
  disabled: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  const shape =
    "inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm font-medium";

  if (disabled) {
    return (
      <span aria-disabled="true" className={`${shape} border-gray-200 text-gray-400`}>
        {icon}
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={`${shape} border-gray-300 bg-white text-gray-900 hover:bg-gray-50`}>
      {icon}
      {label}
    </Link>
  );
}

export default Pagination;
