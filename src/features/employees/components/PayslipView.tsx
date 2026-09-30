/**
 * قسيمة الراتب (spec §3.4; D12): the establishment and employee, the month, then
 * basic, each allowance, gross, each deduction with its reason (or «لا توجد
 * خصومات»), the net box, and how it was paid — date, method and amount per
 * payment, or «لم يُسدَّد بعد». Amounts are neutral: every line is named in words.
 * Built from report-card / report-net, so the existing print block styles it;
 * the not-a-legal-document line prints on the sheet as well as on screen.
 * v1.3 item 12: opens with the hero (net large, gross → deductions → net).
 */
import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import type { Payslip } from "@/features/employees/payslip";
import { periodLabel } from "@/features/plans/components/PlanBits";
import { t } from "@/i18n/ar";

import { allowanceName } from "./EmployeeProfile";
import { PayslipHero } from "./PayslipHero";

function Line({ label, halalas, strong = false }: { label: string; halalas: number; strong?: boolean }) {
  return (
    <Tr className={strong ? "font-semibold" : ""}>
      <Td>{label}</Td>
      <Td className="text-end">
        <MoneyText halalas={halalas} />
      </Td>
    </Tr>
  );
}

export function PayslipView({ slip }: { slip: Payslip }) {
  return (
    <div className="flex flex-col gap-4">
      <PayslipHero slip={slip} />
      <Card className="report-card">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-600">{t.payslip.establishment}</dt>
          <dd className="font-medium">{slip.establishmentName}</dd>
          <dt className="text-gray-600">{t.payslip.employee}</dt>
          <dd className="font-medium">{slip.employee.name}</dd>
          {slip.employee.jobTitle ? (
            <>
              <dt className="text-gray-600">{t.payslip.jobTitle}</dt>
              <dd>{slip.employee.jobTitle}</dd>
            </>
          ) : null}
          <dt className="text-gray-600">{t.payslip.month}</dt>
          <dd className="font-medium">{periodLabel(slip.periodYm)}</dd>
        </dl>
      </Card>

      <Card title={t.payslip.gross} className="report-card" bodyClassName="">
        <Table caption={t.payslip.gross}>
          <TBody>
            <Line label={t.payslip.basic} halalas={slip.basicHalalas} />
            {slip.allowances.map((a, i) => (
              <Line key={i} label={allowanceName(a)} halalas={a.amountHalalas} />
            ))}
            <Line label={t.payslip.gross} halalas={slip.grossHalalas} strong />
          </TBody>
        </Table>
      </Card>

      <Card title={t.payslip.deductions} className="report-card" bodyClassName="">
        {slip.deductions.length === 0 ? (
          <p className="p-4 text-sm text-gray-600">{t.deductions.none}</p>
        ) : (
          <Table caption={t.payslip.deductions}>
            <TBody>
              {slip.deductions.map((d, i) => (
                <Line key={i} label={d.reason} halalas={d.amountHalalas} />
              ))}
              <Line label={t.common.total} halalas={slip.deductionsHalalas} strong />
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="report-net">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-gray-900">{t.payslip.net}</span>
          <span className="text-base font-semibold">
            <MoneyText halalas={slip.netHalalas} />
          </span>
        </div>
      </Card>

      <Card title={t.payslip.payments} className="report-card" bodyClassName="">
        {slip.payments.length === 0 ? (
          <p className="p-4 text-sm text-gray-600">{t.payslip.unpaid}</p>
        ) : (
          <Table
            caption={t.payslip.payments}
            head={
              <Tr>
                <Th>{t.payslip.paymentDate}</Th>
                <Th>{t.payslip.paymentMethod}</Th>
                <Th className="text-end">{t.transaction.amount}</Th>
              </Tr>
            }
          >
            <TBody>
              {slip.payments.map((p, i) => (
                <Tr key={i}>
                  <Td>
                    <DateText date={p.date} className="items-start" />
                  </Td>
                  <Td>{t.paymentMethod[p.paymentMethod]}</Td>
                  <Td className="text-end">
                    <MoneyText halalas={p.amountHalalas} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-200 px-4 py-3 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-600">{t.employees.paid}</dt>
            <dd>
              <MoneyText halalas={slip.paidHalalas} />
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-600">{t.employees.remaining}</dt>
            <dd>
              <MoneyText halalas={slip.remainingHalalas} />
            </dd>
          </div>
        </dl>
      </Card>

      <p className="text-sm font-medium text-gray-700">{t.payslip.notLegal}</p>
    </div>
  );
}

export default PayslipView;
