import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DueRow } from "@/features/plans/types";
import { t } from "@/i18n/ar";
import { plural } from "@/lib/plural";

import { SALARY_WINDOW_DAYS, attentionRows } from "./attention";
import { AttentionCard, attentionText } from "./components/AttentionCard";
import type { DialEvent } from "./wheel";

/** v1.5 (docs/V15-SPEC.md A2, D8, D34): «يحتاج انتباهك». */

function due(over: Partial<DueRow>): DueRow {
  return {
    instalmentId: "i", planId: "p", planTitle: "عقد", partyId: "pt", partyName: "النور", direction: "IN", seq: 1,
    dueDate: "2026-10-12", remainingHalalas: 100_000, status: "DUE", dayOffset: 1, kind: "STANDARD", periodYm: null,
    partyRemindersOptIn: false, partyHasEmail: false, ...over,
  };
}

function salary(dayOffset: number): DialEvent {
  return {
    instalmentId: `s${dayOffset}`, planId: "ps", employeeId: "e1", partyName: "سعد", kind: "SALARY",
    remainingHalalas: 500_000, dueDate: "2026-10-20", dayOffset,
  };
}

const NONE = { dues: { overdue: [], thisWeek: [] }, pendingNames: [], dial: [] };

describe("attentionRows (D8 order, each only when non-empty)", () => {
  it("nothing to say → no rows", () => {
    expect(attentionRows(NONE)).toEqual([]);
  });

  it("all four, in D8 order, with their links and totals", () => {
    const rows = attentionRows({
      dues: {
        overdue: [due({ direction: "IN", remainingHalalas: 30_000 }), due({ direction: "OUT", remainingHalalas: 70_000, kind: "SALARY" })],
        thisWeek: [due({ direction: "OUT", remainingHalalas: 40_000 })],
      },
      pendingNames: ["سعد", "نورة"],
      dial: [salary(9), salary(4)],
    });
    expect(rows).toEqual([
      { key: "overdue", href: "/owner/dues", count: 2, inHalalas: 30_000, outHalalas: 70_000 },
      { key: "week", href: "/owner/dues", inHalalas: 0, outHalalas: 40_000 },
      { key: "pending", href: "/owner/staff/logins", names: ["سعد", "نورة"] },
      { key: "salary", href: "/owner/staff?pick=salary", days: 4 },
    ]);
  });

  it("D34: this week's row leaves salaries out — a week of only salaries shows no week row", () => {
    const rows = attentionRows({ ...NONE, dues: { overdue: [], thisWeek: [due({ kind: "SALARY", direction: "OUT" })] } });
    expect(rows).toEqual([]);
    const mixed = attentionRows({
      ...NONE,
      dues: { overdue: [], thisWeek: [due({ kind: "SALARY", direction: "OUT", remainingHalalas: 9 }), due({ direction: "IN", remainingHalalas: 5 })] },
    });
    expect(mixed).toEqual([{ key: "week", href: "/owner/dues", inHalalas: 5, outHalalas: 0 }]);
  });

  it("the salary window: 10 days shows, 11 does not; today is 0; overdue salaries are not this row", () => {
    expect(SALARY_WINDOW_DAYS).toBe(10);
    expect(attentionRows({ ...NONE, dial: [salary(10)] })).toEqual([{ key: "salary", href: "/owner/staff?pick=salary", days: 10 }]);
    expect(attentionRows({ ...NONE, dial: [salary(11)] })).toEqual([]);
    expect(attentionRows({ ...NONE, dial: [salary(-1)] })).toEqual([]);
    expect(attentionRows({ ...NONE, dial: [{ ...salary(3), kind: "OUT" }] })).toEqual([]);
    expect(attentionText({ key: "salary", href: "/owner/staff?pick=salary", days: 0 })).toBe(t.attention.salaryToday);
    expect(attentionText({ key: "salary", href: "/owner/staff?pick=salary", days: 3 })).toBe("الرواتب بعد 3 أيام");
  });
});

describe("AttentionCard", () => {
  it("D40 (R1-H5): a row shows only its non-zero side(s)", () => {
    const outOnly = renderToStaticMarkup(
      createElement(AttentionCard, { rows: [{ key: "overdue", href: "/owner/dues", count: 1, inHalalas: 0, outHalalas: 200_000 }] }),
    );
    expect(outOnly).toContain(`${t.dues.fromUs}: `);
    expect(outOnly).not.toContain(`${t.dues.toUs}: `);
    const both = renderToStaticMarkup(
      createElement(AttentionCard, { rows: [{ key: "week", href: "/owner/dues", inHalalas: 5, outHalalas: 7 }] }),
    );
    expect(both).toContain(`${t.dues.toUs}: `);
    expect(both).toContain(`${t.dues.fromUs}: `);
    const inOnly = renderToStaticMarkup(
      createElement(AttentionCard, { rows: [{ key: "week", href: "/owner/dues", inHalalas: 5, outHalalas: 0 }] }),
    );
    expect(inOnly).not.toContain(`${t.dues.fromUs}: `);
  });

  it("renders nothing for no rows", () => {
    expect(renderToStaticMarkup(createElement(AttentionCard, { rows: [] }))).toBe("");
  });

  it("the heading badge counts the rows; each row is a 44 px link; overdue in the money-out colour with the alert icon", () => {
    const rows = attentionRows({
      dues: { overdue: [due({})], thisWeek: [] },
      pendingNames: ["سعد"],
      dial: [],
    });
    const html = renderToStaticMarkup(createElement(AttentionCard, { rows }));
    expect(html).toContain(t.attention.title);
    expect(html).toContain(`<span class="sr-only">${plural(t.attention.badge, 2)}</span>`);
    expect(html).toMatch(/<span aria-hidden="true">2<\/span>/);
    const links = [...html.matchAll(/<a [^>]*>/g)].map((m) => m[0]);
    expect(links).toHaveLength(2);
    for (const a of links) expect(a).toMatch(/\bmin-h-11\b/);
    expect(links[0]).toMatch(/\btext-money-out\b/);
    expect(links[0]).toMatch(/href="\/owner\/dues"/);
    expect(links[1]).not.toMatch(/\btext-money-out\b/);
    expect(links[1]).toMatch(/href="\/owner\/staff\/logins"/);
    expect(html).toContain("طلب انضمام من سعد");
    expect(html).toContain(t.dues.toUs);
    // It prints: content, not chrome.
    expect(html).not.toContain("no-print");
  });
});
