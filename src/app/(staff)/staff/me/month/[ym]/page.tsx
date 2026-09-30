import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LinkButton } from "@/components/LinkButton";
import { ChevronEndIcon, ChevronStartIcon } from "@/components/icons";
import { MonthDays, MonthTotals } from "@/features/attendance/components/MonthSheet";
import { getMyMonth } from "@/features/attendance/mine";
import { periodLabel } from "@/features/plans/components/PlanBits";
import { t } from "@/i18n/ar";
import { requireStaff } from "@/lib/auth";
import { currentMonthKey, ymString } from "@/lib/dates";
import { addMonthsYm } from "@/lib/payroll";
import { PeriodYmSchema } from "@/lib/validation";

export const metadata: Metadata = { title: t.myAttendance.myMonth };

/**
 * «حضوري» — own attendance month, without the owner's notes (Z6). The month
 * comes from the URL, the employee only from the session. A malformed or
 * future month, or an unlinked login, reaches notFound().
 */
export default async function MyMonthPage({ params }: { params: Promise<{ ym: string }> }) {
  await requireStaff();
  const { ym } = await params;
  const { year, month } = currentMonthKey();
  const thisMonth = ymString(year, month);
  const parsed = PeriodYmSchema.safeParse(ym);
  if (!parsed.success || parsed.data > thisMonth) notFound();
  const sheet = await getMyMonth(parsed.data);
  if (!sheet) notFound();
  const prev = addMonthsYm(sheet.ym, -1);
  const next = addMonthsYm(sheet.ym, 1);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {t.myAttendance.title} — {periodLabel(sheet.ym)}
      </h1>
      <nav aria-label={t.myAttendance.myMonth} className="flex flex-wrap gap-2">
        <LinkButton href={`/staff/me/month/${prev}`} variant="secondary">
          <ChevronStartIcon size={18} />
          {periodLabel(prev)}
        </LinkButton>
        {next <= thisMonth ? (
          <LinkButton href={`/staff/me/month/${next}`} variant="secondary">
            {periodLabel(next)}
            <ChevronEndIcon size={18} />
          </LinkButton>
        ) : null}
      </nav>
      <MonthTotals totals={sheet.totals} minutes={sheet.minutes} />
      <MonthDays days={sheet.days} withNotes={false} />
    </div>
  );
}
