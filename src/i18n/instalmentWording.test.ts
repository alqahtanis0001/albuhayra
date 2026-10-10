import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";
import { plural } from "@/lib/plural";

/**
 * v1.4 (docs/V14-SPEC.md D16–D17, lead's pre-"go" items). A scheduled instalment
 * is «قسط»; «دفعة» is kept only for money that was recorded. The sweep walks
 * every string under `t`, so a value restored in any src/i18n file fails here.
 */
function walk(node: unknown, prefix: string, out: Array<[string, string]>) {
  if (typeof node === "string") out.push([prefix, node]);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, prefix ? `${prefix}.${k}` : k, out);
  }
}
const strings: Array<[string, string]> = [];
walk(t, "", strings);

const read = (rel: string) => readFileSync(path.resolve(__dirname, "..", rel), "utf8");

describe("instalment wording (c7)", () => {
  it.each(["الدفعة القادمة", "دفعة متأخرة", "دفعات متأخرة", "دفعتان متأخرتان", "الدفعات المتأخرة"])(
    "no value under t contains «%s»",
    (phrase) => {
      const hits = strings.filter(([, v]) => v.includes(phrase)).map(([k]) => k);
      expect(hits).toEqual([]);
    },
  );

  it("scheduled rows read «قسط» where the user listed them", () => {
    expect(t.plans.instalments).toBe("الأقساط");
    expect(t.plans.nextDue).toBe("القسط القادم");
    expect(t.schedule.title).toBe("جدول الأقساط");
    expect(plural(t.navItem.overdueBadge, 1)).toBe("قسط متأخر واحد");
    expect(plural(t.dues.overdueStrip, 3)).toBe("3 أقساط متأخرة");
    expect(plural(t.duesRibbon.count, 2)).toBe("قسطان");
    // D21 (reviewer M5/M6): the instalment link and the countdown agree with the masculine noun too.
    expect(t.err.planBothLinks).toContain("بقسط");
    expect(t.countdown.today).toBe("مستحق اليوم");
    expect(plural(t.countdown.lateDays, 2)).toBe("متأخر يومين");
    expect(t.instalmentStatus.OVERDUE).toBe("متأخر");
  });

  it("«دفعة» stays where money was recorded", () => {
    expect(t.plans.recordPayment).toBe("تسجيل دفعة");
    expect(t.planBar.paymentRecorded).toBe("تم تسجيل الدفعة");
    expect(t.statement.paymentReceived).toContain("دفعة");
    expect(t.plans.payments).toBe("السدادات");
  });
});

describe("v1.4 keys the lead adds before go (D16–D17)", () => {
  it("navGroup.staff is the renamed heading; the item is unchanged (c8)", () => {
    expect(t.navGroup.staff).toBe("الموظفون والحضور");
    expect(t.navItem.staffList).toBe("الموظفون");
  });

  it("every key named in D17 exists as a non-empty string", () => {
    const keys = [
      t.dues.pickOther,
      t.ledger.openPlanPaymentBadge,
      t.plans.archivedFilter,
      t.settings.backToLedger,
      t.settings.unlockConfirm,
      t.categoryQuick.show,
      t.categoryQuick.hiddenChipsLabel,
      t.pending.checkStatus,
    ];
    for (const k of keys) expect(typeof k === "string" && k.length > 0).toBe(true);
    expect(plural(t.navItem.pendingBadge, 1)).toBe("طلب انضمام واحد");
    expect(plural(t.navItem.pendingBadge, 5)).toBe("5 طلبات انضمام");
  });

  it("no new value uses Eastern digits", () => {
    const eastern = /[٠-٩]/;
    const hits = strings.filter(([, v]) => eastern.test(v)).map(([k]) => k);
    expect(hits).toEqual([]);
  });
});

describe("lead-owned pages (c16, c17)", () => {
  it("the pending page's button is worded as the next step and still signs out", () => {
    const src = read("app/(auth)/pending/page.tsx");
    expect(src).toContain("t.pending.checkStatus");
    expect(src).not.toContain("t.common.logout");
    expect(src).toContain("action={logout}");
  });

  it("the attendance page's empty state links to «إضافة موظف» with the hint", () => {
    const src = read("app/(owner)/owner/staff/attendance/page.tsx");
    expect(src).toContain('href="/owner/staff/new"');
    expect(src).toContain("t.employees.emptyHint");
    expect(src).toContain("t.employees.add");
    // Both tabs render the same empty state (the component is used twice).
    expect(src.split("<NoEmployees />").length - 1).toBe(2);
  });
});
