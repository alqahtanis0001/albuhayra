/**
 * F3 stub for `getOwnerDashboard(estId)` (task B3). Deleted by W2.
 * The numbers are deliberately awkward: a negative method balance, an uneven
 * percentage split, and a month with a negative net.
 */
import { currentMonthKey, lastMonths, ymString } from "@/lib/dates";

import type { OwnerDashboard } from "./data";

export async function getOwnerDashboard(
  _establishmentId: string,
): Promise<OwnerDashboard> {
  const months = lastMonths(6, currentMonthKey());
  const shape = [
    [1_250_00, 980_00],
    [1_640_00, 1_120_00],
    [2_100_00, 1_875_00],
    [1_430_00, 2_260_00],
    [2_780_00, 1_540_00],
    [1_960_00, 2_310_00],
  ];

  return {
    balanceTotalHalalas: 4_318_50,
    balanceByMethod: [
      { method: "CASH", balanceHalalas: 1_240_00 },
      { method: "BANK_TRANSFER", balanceHalalas: 3_105_50 },
      { method: "MADA", balanceHalalas: 87_00 },
      { method: "STC_PAY", balanceHalalas: -114_00 },
      { method: "OTHER", balanceHalalas: 0 },
    ],
    monthInHalalas: 1_960_00,
    monthOutHalalas: 2_310_00,
    monthNetHalalas: -350_00,
    topOutCategories: [
      { categoryId: "c1", nameAr: "إيجار", totalHalalas: 900_00 },
      { categoryId: "c2", nameAr: "رواتب", totalHalalas: 750_00 },
      { categoryId: "c3", nameAr: "مشتريات", totalHalalas: 410_00 },
      { categoryId: "c4", nameAr: "كهرباء وماء", totalHalalas: 165_00 },
      { categoryId: "c5", nameAr: "مواصلات", totalHalalas: 85_00 },
    ],
    last6Months: months.map((m, i) => ({
      ym: ymString(m.year, m.month),
      inHalalas: shape[i]![0]!,
      outHalalas: shape[i]![1]!,
    })),
    recent: [
      row("t1", 0, "OUT", 900_00, "إيجار", "CASH", "مكتب العقار"),
      row("t2", 1, "IN", 1_250_00, "مبيعات", "MADA", null),
      row("t3", 2, "OUT", 165_00, "كهرباء وماء", "BANK_TRANSFER", "الشركة السعودية للكهرباء"),
      row("t4", 3, "IN", 430_00, "دفعة من عميل", "STC_PAY", "عميل"),
      row("t5", 5, "OUT", 85_00, "مواصلات", "CASH", null),
    ],
  };
}

function row(
  id: string,
  daysAgo: number,
  direction: "IN" | "OUT",
  amountHalalas: number,
  categoryNameAr: string,
  paymentMethod: OwnerDashboard["recent"][number]["paymentMethod"],
  counterparty: string | null,
): OwnerDashboard["recent"][number] {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return {
    id,
    date,
    direction,
    amountHalalas,
    categoryNameAr,
    paymentMethod,
    counterparty,
    createdByName: "سعد القحطاني",
  };
}
