"use client";

/**
 * The one «+» (docs/V14-SPEC.md B1, D13, D16): a primary-styled control in the
 * tab bar (phones) and the side nav (md+) that opens a sheet of every add
 * action — rows in spec order, the first one visually larger. The sheet only
 * links; it imports nothing from the features (admin.test.ts pins that).
 *
 * Same a11y as MoreSheet: a native <dialog> + showModal() gives the focus trap,
 * Escape and focus return; a backdrop tap closes it; a tapped row keeps the
 * sheet open while its route loads (pending look) and the sheet closes when the
 * path changes — or at once when the row's path is the page already shown
 * (`/owner/plans?pick=payment` from الاتفاقيات). On phones the dialog is the
 * `.nav-sheet` bottom sheet (slide-up, fade only under reduced motion); on md+ a
 * popover-like modal beside the side nav, fading in only under `motion-safe:`.
 *
 * D16 (c): with exactly one row (an unlinked staff login) the «+» is that row's
 * plain link — no dialog — and it never carries aria-current (A9).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { t } from "@/i18n/ar";

import { CloseIcon, PlusIcon } from "../icons";
import { NAV_ICONS } from "../navIcons";
import { LinkPending } from "../NavProgress";
import { samePath, type AddEntry, type AddRow } from "./nav";
import { NAV_PRESS, TAB_CLASS } from "./navClasses";

type Variant = "tab" | "side";

/**
 * Exported for the pin in nav.test.ts (reviewer R1-1): every link the sheet
 * renders carries `nav-item` (NAV_PRESS) and a `has-data-pending:` look, so the
 * v1.1d pending step shows on it.
 */
export const TAB_TRIGGER = `${TAB_CLASS} border-transparent text-accent-dark has-data-pending:border-accent has-data-pending:bg-accent-soft`;
export const SIDE_TRIGGER = `${NAV_PRESS} flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-3 text-sm font-semibold text-white hover:border-accent-dark hover:bg-accent-dark has-data-pending:border-accent-dark has-data-pending:bg-accent-dark`;
export const PRIMARY_ROW = `${NAV_PRESS} flex min-h-14 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-base font-semibold text-white hover:bg-accent-dark has-data-pending:bg-accent-dark`;

/** The plus in a filled disc, drawn only in the tab bar (the side label carries its own «+»). */
function PlusDisc() {
  return (
    <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-accent text-white">
      <PlusIcon size={16} />
    </span>
  );
}

function TriggerBody({ variant }: { variant: Variant }) {
  return variant === "tab" ? (
    <>
      <PlusDisc />
      {t.addSheet.title}
    </>
  ) : (
    <>{t.addSheet.tab}</>
  );
}

function Row({ row, primary, onSame }: { row: AddRow; primary: boolean; onSame: () => void }) {
  const Icon = NAV_ICONS[row.icon];
  return (
    <Link
      href={row.href}
      onClick={onSame}
      className={
        primary
          ? PRIMARY_ROW
          : `${NAV_PRESS} flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 px-1 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-100 has-data-pending:border-accent has-data-pending:bg-accent-soft has-data-pending:text-accent-dark`
      }
    >
      <Icon size={primary ? 22 : 24} />
      {row.label}
      <LinkPending />
    </Link>
  );
}

export function AddSheet({ entry, variant }: { entry: AddEntry; variant: Variant }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [first, ...rest] = entry.rows;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A row's navigation committed: put the sheet away.
  useEffect(() => setOpen(false), [pathname]);

  if (!first) return null;

  if (entry.rows.length === 1) {
    return (
      <Link href={first.href} className={variant === "tab" ? TAB_TRIGGER : SIDE_TRIGGER}>
        <TriggerBody variant={variant} />
        <LinkPending />
      </Link>
    );
  }

  const close = (href: string) => {
    if (samePath(href, pathname)) setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={variant === "tab" ? TAB_TRIGGER : SIDE_TRIGGER}
      >
        <TriggerBody variant={variant} />
      </button>

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className={
          variant === "tab"
            ? "nav-sheet no-print mx-0 mt-auto mb-0 max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-xl border-0 border-t border-gray-200 bg-white p-0 text-gray-900"
            : "no-print mt-24 mb-auto ms-60 me-auto w-full max-w-sm rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-lg motion-safe:animate-[route-fade-in_200ms_ease-out]"
        }
      >
        <div className="flex flex-col gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-base font-semibold">
              {t.addSheet.title}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.common.close}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <CloseIcon size={22} />
            </button>
          </div>

          <Row row={first} primary onSame={() => close(first.href)} />

          <ul className="grid grid-cols-2 gap-2">
            {rest.map((row) => (
              <li key={row.href}>
                <Row row={row} primary={false} onSame={() => close(row.href)} />
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}

export default AddSheet;
