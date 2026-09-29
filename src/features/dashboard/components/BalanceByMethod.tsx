import { Card } from "@/components/Card";
import { MoneyText } from "@/components/MoneyText";
import { TBody, Table, Td, Tr } from "@/components/Table";
import { t } from "@/i18n/ar";

import type { MethodBalance } from "./data";

/** A method balance is IN minus OUT, so it can be negative — hence `signed`. */
export function BalanceByMethod({ rows }: { rows: MethodBalance[] }) {
  return (
    <Card title={t.dashboard.balanceByMethod} bodyClassName="">
      <Table caption={t.dashboard.balanceByMethod}>
        <TBody>
          {rows.map((row) => (
            <Tr key={row.method}>
              <Td>{t.paymentMethod[row.method]}</Td>
              <Td className="text-end">
                <MoneyText halalas={row.balanceHalalas} signed />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

export default BalanceByMethod;
