import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.5 (docs/V15-SPEC.md A–C, D43): the product owner's v1.5 wording, pinned
 * verbatim through `t`, so a value changed in any src/i18n file fails here.
 * The wheel's row texts come from the approved mock
 * (docs/mocks/v15-overview-wheel.html); the «+» captions and the pick banner
 * from §B3; the card titles from §A. Other tests compare `t.*` keys with each
 * other; this file is the only one holding the literal words (qa-tests H28,
 * N01, N02).
 */

describe("§A — the home page", () => {
  it("A1: the wheel's title, centre and empty text", () => {
    expect(t.wheel.title).toBe("نظرة شاملة على المنشأة");
    expect(t.wheel.centreLabel).toBe("الرصيد الإجمالي");
    expect(t.wheel.empty).toBe("لا توجد بيانات بعد");
    expect(t.wheel.today).toBe("اليوم");
    expect(t.wheel.showAll).toBe("إظهار الكل");
    expect(t.wheel.replay).toBe("إعادة العرض");
  });

  it("A1: ring 3's three commitments", () => {
    expect(t.wheel.toUs).toBe("لنا من العملاء");
    expect(t.wheel.fromUs).toBe("علينا للموردين");
    expect(t.wheel.salaries).toBe("رواتب الشهر");
    expect(t.wheel.other).toBe("أخرى");
  });

  it("A1: the four numbered rows, worded as in the mock", () => {
    expect(t.wheel.row1Title).toBe("الحلقة الداخلية — هذا الشهر");
    expect(t.wheel.row1Text).toBe("كم دخل وكم خرج. الأخضر وارد، الأحمر صادر. طول كل قوس بحجم المبلغ.");
    expect(t.wheel.row2Title).toBe("الحلقة الوسطى — أين ذهب الصادر");
    expect(t.wheel.row2Text).toBe("الصادر نفسه مقسومًا حسب الفئة. أكبر قوس = أكبر مصروف.");
    expect(t.wheel.row3Title).toBe("الحلقة الخارجية — الالتزامات");
    expect(t.wheel.row3Text).toBe("ما لك وما عليك خارج هذا الشهر: من الاتفاقيات والرواتب.");
    expect(t.wheel.row4Title).toBe("الإطار — الثلاثون يومًا القادمة");
    expect(t.wheel.row4Text).toBe(
      "النقطة السوداء في الأعلى هي اليوم، والدوران مع عقارب الساعة هو الأيام القادمة. كل نقطة قسط أو راتب، وحجمها بحجم المبلغ.",
    );
    expect([t.wheel.legendOverdue, t.wheel.legendIn, t.wheel.legendOut, t.wheel.legendSalary]).toEqual([
      "متأخر",
      "قسط لنا",
      "قسط علينا",
      "يوم الرواتب",
    ]);
  });

  it("A2/A3: the attention card and the details disclosure", () => {
    expect(t.attention.title).toBe("يحتاج انتباهك");
    expect(t.attention.salaryIn.few.replace("{n}", "5")).toBe("الرواتب بعد 5 أيام");
    expect(t.attention.salaryIn.many.replace("{n}", "10")).toBe("الرواتب بعد 10 يومًا");
    expect(t.homeDetails.title).toBe("التفاصيل والرسوم");
    expect(t.homeDetails.viewAll).toBe("عرض الكل");
  });
});

describe("§B — navigation", () => {
  it("B1: the logo link is named «الرئيسية»", () => {
    expect(t.nav.home).toBe("الرئيسية");
  });

  it("B2: the three ledger tabs and the two report sub-tabs", () => {
    expect([t.ledgerTabs.entries, t.ledgerTabs.activities, t.reportsTabs.tab]).toEqual(["الحركات", "الأنشطة", "التقارير"]);
    expect([t.reportFilter.byCategoryTab, t.aging.tab]).toEqual(["حسب التصنيف", "المتأخرات حسب المدة"]);
  });

  it("B3: the seven owner rows, each label with its caption, verbatim", () => {
    const rows: Array<[string, string]> = [
      [t.addSheet.newEntry, t.addHints.newEntry],
      [t.addSheet.recordPayment, t.addHints.recordPayment],
      [t.employees.paySalary, t.addHints.paySalary],
      [t.plans.add, t.addHints.newPlan],
      [t.addSheet.newParty, t.addHints.newParty],
      [t.addSheet.newEmployee, t.addHints.newEmployee],
      [t.addSheet.newProject, t.addSheet.newProjectHint],
    ];
    expect(rows).toEqual([
      ["حركة جديدة", "مبلغ دخل أو خرج اليوم"],
      ["دفعة على اتفاقية", "عميل أو مورد دفع قسطًا من اتفاقية قائمة"],
      ["صرف راتب", "دفع راتب موظف عن هذا الشهر"],
      ["اتفاقية جديدة", "إنشاء اتفاق/عقد جديد لعميل أو مورد يُدفع على أقساط أو حسب التيسير."],
      ["جهة جديدة", "عميل أو مورد تتعامل معه"],
      ["موظف جديد", "بياناته وراتبه ودوامه"],
      ["نشاط جديد", "مشروع أو مناسبة لها تكاليفها"],
    ]);
  });

  it("B3: the staff rows and the salary pick banner", () => {
    expect([t.addSheet.newEntry, t.addHints.newEntry]).toEqual(["حركة جديدة", "مبلغ دخل أو خرج اليوم"]);
    expect([t.addSheet.myCheckIn, t.addHints.myCheckIn]).toEqual(["تسجيل حضوري", "تسجيل حضورك أو انصرافك"]);
    expect(t.salaryPick.banner).toBe("اختر الموظف لصرف راتبه");
  });
});

describe("§C — the theme toggle (follow-up D45/D46)", () => {
  it("C2 as amended: two modes, the button names its action, the «المزيد» row is «المظهر»", () => {
    expect([t.theme.light, t.theme.dark]).toEqual(["فاتح", "داكن"]);
    expect([t.theme.toDark, t.theme.toLight]).toEqual(["التبديل إلى المظهر الداكن", "التبديل إلى المظهر الفاتح"]);
    expect(t.theme.title).toBe("المظهر");
    expect(Object.keys(t.theme)).not.toContain("system");
  });
});

describe("follow-up D48 — the rows' trailing link", () => {
  it("reads «عرض» and names its row", () => {
    expect(t.wheel.rowLink).toBe("عرض");
    expect(t.wheel.rowLinkLabel.replace("{title}", t.wheel.row3Title)).toBe("عرض: الحلقة الخارجية — الالتزامات");
  });
});
