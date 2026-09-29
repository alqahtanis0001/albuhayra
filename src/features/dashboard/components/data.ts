/**
 * The dashboard's shapes, wired to the real queries by W2. Every line here is a
 * **type-only** re-export, which TypeScript erases completely — that matters,
 * because `@/features/dashboard/queries` and `@/features/transactions/queries`
 * both start with `import "server-only"`, and `SixMonthChart` is a client
 * component. Nothing importable as a *value* may live in this file, or that
 * boundary stops being safe by accident.
 *
 * `getOwnerDashboard` is therefore imported straight from the query module by
 * the page, which is a server component and may hold it.
 */
export type {
  CategoryTotal,
  MethodBalance,
  MonthTotals,
  OwnerDashboard,
} from "@/features/dashboard/queries";

export type { LedgerRow } from "@/features/transactions/queries";
