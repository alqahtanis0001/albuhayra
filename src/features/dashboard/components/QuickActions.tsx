/**
 * Owner home, first thing on the page (docs/V12-SPEC.md §1): the quick actions
 * حركة جديدة · تسجيل دفعة (→ المستحقات, where every unpaid instalment has its
 * own «تسجيل دفعة») · تسجيل حضور (→ today's daily attendance sheet). Links, not
 * buttons — each one navigates.
 *
 * Three equal tiles with the icon above the label, so they fit a 320px screen
 * (≈90px each): side by side, icon + label + LinkButton's padding would leave
 * a label about 30px wide. Same colours and 0.97 press as LinkButton.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { PlusIcon } from "@/components/icons";
import { CalendarIcon, ClockIcon } from "@/components/navIcons";
import { t } from "@/i18n/ar";

const TILE =
  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center text-sm font-medium leading-tight transition-[scale,background-color,border-color] duration-[80ms] ease-out active:scale-[0.97]";
const PRIMARY = "bg-accent text-white border-accent hover:bg-accent-dark hover:border-accent-dark";
const SECONDARY = "bg-white text-gray-900 border-gray-300 hover:bg-gray-200 hover:border-gray-400";

function Tile({
  href,
  primary = false,
  icon,
  label,
}: {
  href: string;
  primary?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link href={href} className={`${TILE} ${primary ? PRIMARY : SECONDARY}`}>
      {icon}
      {label}
    </Link>
  );
}

export function QuickActions() {
  return (
    <section aria-label={t.quickActions.title} className="grid grid-cols-3 gap-2">
      <Tile href="/owner/transactions/new" primary icon={<PlusIcon size={20} />} label={t.quickActions.newEntry} />
      <Tile href="/owner/dues" icon={<CalendarIcon size={20} />} label={t.quickActions.recordPayment} />
      <Tile href="/owner/staff/attendance" icon={<ClockIcon size={20} />} label={t.quickActions.recordAttendance} />
    </section>
  );
}
