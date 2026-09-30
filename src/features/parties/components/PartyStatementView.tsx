/**
 * كشف حساب (docs/FRONTEND.md, CP2; W11). Signed from the establishment's side:
 * + = لنا, − = علينا. Each amount uses MoneyText `signed`, like الصافي: a
 * negative prints «−» (and red), a positive prints bare — one category and a
 * sign, so the missing «−» is itself unambiguous. The running balance and the
 * closing box always say لنا / علينا in words (or «لا رصيد»).
 *
 * «حركات أخرى مع الجهة» are the party's entries that pay no agreement: listed
 * for reference, outside the balance, newest 50 — beyond that the page says so
 * and links to the ledger filtered by the party.
 *
 * Built from report-card / report-net / print-only, so the existing print
 * sheet styles it with nothing new in globals.css.
 *
 * v1.3 item 13: a screen-only header opens it — the closing balance in large
 * words (لنا عنده / علينا له / متسوٍّ) and the running balance as a sparkline
 * (one point per date; shown from two dates on). Hidden in print.
 */
import Link from "next/link";

import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import { Sparkline } from "@/components/Sparkline";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import type { PartyStatement, StatementRow } from "@/features/parties/statement";
import { t } from "@/i18n/ar";
import { formatSAR } from "@/lib/money";

import { balanceKind, statementPoints, summaryDate } from "./statementVisual";

/** A PAYMENT lowers what is owed to us (−) on an IN plan, and raises it (+) on an OUT one. */
function describe(row: StatementRow): string {
  const template =
    row.kind === "PLAN"
      ? t.statement.planCharge
      : row.kind === "WRITE_OFF"
        ? t.statement.writeOff
        : row.deltaHalalas < 0
          ? t.statement.paymentReceived
          : t.statement.paymentMade;
  return template.replace("{title}", row.planTitle);
}

/** «لنا 1,000.00 ر.س» / «علينا …» / «لا رصيد». */
export function BalanceWords({ halalas }: { halalas: number }) {
  if (halalas === 0) return <span className="text-gray-600">{t.parties.settled}</span>;
  return (
    <span>
      {halalas > 0 ? t.parties.owedToUs : t.parties.owedByUs}{" "}
      <MoneyText halalas={Math.abs(halalas)} />
    </span>
  );
}

const SPARK_TONE = { owesUs: "in", weOwe: "out", settled: "neutral" } as const;

function StatementHeader({ statement }: { statement: PartyStatement }) {
  const closing = statement.closingBalanceHalalas;
  const kind = balanceKind(closing);
  const points = statementPoints(statement.rows);
  const words = kind === "settled" ? t.statementHeader.settled : `${t.statementHeader[kind]} ${formatSAR(Math.abs(closing))}`;
  return (
    <Card className="no-print">
      <div className="flex flex-col gap-3">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl font-semibold text-gray-900">
          <span>{t.statementHeader[kind]}</span>
          {kind === "settled" ? null : <MoneyText halalas={Math.abs(closing)} className="text-2xl font-semibold" />}
        </p>
        {points.length >= 2 ? (
          <Sparkline
            points={points}
            variant="line"
            tone={SPARK_TONE[kind]}
            label={t.statementHeader.sparkLabel}
            summary={t.statementHeader.sparkSummary
              .replace("{from}", summaryDate(points[0]!.date))
              .replace("{to}", summaryDate(points.at(-1)!.date))
              .replace("{amount}", words)}
          />
        ) : null}
      </div>
    </Card>
  );
}

export function PartyStatementView({ statement }: { statement: PartyStatement }) {
  const { rows, other } = statement;
  return (
    <>
      {rows.length > 0 ? <StatementHeader statement={statement} /> : null}
      <Card title={t.statement.title} className="report-card" bodyClassName="">
        {rows.length === 0 ? (
          <EmptyState title={t.statement.empty} />
        ) : (
          <Table
            caption={t.statement.title}
            head={
              <Tr>
                <Th>{t.statement.date}</Th>
                <Th>{t.statement.description}</Th>
                <Th className="text-end">{t.statement.amount}</Th>
                <Th className="text-end">{t.statement.balance}</Th>
              </Tr>
            }
          >
            <TBody>
              {rows.map((row, i) => (
                <Tr key={`${row.planId}-${row.kind}-${row.transactionId ?? i}`}>
                  <Td>
                    <DateText date={row.date} className="items-start" />
                  </Td>
                  <Td>
                    <Link
                      href={
                        row.transactionId
                          ? `/owner/transactions/${row.transactionId}/edit`
                          : `/owner/plans/${row.planId}`
                      }
                      className="underline-offset-2 hover:underline"
                    >
                      {describe(row)}
                    </Link>
                  </Td>
                  <Td className="text-end">
                    <MoneyText halalas={row.deltaHalalas} signed />
                  </Td>
                  <Td className="text-end text-sm">
                    <BalanceWords halalas={row.balanceHalalas} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="report-net">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-gray-900">{t.statement.closingBalance}</span>
          <span className="text-base font-semibold">
            <BalanceWords halalas={statement.closingBalanceHalalas} />
          </span>
        </div>
      </Card>

      {other.length > 0 ? (
        <Card title={t.statement.otherTransactions} className="report-card" bodyClassName="">
          <p className="border-b border-gray-200 px-4 py-2 text-xs text-gray-600">{t.statement.otherHint}</p>
          <Table
            caption={t.statement.otherTransactions}
            head={
              <Tr>
                <Th>{t.transaction.date}</Th>
                <Th>{t.transaction.category}</Th>
                <Th className="text-end">{t.transaction.amount}</Th>
              </Tr>
            }
          >
            <TBody>
              {other.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <DateText date={row.date} compact />
                  </Td>
                  <Td>{row.categoryNameAr}</Td>
                  <Td className="text-end">
                    <MoneyText halalas={row.amountHalalas} direction={row.direction} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          {statement.otherCapped ? (
            <p className="flex flex-wrap gap-x-2 border-t border-gray-200 px-4 py-2 text-xs text-gray-700">
              {t.statement.otherCapped}
              <Link
                href={`/owner/transactions?partyId=${statement.party.id}`}
                className="no-print font-medium text-accent-dark underline underline-offset-2"
              >
                {t.statement.otherViewAll}
              </Link>
            </p>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

export default PartyStatementView;
