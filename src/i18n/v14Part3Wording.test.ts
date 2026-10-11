import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";
import { CUSTOMER_PAYMENT_CATEGORY } from "@/lib/categoryNames";

/**
 * v1.4 part 3 (docs/V14-SPEC.md D29–D31): the product owner's wording rulings
 * R1–R16, pinned through `t` so a value restored in any src/i18n file fails
 * here. The bold strings of D29 are pinned verbatim; the sweeps walk every
 * string under `t`, so an old word returning anywhere is caught by key.
 */
function walk(node: unknown, prefix: string, out: Array<[string, string]>) {
  if (typeof node === "string") out.push([prefix, node]);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, prefix ? `${prefix}.${k}` : k, out);
  }
}
const strings: Array<[string, string]> = [];
walk(t, "", strings);
const keysContaining = (needle: string | RegExp) =>
  strings.filter(([, v]) => (typeof needle === "string" ? v.includes(needle) : needle.test(v))).map(([k]) => k);

/** The staff member's own sign-up field and its errors keep «رمز الانضمام» (D31 k). */
const STAFF_SIDE = /^(auth|err|signupForm)\./;

describe("D29 — the user's bold strings, verbatim", () => {
  it("R1: the home tile and the «+» row, and the dues empty state with its two links", () => {
    expect(t.quickActions.recordPayment).toBe("دفعة على اتفاقية");
    expect(t.addSheet.recordPayment).toBe("دفعة على اتفاقية");
    expect(t.dues.emptyIntro).toBe("هنا تظهر الأقساط التي حان موعدها هذا الأسبوع: لنا من العملاء وعلينا للموردين والموظفين.");
    expect(t.dues.cashLink).toBe("قبضت مبلغًا بدون اتفاقية؟ سجّله كحركة جديدة");
    expect(t.dues.partiesLink).toBe("كم باقي على عميل؟ افتح الجهات");
    expect(t.navItem.parties).toBe("الجهات");
  });

  it("R2: the direction helper", () => {
    expect(t.direction.help).toBe("وارد = دخل لي · صادر = طلع مني");
    expect(t.direction.IN).toBe("وارد");
    expect(t.direction.OUT).toBe("صادر");
  });

  it("R4: the save toast and the ledger's collapse button", () => {
    expect(t.transaction.saved).toBe("تم حفظ الحركة");
    expect(t.common.filter).toBe("تصفية");
  });

  it("R5: the switch, its helper, the reset label, the link hint, the card heading and its empty text", () => {
    expect(t.settings.editAllowed).toBe("التعديل: مسموح");
    expect(t.settings.editNotAllowed).toBe("التعديل: غير مسموح");
    expect(t.settings.editHelp).toBe("الموظف يضيف الحركات دائمًا؛ هذا الخيار يسمح له بتعديلها.");
    expect(t.settings.resetPasswordFor).toBe("تعيين كلمة مرور جديدة (اختياري)");
    expect(t.settings.resetPasswordFor).not.toContain("*");
    expect(t.settings.linkLoginHint).toBe("لربط حساب الدخول بملف الموظف: الموظفون ← الموظف ← تعديل ← حساب الدخول المرتبط");
    expect(t.settings.staffActive).toBe("حسابات الموظفين");
    expect(t.settings.noStaff).toBe("لا توجد حسابات دخول بعد.");
    expect(t.settings.noStaff).not.toContain("لا يوجد موظفون");
  });

  it("R6: salary payment wording carries the month and the name", () => {
    expect(t.employees.paySalary).toBe("صرف راتب");
    expect(t.payment.salaryTitle).toContain("{month}");
    expect(t.payment.salaryTitle).toContain("{name}");
    expect(t.payment.salaryTitle).toContain("راتب شهر {month}");
    expect(t.payment.salaryRemaining).toBe("المتبقي من راتب الشهر");
    expect(t.payment.upcomingSalaries).toBe("الرواتب القادمة");
    expect(t.payment.salaryRollsOver).toBe("ما يزيد عن راتب هذا الشهر يُحتسب للرواتب القادمة.");
  });

  it("R7: the category helper under «وارد»", () => {
    expect(t.transaction.categoryHelpIn).toBe("البيع المباشر = مبيعات · دفعة على اتفاقية = سداد من عميل");
  });

  it("R8: the title prefill names the party", () => {
    expect(t.plans.titlePrefill).toBe("اتفاقية مع {name}");
  });

  it("R9: the pending-join notice names the requester", () => {
    expect(t.pendingJoin.one).toContain("{name}");
    expect(t.pendingJoin.one).toBe("طلب انضمام جديد من {name}");
    expect(typeof t.pendingJoin.open === "string" && t.pendingJoin.open.length > 0).toBe(true);
  });

  it("R10: the two trailing party options", () => {
    expect(t.partyQuick.add).toBe("+ جهة جديدة (تُحفظ للمرات القادمة)");
    expect(t.parties.other).toBe("أخرى — اسم لمرة واحدة (لا يُحفظ)");
  });

  it("R11 / D31a: one «عرض» button, the aging tab renamed, the print title", () => {
    expect(t.common.apply).toBe("عرض");
    expect(t.aging.tab).toBe("المتأخرات حسب المدة");
    expect(t.aging.title).toBe("المتأخرات حسب المدة");
    expect(t.aging.printTitle).toBe("تقرير المتأخرات حسب المدة");
  });

  it("R12: the lock confirm names the month", () => {
    expect(t.settings.lockConfirm).toContain("{month}");
    expect(t.settings.lockConfirm).toBe("سيُقفل {month}: لا يمكن بعدها إضافة حركاته أو تعديلها حتى تفتحه.");
  });

  it("R14: the first-date control and the schedule hint", () => {
    expect(t.schedule.firstDate).toBe("تاريخ أول قسط");
    expect(t.schedule.editHint).toBe("يمكنك تعديل أي صف بعد التوليد");
  });

  it("R15: the lock badge lines, «مسجّل», the net card helper", () => {
    expect(t.lock.badgeHintOwner).toBe("لا يمكن التعديل — افتح الشهر من إقفال الأشهر");
    expect(t.lock.badgeHintStaff).toBe("لا يمكن التعديل — الشهر مقفل");
    expect(t.attendance.computed).toBe("مسجّل");
    expect(t.dashboard.monthNetHint).toBe("الوارد − الصادر هذا الشهر");
  });

  it("R16: the four subtitles, the sheet row's second line and the renames", () => {
    expect(t.plans.subtitle).toBe("ما اتفقت عليه مع عميل أو مورد ويُدفع على دفعات، وكذلك رواتب الموظفين");
    expect(t.dues.subtitle).toBe("ما حان موعده هذا الأسبوع");
    expect(t.transaction.newSubtitle).toBe("قبض أو صرف");
    expect(t.settings.locksSubtitle).toBe("منع التعديل على شهر منتهٍ");
    expect(t.addSheet.newProjectHint).toBe("مشروع أو مناسبة لها تكاليفها");
    expect(t.navItem.logins).toBe("دخول الموظفين");
    expect(t.navItem.joinCode).toBe("رمز انضمام الموظفين");
    expect(t.settings.tabJoinCode).toBe("رمز انضمام الموظفين");
    expect(t.settings.joinCodeTitle).toBe("رمز انضمام الموظفين");
    expect(t.status.verified).toBe("البريد مؤكَّد");
    expect(t.status.unverified).toBe("البريد غير مؤكَّد");
    expect(t.plans.archive).toBe("إنهاء وأرشفة");
  });
});

describe("D29 sweeps — the old words are gone from the owner's screens", () => {
  it("R7: «دفعة من عميل» is in no value under t and not in DEFAULT_CATEGORIES; «سداد من عميل» is seeded", () => {
    expect(keysContaining("دفعة من عميل")).toEqual([]);
    // Anchored on the seed row's own syntax, so prose in a comment cannot match.
    const src = readFileSync(path.resolve(__dirname, "../features/admin/actions.ts"), "utf8");
    expect(src).toContain('{ nameAr: CUSTOMER_PAYMENT_CATEGORY, type: "IN" }');
    expect(CUSTOMER_PAYMENT_CATEGORY).toBe("سداد من عميل");
    expect(src).not.toContain('nameAr: "دفعة من عميل"');
  });

  it.each(["حسابات الدخول", "أرشفة الاتفاقية", "مُوثّق", "محسوب", "أعمار المستحقات"])(
    "no value under t contains «%s»",
    (phrase) => {
      expect(keysContaining(phrase)).toEqual([]);
    },
  );

  it("«تطبيق» names no button (the word «التطبيق» = the app may stay)", () => {
    expect(keysContaining(/(^|\s|[«(])تطبيق/)).toEqual([]);
  });

  it("«رمز الانضمام» survives only on the staff member's own side (D31 k)", () => {
    const hits = keysContaining("رمز الانضمام");
    expect(hits.filter((k) => !STAFF_SIDE.test(k))).toEqual([]);
    expect(hits).toContain("auth.joinCode");
    expect(t.auth.joinCode).toBe("رمز الانضمام");
  });

  it("no value uses Eastern digits", () => {
    expect(keysContaining(/[٠-٩]/)).toEqual([]);
  });
});
