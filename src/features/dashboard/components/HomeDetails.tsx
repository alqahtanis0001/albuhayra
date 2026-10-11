"use client";

/**
 * v1.5 (docs/V15-SPEC.md A3, D20, D25): «التفاصيل والرسوم» — a disclosure
 * button and a body holding the six-month card, the expense donut, balance by
 * method and الأنشطة الجارية. The sections arrive as server-rendered
 * `children`; this file imports none of them (D25, pinned by a source test).
 *
 * Not `<details>` (D20): the body stays in the DOM and is hidden by the
 * screen-only `.home-details` CSS — closed below `md` and open from `md` while
 * no choice is known (the server render, so desktop never flashes closed), then
 * by `data-open` once the device's remembered choice or the user's toggle is
 * known. Print matches neither rule, so the body always prints.
 */
import { useEffect, useId, useState, type ReactNode } from "react";

import { ChevronDownIcon } from "@/components/icons";
import { t } from "@/i18n/ar";

import {
  WIDE_QUERY,
  homeDetailsDataOpen,
  isHomeDetailsOpen,
  readHomeDetailsOpen,
  rememberHomeDetailsOpen,
  toggleHomeDetails,
} from "./homeDetailsState";

export function HomeDetails({ children }: { children: ReactNode }) {
  const bodyId = useId();
  const [remembered, setRemembered] = useState<boolean | null>(null);
  const [wide, setWide] = useState(false);

  // Storage and the media query exist only in the browser: read after mount.
  useEffect(() => {
    setRemembered(readHomeDetailsOpen());
    const media = window.matchMedia(WIDE_QUERY);
    setWide(media.matches);
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <HomeDetailsView
      bodyId={bodyId}
      open={isHomeDetailsOpen(remembered, wide)}
      dataOpen={homeDetailsDataOpen(remembered)}
      onToggle={() => setRemembered(toggleHomeDetails(remembered, wide, rememberHomeDetailsOpen))}
    >
      {children}
    </HomeDetailsView>
  );
}

/** The markup, hook-free (D43: rendered with any `open` in the node tests). */
export function HomeDetailsView({
  bodyId,
  open,
  dataOpen,
  onToggle,
  children,
}: {
  bodyId: string;
  open: boolean;
  dataOpen: "true" | "false" | undefined;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="home-details flex flex-col gap-4" data-open={dataOpen}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className="no-print flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-start"
      >
        <span className="flex flex-col">
          <span className="text-base font-semibold text-gray-900">{t.homeDetails.title}</span>
          <span className="text-xs text-gray-600">{t.homeDetails.holds}</span>
        </span>
        <ChevronDownIcon size={20} className={`shrink-0 text-gray-600 ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={bodyId} className="home-details-body flex flex-col gap-4">
        {children}
      </div>
    </section>
  );
}

export default HomeDetails;
