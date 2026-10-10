/**
 * v1.4 strings — simpler owner flows (docs/V14-SPEC.md). Spread into `t` by
 * src/i18n/ar.ts; `errV14` is merged into `t.err`. Keys are the lead's; agents
 * may improve values. Placeholders: `{name}`, `{amount}`, `{pct}`. Digits are
 * always Western. Labels that already exist elsewhere are NOT repeated here:
 * reuse `t.common.save` / `cancel`, `t.transaction.*` (amount, date,
 * paymentMethod, note), `t.plans.recordPayment`, `t.payment.title`,
 * `t.err.paymentLinkFixed`, `t.err.planClosed`, `t.err.concurrentChange`.
 */

export const v14Sections = {
  /** `cats`, A2–A4 — the two links under the category select and edit mode. */
  categoryQuick: {
    add: "+ إضافة تصنيف",
    edit: "تعديل التصنيفات",
    /** Label of the inline name input (visually hidden is fine). */
    name: "اسم التصنيف الجديد",
    added: "تمت إضافة التصنيف",
    /** ConfirmDialog body. */
    hideConfirm: "إخفاء التصنيف «{name}»؟ الحركات القديمة تحتفظ به.",
    /** aria-label of a chip's ✕. */
    hide: "إخفاء التصنيف {name}",
    hidden: "تم إخفاء التصنيف",
    chipsLabel: "التصنيفات النشطة",
    done: "تم",
    more: "المزيد (إعادة ترتيب، إعادة تسمية، إظهار)",
  },

  /** `cats`, A5 — the settings page that keeps every function. */
  categoriesPage: {
    back: "← الإعدادات",
    hint: "يمكنك أيضًا إضافة التصنيفات وإخفاؤها مباشرة من نموذج الحركة.",
  },

  /** `add`, B1–B2 — the one «+» and its sheet. */
  addSheet: {
    /** The nav item that opens the sheet (not a link). */
    tab: "+ إضافة",
    title: "إضافة",
    newEntry: "حركة جديدة",
    recordPayment: "تسجيل دفعة",
    newProject: "نشاط جديد",
    newParty: "جهة جديدة",
    newEmployee: "موظف جديد",
    /** Staff, linked login only. */
    myCheckIn: "تسجيل حضوري",
  },

  /** `add`, B3 — tabs on /owner/transactions. */
  ledgerTabs: {
    entries: "الحركات",
    activities: "الأنشطة",
  },

  /** `plans`, C2–C6 — open-ended agreements. */
  openPlan: {
    kindLabel: "نوع الاتفاقية",
    kindFixed: "دفعات محددة",
    kindFixedHint: "مبلغ إجمالي مقسّم على جدول دفعات بتواريخ معلومة.",
    kindOpen: "اتفاقية مفتوحة",
    kindOpenHint: "تسجّل الدفعات كما تصل، بلا جدول، والإجمالي اختياري.",
    total: "إجمالي المبلغ (اختياري)",
    totalHelp: "اتركه فارغًا إذا كان المبلغ غير محدد.",
    expectedEnd: "تاريخ الانتهاء المتوقع (اختياري)",
    noExpectedEnd: "بدون تاريخ انتهاء متوقع",
    receivedSoFar: "المستلم حتى الآن",
    paidSoFar: "المدفوع حتى الآن",
    remaining: "المتبقي",
    /** aria-label of the progress bar; `{pct}` includes its % sign, inside <bdi dir="ltr">. */
    progressLabel: "المحصّل {pct} من الإجمالي",
    /** Tag on the plans list card. */
    tag: "مفتوحة",
    /** List card line when there is no total. */
    receivedShort: "المستلم: {amount}",
    paidShort: "المدفوع: {amount}",
    payments: "الدفعات",
    noPayments: "لا توجد دفعات بعد.",
    byWhom: "سجّلها",
    editPayment: "تعديل الحركة",
    close: "إنهاء الاتفاقية",
    closeConfirm: "سيتم إنهاء الاتفاقية ولن تُسجَّل عليها دفعات جديدة، وتبقى الدفعات المسجلة كما هي. هل تريد المتابعة؟",
    closed: "منتهية",
    reopen: "إعادة فتح",
    /** Notice after a payment that completed the total (C4). */
    autoClosed: "اكتمل إجمالي الاتفاقية وأُنهيت.",
    /** Top banner on /owner/plans?pick=payment (C6). */
    pickBanner: "اختر الاتفاقية لتسجيل الدفعة",
    recorded: "تم تسجيل الدفعة",
  },

  /** v1.4 error keys. Merged into `t.err` by ar.ts. */
  errV14: {
    planBothLinks: "لا يمكن ربط الحركة بدفعة وباتفاقية مفتوحة معًا",
    planNotOpenEnded: "هذه الاتفاقية ليست مفتوحة",
    planKindFixed: "لا يمكن تغيير نوع الاتفاقية",
    expectedEndBeforeStart: "تاريخ الانتهاء المتوقع لا يسبق تاريخ البدء",
    planReopenNotAllowed: "إعادة الفتح متاحة للاتفاقيات المفتوحة فقط",
  },
} as const;
