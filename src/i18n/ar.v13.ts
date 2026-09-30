/**
 * v1.3 strings — the visual pass (docs/V13-SPEC.md). Spread into `t` by
 * src/i18n/ar.ts. Keys are the lead's; agents may improve values. Placeholders:
 * `{pct}`, `{amount}`, `{name}`, `{date}`, `{from}`, `{to}`, `{month}`,
 * `{time}`, `{status}`, `{n}` and the count names in `heatCell`. Digits are
 * always Western. Counted strings are PluralForms for `plural()`.
 */

export const v13Sections = {
  /** `dash`, items 1–5. */
  dashVisual: {
    // 3 — momentum on «الصافي»: this month so far vs the same days of last
    // month (lead ruling). `{pct}` is the signed value with its % (in a <bdi dir="ltr">).
    momentum: "{pct} عن الفترة نفسها من الشهر الماضي",
    momentumNone: "—",
    momentumNoneHint: "لا يمكن المقارنة بالشهر الماضي",
    /** Above ±999% (a near-zero previous net): the capped wording, sign included in `{pct}`. */
    momentumOver: "{pct} أو أكثر عن الفترة نفسها من الشهر الماضي",
    momentumUp: "ارتفاع",
    momentumDown: "انخفاض",
    momentumFlat: "دون تغيير",
    // 2 — sparklines (aria-label / text equivalent)
    sparkBalance: "الرصيد خلال آخر 30 يومًا",
    sparkNet: "الصافي اليومي خلال آخر 30 يومًا",
    sparkIn: "الوارد اليومي خلال آخر 30 يومًا",
    sparkOut: "الصادر اليومي خلال آخر 30 يومًا",
    sparkSummary: "من {from} إلى {to}: أعلى قيمة {max}، وأدنى قيمة {min}",
    // 4 — expense donut
    donutTitle: "المصروفات حسب الفئة هذا الشهر",
    donutCenter: "مصروفات الشهر",
    donutOther: "أخرى",
    donutSliceLink: "عرض مصروفات «{name}» في السجل",
    donutTable: "جدول المصروفات حسب الفئة",
    share: "النسبة",
    // 5 — six-month card tabs and the waterfall
    tabBars: "الوارد والصادر",
    tabWaterfall: "التدفق النقدي",
    waterfallMonth: "الشهر",
    opening: "الرصيد الافتتاحي",
    income: "الوارد",
    expenses: "الصادر",
    closing: "الرصيد الختامي",
    waterfallText: "الرصيد الافتتاحي {opening}، الوارد {income}، الصادر {expenses}، الرصيد الختامي {closing}",
  },

  /** `flow`, item 6 — week ribbon on المستحقات. */
  duesRibbon: {
    label: "المستحقات حسب اليوم",
    overdue: "متأخرة",
    today: "اليوم",
    toUs: "لنا",
    fromUs: "علينا",
    nothing: "لا شيء",
    count: {
      one: "دفعة واحدة",
      two: "دفعتان",
      few: "{n} دفعات",
      many: "{n} دفعة",
      other: "{n} دفعة",
    },
    jump: "عرض دفعات {date}",
  },

  /** `flow`, items 7–8 — segmented instalment bar and the payment highlight. */
  planBar: {
    label: "حالة الأقساط",
    /** `{status}` is `t.instalmentStatus[status]` — the bar and the badge use the same words. */
    segment: "{name} — {amount} — {status}",
    paymentRecorded: "تم تسجيل الدفعة",
  },

  /** `flow`, item 9 — budget meter and the category ring. */
  budgetMeter: {
    spent: "المصروف {amount}",
    budget: "الميزانية {amount}",
    remaining: "المتبقي {amount}",
    over: "تجاوز الميزانية بـ {amount}",
    /** `{pct}` includes its % sign, inside <bdi dir="ltr">. */
    pct: "{pct} من الميزانية",
    byCategory: "التكاليف حسب الفئة",
    other: "أخرى",
  },

  /** `people`, item 10 — attendance colours and the 12-month strip. */
  attendanceVisual: {
    legend: "دلالة الرموز والألوان",
    heatTitle: "الحضور خلال آخر 12 شهرًا",
    heatRate: "نسبة الحضور",
    heatCell: "{month}: نسبة الحضور {pct} — حاضر {present}، متأخر {late}، غائب {absent}، إجازة {leave}، عن بُعد {remote}",
    heatNoData: "{month}: لا توجد بيانات",
    heatBeforeHire: "{month}: قبل تاريخ التعيين",
  },

  /** `people`, item 11 — live clock card. */
  liveClock: {
    now: "الوقت الآن",
    timeLeft: {
      one: "متبقي دقيقة واحدة قبل التأخير",
      two: "متبقي دقيقتان قبل التأخير",
      few: "متبقي {n} دقائق قبل التأخير",
      many: "متبقي {n} دقيقة قبل التأخير",
      other: "متبقي {n} دقيقة قبل التأخير",
    },
    lessThanMinute: "متبقي أقل من دقيقة قبل التأخير",
    late: "انتهت مهلة السماح، وسيُسجَّل الحضور متأخرًا",
    ringLabel: "الوقت المتبقي قبل التأخير",
    checkedIn: "سُجّل الحضور الساعة {time}",
    noStart: "لم يُحدَّد وقت بداية الدوام، فلا يُحتسب تأخير",
  },

  /** `people`, item 12 — payslip hero. */
  payslipHero: {
    net: "صافي الراتب",
    gross: "إجمالي الاستحقاق",
    deductions: "الخصومات",
    stepsLabel: "من الإجمالي إلى الصافي",
    stepsText: "الإجمالي {gross} ناقص الخصومات {deductions} يساوي الصافي {net}",
  },

  /** `people`, item 13 — statement header. «له عندنا» in the spec reads as "we owe them"; see PROGRESS.md. */
  statementHeader: {
    owesUs: "لنا عنده",
    weOwe: "علينا له",
    settled: "متسوٍّ",
    sparkLabel: "تطور الرصيد",
    sparkSummary: "الرصيد من {from} إلى {to}، الحالي {amount}",
  },

  /** `people`, item 14 — aging tiles and per-party bars. */
  agingVisual: {
    tilesLabel: "ملخص الأعمار",
    count: {
      one: "دفعة واحدة",
      two: "دفعتان",
      few: "{n} دفعات",
      many: "{n} دفعة",
      other: "{n} دفعة",
    },
    barLabel: "توزيع متأخرات {name} حسب العمر",
    segment: "{bucket}: {amount}",
  },
} as const;
