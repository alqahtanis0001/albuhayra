import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";
import { formatSAR } from "@/lib/money";

/**
 * v1.5 (docs/V15-SPEC.md B3 row 3, D15, D21): the salary pick mode of
 * /owner/staff and its two reads. The reads run against a recording fake
 * client, so the filters that keep ended employees, closed plans and other
 * months out are asserted on the query itself; the page runs with mocked reads.
 */
const h = vi.hoisted(() => ({
  calls: [] as Array<{ model: string; method: string; args: Record<string, unknown> }>,
  periods: [] as unknown[],
  plan: null as unknown,
  reads: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    salaryPeriod: {
      findMany: async (args: Record<string, unknown>) => (h.calls.push({ model: "salaryPeriod", method: "findMany", args }), h.periods),
    },
    plan: {
      findFirst: async (args: Record<string, unknown>) => (h.calls.push({ model: "plan", method: "findFirst", args }), h.plan),
    },
  },
}));
vi.mock("@/lib/auth", () => ({ requireOwner: async () => ({ user: { id: "owner_1", role: "OWNER" }, establishmentId: "est_1" }) }));
vi.mock("@/features/payroll/generate", () => ({ ensureSalaryInstalments: async (id: string) => void h.reads.push(`ensure:${id}`) }));
vi.mock("@/features/employees/queries", () => ({
  listEmployees: async (id: string, f: { status: string }) => (h.reads.push(`list:${id}:${f.status}`), []),
}));

const { hasSalaryEmployees, listSalaryPick } = await import("@/features/employees/salaryPick");
const { isSalaryPick, salaryPickHref } = await import("@/features/employees/salaryPickRules");
const { SalaryPickList } = await import("./SalaryPickList");
const { default: EmployeesPage } = await import("@/app/(owner)/owner/staff/(home)/page");

const period = (employeeId: string, name: string, due: number, paid: number) => ({
  employeeId,
  instalmentId: `inst_${employeeId}`,
  employee: { jobTitle: employeeId === "e1" ? "محاسب" : null, party: { name } },
  instalment: { amountDueHalalas: due, paidHalalas: paid },
});

beforeEach(() => {
  h.calls = [];
  h.reads = [];
  h.periods = [];
  h.plan = null;
});

describe("the reads (D21)", () => {
  it("hasSalaryEmployees: an OPEN salary plan of an ACTIVE employee, scoped at the top level", async () => {
    expect(await hasSalaryEmployees("est_1")).toBe(false);
    h.plan = { id: "plan_1" };
    expect(await hasSalaryEmployees("est_1")).toBe(true);
    expect(h.calls[0]!.args.where).toEqual({
      establishmentId: "est_1",
      kind: "SALARY",
      state: "OPEN",
      employee: { is: { status: "ACTIVE" } },
    });
    expect(h.calls[0]!.args.select).toEqual({ id: true });
  });

  it("listSalaryPick: one read — this month's period of ACTIVE employees on an OPEN salary plan, in name order", async () => {
    await listSalaryPick("est_1", "2026-10-11");
    expect(h.calls).toHaveLength(1);
    const args = h.calls[0]!.args;
    expect(args.where).toEqual({
      establishmentId: "est_1",
      periodYm: "2026-10",
      employee: { status: "ACTIVE" },
      instalment: { plan: { kind: "SALARY", state: "OPEN" } },
    });
    expect(args.orderBy).toEqual([{ employee: { party: { name: "asc" } } }, { id: "asc" }]);
  });

  it("the employee page's payable rule: something left this month → payable; fully paid → not", async () => {
    h.periods = [period("e1", "أحمد", 500000, 0), period("e2", "خالد", 400000, 400000), period("e3", "سعد", 300000, 100000)];
    expect(await listSalaryPick("est_1", "2026-10-11")).toEqual([
      { employeeId: "e1", name: "أحمد", jobTitle: "محاسب", instalmentId: "inst_e1", remainingHalalas: 500000, payable: true },
      { employeeId: "e2", name: "خالد", jobTitle: null, instalmentId: "inst_e2", remainingHalalas: 0, payable: false },
      { employeeId: "e3", name: "سعد", jobTitle: null, instalmentId: "inst_e3", remainingHalalas: 200000, payable: true },
    ]);
  });

  it("payable → the payment screen EmployeeActions links; paid → the employee page", () => {
    expect(salaryPickHref({ employeeId: "e1", instalmentId: "inst_1", payable: true })).toBe("/owner/transactions/new?instalmentId=inst_1");
    expect(salaryPickHref({ employeeId: "e1", instalmentId: "inst_1", payable: false })).toBe("/owner/staff/e1");
  });

  it("isSalaryPick: only the exact single value", () => {
    expect(isSalaryPick("salary")).toBe(true);
    for (const raw of [undefined, "", "Salary", "payment", ["salary"]]) expect(isSalaryPick(raw)).toBe(false);
  });
});

describe("D40 (R1-N2): the client-safe split", () => {
  it("salaryPickRules.ts is pure (no server-only, no db); the list imports values only from it, never from salaryPick.ts", () => {
    const rules = readFileSync("src/features/employees/salaryPickRules.ts", "utf8");
    expect(rules).not.toMatch(/^import "server-only";$/m);
    expect(rules).not.toMatch(/^import .*["']@\/lib\/db["']/m);
    expect(rules).not.toMatch(/^import (?!type\b)/m);
    const list = readFileSync("src/features/employees/components/SalaryPickList.tsx", "utf8");
    expect(list).not.toMatch(/from "@\/features\/employees\/salaryPick"/);
    expect(list).toMatch(/from "@\/features\/employees\/salaryPickRules"/);
  });
});

describe("the list", () => {
  it("rows link by the rule; a paid month shows «مدفوع»; an empty list says so", () => {
    const rows = [
      { employeeId: "e1", name: "أحمد", jobTitle: "محاسب", instalmentId: "inst_e1", remainingHalalas: 500000, payable: true },
      { employeeId: "e2", name: "خالد", jobTitle: null, instalmentId: "inst_e2", remainingHalalas: 0, payable: false },
    ];
    const html = renderToStaticMarkup(createElement(SalaryPickList, { rows }));
    const links = [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [m[1], m[2]]);
    expect(links.map((l) => l[0])).toEqual(["/owner/transactions/new?instalmentId=inst_e1", "/owner/staff/e2"]);
    expect(links[0]![1]).toContain(t.employees.paySalary);
    expect(links[0]![1]).not.toContain(t.salaryPick.paid);
    // D43 N05: the payable row shows what is left to pay this month, formatted.
    expect(links[0]![1]).toContain(formatSAR(500000));
    expect(formatSAR(500000)).toContain("5,000.00");
    expect(links[1]![1]).toContain(t.salaryPick.paid);
    expect(t.salaryPick.paid).toBe("مدفوع");
    expect(links[1]![1]).not.toContain(t.common.currency);
    expect(html).toContain("min-h-14");
    expect(renderToStaticMarkup(createElement(SalaryPickList, { rows: [] }))).toContain(t.salaryPick.empty);
  });
});

describe("/owner/staff pick mode (B3 row 3)", () => {
  const render = async (params: Record<string, string>) =>
    renderToStaticMarkup(await EmployeesPage({ searchParams: Promise.resolve(params) }));

  it("?pick=salary: banner with the way back, no tabs, no «موظف جديد», the pick rows; salary months generated first", async () => {
    h.periods = [period("e1", "أحمد", 500000, 0)];
    const html = await render({ pick: "salary" });
    expect(html).toContain(t.salaryPick.banner);
    // D43: the spec's words (§B3), not the key compared with itself.
    expect(html).toContain("اختر الموظف لصرف راتبه");
    expect(html).toMatch(new RegExp(`<a [^>]*href="/owner/staff"[^>]*>${t.salaryPick.cancel}</a>`));
    expect(html).not.toContain(t.employees.activeTab);
    expect(html).not.toContain(t.employees.endedTab);
    expect(html).not.toContain('href="/owner/staff/new"');
    expect(html).toContain('href="/owner/transactions/new?instalmentId=inst_e1"');
    expect(h.reads).toEqual(["ensure:est_1"]);
  });

  it("?pick=salary&status=ENDED still lists ACTIVE only (the read's filter), never the ended list", async () => {
    await render({ pick: "salary", status: "ENDED" });
    expect(h.reads).toEqual(["ensure:est_1"]);
    expect(h.calls[0]!.args.where).toMatchObject({ employee: { status: "ACTIVE" } });
  });

  it("without ?pick the page is unchanged: tabs, «موظف جديد», no banner, no pick read", async () => {
    const html = await render({});
    expect(html).not.toContain(t.salaryPick.banner);
    expect(html).toContain(t.employees.activeTab);
    expect(html).toContain('href="/owner/staff/new"');
    expect(h.reads).toEqual(["ensure:est_1", "list:est_1:ACTIVE"]);
    expect(h.calls).toHaveLength(0);
    expect(await render({ pick: "payment" })).not.toContain(t.salaryPick.banner);
  });
});
