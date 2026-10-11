import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.4 B4/B5 (A6): «الإضافة» meaning a project is now «النشاط». The sweep is
 * key-based — every value under the keys that describe projects — so «ضمن
 * إضافة», «بدون إضافة», «بإضافة» and «لا توجد إضافات» are caught, not only the
 * two phrases B5 names. `createdAt` «تاريخ الإضافة» means "date added" and is
 * the one allowed hit of the whole-tree phrase check.
 */
function walk(node: unknown, prefix: string, out: Array<[string, string]>) {
  if (typeof node === "string") out.push([prefix, node]);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, prefix ? `${prefix}.${k}` : k, out);
  }
}
const all: Array<[string, string]> = [];
walk(t, "", all);

const PROJECT_KEYS: Array<[string, unknown]> = [
  ["projects", t.projects],
  ["navItem.projectsList", t.navItem.projectsList],
  ["navItem.projectNew", t.navItem.projectNew],
  ["navGroup.additions", t.navGroup.additions],
  ["err.projectInvalid", t.err.projectInvalid],
  ["err.projectClosed", t.err.projectClosed],
  ["err.projectHasHistory", t.err.projectHasHistory],
  ["transaction.project", t.transaction.project],
  ["print.projectSummaryTitle", t.print.projectSummaryTitle],
];

describe("«الإضافات» → «الأنشطة» (B4)", () => {
  it("no project-meaning value contains «إضاف» (key-based, A6)", () => {
    const strings: Array<[string, string]> = [];
    for (const [key, node] of PROJECT_KEYS) walk(node, key, strings);
    expect(strings.length).toBeGreaterThan(30);
    expect(strings.filter(([, v]) => v.includes("إضاف")).map(([k]) => k)).toEqual([]);
  });

  it("no value anywhere equals the two old labels or names «الإضافة/الإضافات», except «تاريخ الإضافة»", () => {
    expect(all.filter(([, v]) => v === "قائمة الإضافات" || v === "إضافة جديدة").map(([k]) => k)).toEqual([]);
    const hits = all.filter(([, v]) => /الإضافات|الإضافة|إضافات\b/.test(v)).map(([k]) => k);
    expect(hits).toEqual(["transaction.createdAt"]);
    expect(t.transaction.createdAt).toBe("تاريخ الإضافة");
  });

  it("the headline labels read as the spec writes them", () => {
    expect(t.navItem.projectsList).toBe("الأنشطة");
    expect(t.navItem.projectNew).toBe("نشاط جديد");
    expect(t.projects.title).toBe("الأنشطة");
    expect(t.projects.listTitle).toBe("الأنشطة");
    expect(t.projects.add).toBe("نشاط جديد");
    expect(t.projects.activeOnHome).toBe("الأنشطة الجارية");
    expect(t.projects.viewAll).toBe("عرض كل الأنشطة");
    expect(t.projects.emptyHint).toBe("النشاط بند تسميه أنت وله تكاليفه الخاصة، مثل فرع جديد أو مناسبة.");
    expect(t.ledgerTabs.activities).toBe("الأنشطة");
    // D13: masculine agreement with النشاط.
    expect(t.projects.markCompleted).toBe("تعليم كمكتمل");
    expect(t.err.projectClosed).toBe("لا يمكن ربط حركة جديدة بنشاط مكتمل أو ملغى");
  });

  it("the words that mean \"add\" keep «إضافة»", () => {
    expect(t.common.add).toContain("إضاف");
    expect(t.parties.add).toBe("إضافة جهة");
    expect(t.schedule.addRow).toContain("إضاف");
    expect(t.addSheet.title).toBe("إضافة");
    expect(t.addSheet.tab).toBe("+ إضافة");
  });
});
