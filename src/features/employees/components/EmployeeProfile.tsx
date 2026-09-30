/**
 * The employee page's cards (server components): the profile (البيانات and
 * الدوام), the salary terms, this month's salary, and the latest months with a
 * link to each payslip. Amounts are neutral; status is said in words.
 */
import Link from "next/link";

import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import type { AllowanceLine, EmployeeDetail, SalaryMonthSummary } from "@/features/employees/queries";
import { periodLabel } from "@/features/plans/components/PlanBits";
import { t } from "@/i18n/ar";

import { WEEKDAYS, hasDay } from "./employeeDraft";

const DT = "text-gray-600";

export const allowanceName = (a: Pick<AllowanceLine, "type" | "label">) =>
  a.type === "OTHER" && a.label ? a.label : t.allowanceType[a.type];

export function ProfileCard({ e }: { e: EmployeeDetail }) {
  const days = WEEKDAYS.filter((d) => hasDay(e.workDays, d)).map((d) => t.weekday[d]);
  return (
    <Card title={t.employees.sectionInfo}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {e.jobTitle ? (
          <>
            <dt className={DT}>{t.employees.jobTitle}</dt>
            <dd>{e.jobTitle}</dd>
          </>
        ) : null}
        <dt className={DT}>{t.employees.startDate}</dt>
        <dd>
          <DateText date={e.startDate} className="items-start" />
        </dd>
        {e.endDate ? (
          <>
            <dt className={DT}>{t.employees.endDate}</dt>
            <dd>
              <DateText date={e.endDate} className="items-start" />
            </dd>
          </>
        ) : null}
        <dt className={DT}>{t.parties.phone}</dt>
        <dd>
          {e.phone ? (
            <a href={`tel:${e.phone}`} dir="ltr" className="text-accent-dark tabular-nums underline-offset-2 hover:underline">
              {e.phone}
            </a>
          ) : (
            "—"
          )}
        </dd>
        <dt className={DT}>{t.parties.email}</dt>
        <dd>
          {e.email ? (
            <a href={`mailto:${e.email}`} dir="ltr" className="break-all text-accent-dark underline-offset-2 hover:underline">
              {e.email}
            </a>
          ) : (
            "—"
          )}
        </dd>
        <dt className={DT}>{t.employees.workDays}</dt>
        <dd className="flex flex-wrap gap-x-3">
          {days.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </dd>
        {e.workStart || e.workEnd ? (
          <>
            <dt className={DT}>{t.employees.sectionSchedule}</dt>
            <dd>
              <bdi dir="ltr" className="tabular-nums">
                {e.workStart ?? "—"} – {e.workEnd ?? "—"}
              </bdi>
            </dd>
          </>
        ) : null}
        {e.graceMinutes !== null ? (
          <>
            <dt className={DT}>{t.employees.graceMinutes}</dt>
            <dd>
              <bdi className="tabular-nums">{e.graceMinutes}</bdi>
            </dd>
          </>
        ) : null}
        <dt className={DT}>{t.employees.linkedLogin}</dt>
        <dd>{e.loginName ?? t.employees.noLogin}</dd>
        {e.notes ? (
          <>
            <dt className={DT}>{t.employees.notes}</dt>
            <dd className="whitespace-pre-line">{e.notes}</dd>
          </>
        ) : null}
      </dl>
    </Card>
  );
}

export function SalaryCard({ e }: { e: EmployeeDetail }) {
  return (
    <Card title={t.employees.sectionSalary}>
      {e.basicSalaryHalalas === null || e.grossHalalas === null ? (
        <p className="text-sm text-gray-600">{t.employees.noSalary}</p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className={DT}>{t.employees.basicSalary}</dt>
          <dd>
            <MoneyText halalas={e.basicSalaryHalalas} />
          </dd>
          {e.allowances.map((a, i) => (
            <div key={i} className="contents">
              <dt className={DT}>{allowanceName(a)}</dt>
              <dd>
                <MoneyText halalas={a.amountHalalas} />
              </dd>
            </div>
          ))}
          <dt className="font-medium text-gray-900">{t.employees.gross}</dt>
          <dd className="font-medium">
            <MoneyText halalas={e.grossHalalas} />
          </dd>
          <dt className={DT}>{t.employees.payDay}</dt>
          <dd>
            <bdi className="tabular-nums">{e.payDay}</bdi>
          </dd>
        </dl>
      )}
    </Card>
  );
}

const payslipHref = (employeeId: string, ym: string) => `/owner/staff/${employeeId}/payslip/${ym}`;

export function ThisMonthCard({ employeeId, m }: { employeeId: string; m: SalaryMonthSummary }) {
  const lines: Array<[string, number]> = [
    [t.employees.gross, m.grossHalalas],
    [t.employees.deductions, m.deductionsHalalas],
    [t.employees.net, m.netHalalas],
    [t.employees.paid, m.paidHalalas],
    [t.employees.remaining, m.remainingHalalas],
  ];
  return (
    <Card
      title={`${t.employees.thisMonth} — ${periodLabel(m.periodYm)}`}
      action={
        <Link href={payslipHref(employeeId, m.periodYm)} className="text-sm text-accent-dark underline-offset-2 hover:underline">
          {t.employees.payslip}
        </Link>
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {lines.map(([label, halalas]) => (
          <div key={label} className="contents">
            <dt className={DT}>{label}</dt>
            <dd>
              <MoneyText halalas={halalas} />
            </dd>
          </div>
        ))}
        <dt className={DT}>{t.schedule.dueDate}</dt>
        <dd>
          <DateText date={m.dueDate} className="items-start" />
        </dd>
      </dl>
    </Card>
  );
}

export function MonthsCard({ employeeId, months }: { employeeId: string; months: SalaryMonthSummary[] }) {
  if (months.length === 0) return null;
  return (
    <Card title={t.employees.payslip} bodyClassName="">
      <ul className="flex flex-col">
        {months.map((m) => (
          <li key={m.periodYm} className="border-b border-gray-200 last:border-b-0">
            <Link
              href={payslipHref(employeeId, m.periodYm)}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">{periodLabel(m.periodYm)}</span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  {t.employees.net}: <MoneyText halalas={m.netHalalas} />
                </span>
                <span className="text-xs text-gray-600">
                  {m.remainingHalalas > 0 ? (
                    <>
                      {t.employees.remaining}: <MoneyText halalas={m.remainingHalalas} inheritColor />
                    </>
                  ) : (
                    t.instalmentStatus.PAID
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
