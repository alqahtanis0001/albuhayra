/**
 * v1.5 strings — home overview wheel, nav tidy-up, dark theme (docs/V15-SPEC.md).
 * Spread into `t` by src/i18n/ar.ts. Keys are the lead's; agents may improve
 * values in their own sections (see the ownership table in the spec).
 * Placeholders: `{n}`, `{name}`, `{amount}`, `{pct}`, `{net}`, `{arrow}`,
 * `{date}`. Digits are always Western. Section names are new on purpose: the
 * spread into `t` is shallow, so reusing a v1.4 section name (e.g. `addSheet`)
 * would replace it whole. Existing labels are reused, not repeated:
 * `t.addSheet.*`, `t.employees.paySalary` («صرف راتب»), `t.plans.add`
 * («اتفاقية جديدة»), `t.nav.home` («الرئيسية»), `t.nav.reports`,
 * `t.aging.tab` and `t.reportFilter.byCategoryTab` (the two report sub-tabs),
 * `t.addSheet.newProjectHint`, `t.common.currency`, `t.dues.toUs` / `fromUs`.
 */
import type { PluralForms } from "@/lib/plural";

export const v15Sections = {
  /** `home`, A1 — the overview wheel (wording from docs/mocks/v15-overview-wheel.html). */
  wheel: {
    title: "نظرة شاملة على المنشأة",
    hint: "اضغط أي جزء من الدائرة أو أي صف تحتها",
    /** The svg's accessible name. */
    aria: "نظرة شاملة: الرصيد، وارد وصادر الشهر، المصروفات حسب الفئة، الالتزامات، والثلاثون يومًا القادمة",
    centreLabel: "الرصيد الإجمالي",
    /**
     * D29: `{net}` = this month's net, signed, whole riyals; `{arrow}` = one of
     * the three below; `{pct}` = `formatPercent(|pct|)` (unsigned, with its %,
     * Western digits) — the direction is the arrow's job, never a second sign.
     */
    centreSub: "الصافي {net} · {arrow}{pct}",
    /** Momentum above ±999% (the cards' `capped`). */
    centreSubCapped: "الصافي {net} · {arrow}{pct} أو أكثر",
    arrowUp: "↑",
    arrowDown: "↓",
    arrowFlat: "=",
    /** When last month's to-date net is 0 (no percentage to show). */
    centreSubNoPct: "الصافي {net}",
    empty: "لا توجد بيانات بعد",
    in: "وارد",
    out: "صادر",
    inMonth: "وارد الشهر",
    outMonth: "صادر الشهر",
    other: "أخرى",
    toUs: "لنا من العملاء",
    fromUs: "علينا للموردين",
    salaries: "رواتب الشهر",
    today: "اليوم",
    replay: "إعادة العرض",
    showAll: "إظهار الكل",
    /** sr-only: what a second activation does. */
    openHint: "اضغط مرة أخرى للفتح",
    /** aria-label of a segment: `{name}` + `{amount}` (exact, formatted with its currency — D29). */
    segment: "{name}: {amount}",
    ring1Name: "الحلقة الداخلية",
    ring2Name: "الحلقة الوسطى",
    ring3Name: "الحلقة الخارجية",
    ring4Name: "الإطار",
    row1Title: "الحلقة الداخلية — هذا الشهر",
    row1Text: "كم دخل وكم خرج. الأخضر وارد، الأحمر صادر. طول كل قوس بحجم المبلغ.",
    row2Title: "الحلقة الوسطى — أين ذهب الصادر",
    row2Text: "الصادر نفسه مقسومًا حسب الفئة. أكبر قوس = أكبر مصروف.",
    row3Title: "الحلقة الخارجية — الالتزامات",
    row3Text: "ما لك وما عليك خارج هذا الشهر: من الاتفاقيات والرواتب.",
    row4Title: "الإطار — الثلاثون يومًا القادمة",
    row4Text:
      "النقطة السوداء في الأعلى هي اليوم، والدوران مع عقارب الساعة هو الأيام القادمة. كل نقطة قسط أو راتب، وحجمها بحجم المبلغ.",
    /** Centre text when a row (a whole ring) is focused. */
    ring1Focus: "هذا الشهر",
    ring2Focus: "أين ذهب الصادر",
    ring3Focus: "الالتزامات",
    ring4Focus: "الثلاثون يومًا القادمة",
    ring1FocusSub: "وارد + صادر",
    ring2FocusSub: "إجمالي الصادر",
    ring3FocusSub: "إجمالي الالتزامات",
    ring4FocusSub: "أقساط ورواتب",
    legendOverdue: "متأخر",
    legendIn: "قسط لنا",
    legendOut: "قسط علينا",
    legendSalary: "يوم الرواتب",
    dialCount: {
      one: "موعد واحد",
      two: "موعدان",
      few: "{n} مواعيد",
      many: "{n} موعدًا",
      other: "{n} موعد",
    } satisfies PluralForms,
    /** Dot labels; `{name}` = the party or employee. */
    dotOverdue: {
      one: "قسط {name} — متأخر يومًا واحدًا",
      two: "قسط {name} — متأخر يومين",
      few: "قسط {name} — متأخر {n} أيام",
      many: "قسط {name} — متأخر {n} يومًا",
      other: "قسط {name} — متأخر {n} يوم",
    } satisfies PluralForms,
    dotToday: "قسط {name} — اليوم",
    dotIn: {
      one: "قسط لنا من {name} — بعد يوم واحد",
      two: "قسط لنا من {name} — بعد يومين",
      few: "قسط لنا من {name} — بعد {n} أيام",
      many: "قسط لنا من {name} — بعد {n} يومًا",
      other: "قسط لنا من {name} — بعد {n} يوم",
    } satisfies PluralForms,
    dotOut: {
      one: "قسط علينا لـ{name} — بعد يوم واحد",
      two: "قسط علينا لـ{name} — بعد يومين",
      few: "قسط علينا لـ{name} — بعد {n} أيام",
      many: "قسط علينا لـ{name} — بعد {n} يومًا",
      other: "قسط علينا لـ{name} — بعد {n} يوم",
    } satisfies PluralForms,
    dotSalary: {
      one: "راتب {name} — بعد يوم واحد",
      two: "راتب {name} — بعد يومين",
      few: "راتب {name} — بعد {n} أيام",
      many: "راتب {name} — بعد {n} يومًا",
      other: "راتب {name} — بعد {n} يوم",
    } satisfies PluralForms,
    /** D18: a day-dot holding several dues; `{date}` = the compact date. */
    cluster: {
      one: "موعد واحد في {date}",
      two: "موعدان في {date}",
      few: "{n} مواعيد في {date}",
      many: "{n} موعدًا في {date}",
      other: "{n} موعد في {date}",
    } satisfies PluralForms,
    /** D18: three or more overdue dues collapse to one hollow dot. */
    clusterOverdue: {
      one: "قسط متأخر واحد",
      two: "قسطان متأخران",
      few: "{n} أقساط متأخرة",
      many: "{n} قسطًا متأخرًا",
      other: "{n} قسط متأخر",
    } satisfies PluralForms,
  },

  /** `home`, A2 — the «يحتاج انتباهك» card. */
  attention: {
    title: "يحتاج انتباهك",
    /** sr text of the heading badge. */
    badge: {
      one: "أمر واحد",
      two: "أمران",
      few: "{n} أمور",
      many: "{n} أمرًا",
      other: "{n} أمر",
    } satisfies PluralForms,
    overdue: {
      one: "قسط متأخر واحد",
      two: "قسطان متأخران",
      few: "{n} أقساط متأخرة",
      many: "{n} قسطًا متأخرًا",
      other: "{n} قسط متأخر",
    } satisfies PluralForms,
    thisWeek: "أقساط هذا الأسبوع",
    pending: {
      one: "طلب انضمام من {name}",
      two: "طلبا انضمام: {name}",
      few: "{n} طلبات انضمام: {name}",
      many: "{n} طلبًا للانضمام: {name}",
      other: "{n} طلب انضمام: {name}",
    } satisfies PluralForms,
    salaryToday: "الرواتب اليوم",
    salaryIn: {
      one: "الرواتب بعد يوم واحد",
      two: "الرواتب بعد يومين",
      few: "الرواتب بعد {n} أيام",
      many: "الرواتب بعد {n} يومًا",
      other: "الرواتب بعد {n} يوم",
    } satisfies PluralForms,
  },

  /** `home`, A3/A4 — the details disclosure and the recent list's link. */
  homeDetails: {
    title: "التفاصيل والرسوم",
    holds: "الرسم البياني للأشهر الستة، المصروفات حسب الفئة، الرصيد حسب طريقة الدفع، الأنشطة الجارية",
    viewAll: "عرض الكل",
  },

  /** `nav`, B3 — the second line under each «+» row. Labels reuse t.addSheet / t.employees / t.plans. */
  addHints: {
    newEntry: "مبلغ دخل أو خرج اليوم",
    recordPayment: "عميل أو مورد دفع قسطًا من اتفاقية قائمة",
    paySalary: "دفع راتب موظف عن هذا الشهر",
    newPlan: "إنشاء اتفاق/عقد جديد لعميل أو مورد يُدفع على أقساط أو حسب التيسير.",
    newParty: "عميل أو مورد تتعامل معه",
    newEmployee: "بياناته وراتبه ودوامه",
    myCheckIn: "تسجيل حضورك أو انصرافك",
  },

  /** `nav`, B2 — the reports tab inside السجل and its two sub-tabs. */
  reportsTabs: {
    tab: "التقارير",
    /** aria-label of the sub-tab strip. */
    label: "نوع التقرير",
  },

  /** `nav`, B3 row 3 — /owner/staff?pick=salary. */
  salaryPick: {
    banner: "اختر الموظف لصرف راتبه",
    paid: "مدفوع",
    /** No active employee has a salary instalment this month (D21). */
    empty: "لا يوجد راتب مستحق لهذا الشهر.",
    cancel: "إلغاء الاختيار",
  },

  /** `theme`, C2 — the TopBar toggle. `{mode}` = one of the three names. */
  theme: {
    toggle: "المظهر: {mode}",
    light: "فاتح",
    dark: "داكن",
    system: "حسب الجهاز",
  },
} as const;
