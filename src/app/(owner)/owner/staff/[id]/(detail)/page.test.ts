import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/** v1.4 part 3 — D29 R4/R6: a salary payment returns to the employee page with `?saved=1`. */
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { notFound: true });
  },
}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({ user: { id: "owner_1", role: "OWNER" }, establishmentId: "est_1" }),
}));
vi.mock("@/features/payroll/generate", () => ({ ensureSalaryInstalments: async () => undefined }));
vi.mock("@/features/employees/queries", () => ({
  getEmployee: async () => ({
    id: "emp_1", partyId: "party_1", name: "سعد", status: "ACTIVE", endDate: null, startDate: "2026-01-01",
    grossHalalas: 400000, thisMonth: null, months: [],
  }),
  getUnpaidSalaryMonths: async () => [],
}));
vi.mock("@/features/attendance/queries", () => ({ getAttendanceYear: async () => [] }));
vi.mock("@/features/attendance/components/attendanceVisual", () => ({ heatCells: () => [] }));
vi.mock("@/features/attendance/components/AttendanceHeatStrip", () => ({ AttendanceHeatStrip: () => createElement("p", null, "heat") }));
vi.mock("@/features/employees/components/EmployeeActions", () => ({ EmployeeActions: () => createElement("p", null, "actions") }));
vi.mock("@/features/employees/components/EmployeeProfile", () => ({
  MonthsCard: () => createElement("p", null, "months"),
  ProfileCard: () => createElement("p", null, "profile"),
  SalaryCard: () => createElement("p", null, "salary"),
  ThisMonthCard: () => createElement("p", null, "this"),
}));

const { default: EmployeePage } = await import("./page");
const render = async (p: Record<string, string | undefined>) =>
  renderToStaticMarkup(await EmployeePage({ params: Promise.resolve({ id: "emp_1" }), searchParams: Promise.resolve(p) }));

describe("/owner/staff/[id] and ?saved=1 (R4, R6)", () => {
  it("shows «تم حفظ الحركة» with the flag and not without", async () => {
    const out = await render({ saved: "1" });
    expect(out).toContain("سعد");
    expect(out).toContain(t.transaction.saved);
    expect(await render({})).not.toContain(t.transaction.saved);
  });
});
