/**
 * Building blocks for the loading.tsx skeletons (docs/FRONTEND.md, "Loading,
 * not found, errors, transitions"). Server components, no data, no client code.
 *
 * Blocks are gray-200 on white surfaces. A block that sits directly on the
 * gray-50 body takes `onBody` (gray-300), because gray-200 there all but
 * disappears. The pulse is opacity-only and `motion-safe:`, and there is no
 * gradient shimmer: a physical left-to-right gradient runs the wrong way in RTL.
 */
import type { ReactNode } from "react";

import { t } from "@/i18n/ar";

/**
 * The single live region of a loading file. Screen readers hear "جارٍ التحميل…"
 * once; every shape inside is aria-hidden.
 */
export function SkeletonPage({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{t.common.loading}</span>
      <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
        {children}
      </div>
    </div>
  );
}

export function Bone({ className = "", onBody = false }: { className?: string; onBody?: boolean }) {
  return <div className={`rounded-sm ${onBody ? "bg-gray-300" : "bg-gray-200"} ${className}`} />;
}

/** The page heading, optionally with the green "add" button beside it. */
export function SkeletonHeader({ action = false }: { action?: boolean }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2">
      <Bone onBody className="h-7 w-40" />
      {action ? <Bone onBody className="h-11 w-28" /> : null}
    </div>
  );
}

/** A white card like `<Card>`, with a title bar when `title` is set. */
export function SkeletonCard({
  title = false,
  className = "",
  children,
}: {
  title?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white ${className}`}>
      {title ? (
        <div className="border-b border-gray-200 px-4 py-3">
          <Bone className="h-5 w-36" />
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** `spark` (v1.3): reserve the owner cards' 30-day sparkline, so the swap moves nothing. */
export function SkeletonStatCards({ count, spark = false }: { count: number; spark?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
          <Bone className="h-4 w-24" />
          <Bone className="mt-2 h-7 w-32 max-w-full" />
          {spark ? <Bone className="mt-2 h-8 w-full" /> : null}
        </div>
      ))}
    </div>
  );
}

/** List or table rows: two lines of text at the start, an amount at the end. */
export function SkeletonRows({ count }: { count: number }) {
  return (
    <ul>
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-3 border-b border-gray-200 p-3 last:border-b-0"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Bone className="h-4 w-40 max-w-full" />
            <Bone className="h-3 w-24" />
          </div>
          <Bone className="h-5 w-20" />
        </li>
      ))}
    </ul>
  );
}

/** A labelled input: the label as a block, the box drawn like the real one. */
export function SkeletonField({ onBody = false, tall = false }: { onBody?: boolean; tall?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <Bone onBody={onBody} className="h-4 w-24" />
      <div
        className={`rounded-lg border border-gray-300 bg-white ${tall ? "min-h-24" : "min-h-11"}`}
      />
    </div>
  );
}

export function SkeletonButtons({ count = 1, onBody = false }: { count?: number; onBody?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} onBody={onBody} className="h-11 w-24" />
      ))}
    </div>
  );
}

/** The underlined tab strip used by the settings page. */
export function SkeletonTabs({ count }: { count: number }) {
  return (
    <div className="flex gap-4 overflow-hidden border-b border-gray-200 pb-3">
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} onBody className="h-5 w-16 shrink-0" />
      ))}
    </div>
  );
}
