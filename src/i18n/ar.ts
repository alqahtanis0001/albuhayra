/**
 * Every Arabic string in the app. No hard-coded Arabic anywhere else.
 * Keys are owned by the lead; `frontend` may improve the values.
 * `err.*` keys are the error contract — server actions return these keys.
 */
import { v12aSections } from "./ar.v12a";
import { v12bSections } from "./ar.v12b";
import { v12cSections } from "./ar.v12c";
import { v13Sections } from "./ar.v13";

const { errV12a, ...v12a } = v12aSections;
const { errV12b, ...v12b } = v12bSections;
const { errV12c, ...v12c } = v12cSections;

const APP_NAME = "زخم";
const APP_TAGLINE = "نظام السجل المالي للمنشآت";

export const t = {
  app: {
    name: APP_NAME,
    tagline: APP_TAGLINE,
    /** Shown beside the wordmark in the top bar for ADMIN, who has no establishment. */
    adminArea: "إدارة النظام",
  },

  /** Alt text for the logo images in public/brand/zakham-brand/. */
  brand: {
    logoAlt: APP_NAME,
    logoWithTaglineAlt: `${APP_NAME} — ${APP_TAGLINE}`,
  },

  notFound: {
    title: "الصفحة غير موجودة",
    body: "تعذّر العثور على الصفحة المطلوبة. ربما نُقلت أو أن الرابط غير صحيح.",
    backHome: "العودة إلى الصفحة الرئيسية",
    toLogin: "الانتقال إلى تسجيل الدخول",
  },

  errorPage: {
    title: "حدث خطأ غير متوقع",
    body: "تعذّر إكمال الطلب. يُرجى إعادة المحاولة، وإن تكرّر الخطأ فتواصل مع الدعم.",
    retry: "إعادة المحاولة",
  },

  common: {
    save: "حفظ",
    saveAndAddAnother: "حفظ وإضافة أخرى",
    cancel: "إلغاء",
    edit: "تعديل",
    delete: "حذف",
    confirm: "تأكيد",
    close: "إغلاق",
    back: "رجوع",
    search: "بحث",
    filter: "تصفية",
    clearFilters: "إزالة التصفية",
    apply: "تطبيق",
    add: "إضافة",
    logout: "تسجيل الخروج",
    loading: "جارٍ التحميل…",
    saving: "جارٍ الحفظ…",
    signingOut: "جارٍ تسجيل الخروج…",
    sending: "جارٍ الإرسال…",
    verifying: "جارٍ التحقق…",
    saved: "تم الحفظ",
    deleted: "تم الحذف",
    copy: "نسخ",
    copied: "تم النسخ",
    yes: "نعم",
    no: "لا",
    total: "الإجمالي",
    optional: "اختياري",
    required: "مطلوب",
    print: "طباعة",
    exportExcel: "تصدير Excel",
    moveUp: "تحريك للأعلى",
    moveDown: "تحريك للأسفل",
    enable: "تفعيل",
    disable: "تعطيل",
    accept: "قبول",
    reject: "رفض",
    all: "الكل",
    none: "لا شيء",
    currency: "ر.س",
    page: "صفحة",
    of: "من",
    next: "التالي",
    previous: "السابق",
    rowsCount: "عدد السجلات",
  },

  nav: {
    home: "الرئيسية",
    add: "إضافة",
    ledger: "السجل",
    reports: "التقارير",
    settings: "الإعدادات",
    requests: "الطلبات",
    establishments: "المنشآت",
    account: "حسابي",
    menu: "القائمة",
  },

  auth: {
    loginTitle: "تسجيل الدخول للنظام",
    loginSubmit: "تسجيل الدخول",
    signupTitle: "طلب تسجيل منشأة",
    /** The role-choice step, before owner or staff is known. */
    signupChooseTitle: "تقديم طلب تسجيل",
    staffSignupTitle: "طلب انضمام إلى منشأة",
    signupLink: "ليس لديك حساب؟ تقديم طلب تسجيل",
    loginLink: "لديك حساب؟ تسجيل الدخول",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    name: "الاسم",
    chooseRole: "اختر نوع الحساب",
    asOwner: "صاحب منشأة",
    asOwnerHint: "أنشئ منشأتك وسجل حركاتها المالية",
    asStaff: "موظف",
    asStaffHint: "انضم إلى منشأة برمز الانضمام",
    establishmentName: "اسم المنشأة",
    joinCode: "رمز الانضمام",
    joinCodeHint: "8 أحرف وأرقام إنجليزية، يعطيك إياه صاحب المنشأة",
    passwordHint: "10 أحرف على الأقل",
    changePassword: "تغيير كلمة المرور",
    passwordChanged: "تم تغيير كلمة المرور",
  },

  pending: {
    title: "بانتظار اعتماد الطلب",
    byAdmin: "يتولى مدير النظام مراجعة طلبكم واعتماده.",
    byOwner: "يتولى صاحب المنشأة مراجعة طلبكم واعتماده.",
    hint: "يمكنكم تسجيل الدخول لاحقًا للاطلاع على حالة الطلب.",
  },

  direction: {
    label: "النوع",
    IN: "وارد",
    OUT: "صادر",
  },

  paymentMethod: {
    label: "طريقة الدفع",
    CASH: "نقد",
    BANK_TRANSFER: "تحويل بنكي",
    MADA: "مدى",
    STC_PAY: "STC Pay",
    OTHER: "أخرى",
  },

  footer: {
    version: "الإصدار",
    contactLabel: "للتواصل والدعم الفني:",
    /** Placeholder — replace with the real support address before launch. */
    contactValue: "support@example.com",
  },

  status: {
    label: "الحالة",
    PENDING: "قيد المراجعة",
    ACTIVE: "معتمد",
    DISABLED: "موقوف",
    verified: "مُوثّق",
    unverified: "غير مُوثّق",
  },

  transaction: {
    newTitle: "حركة جديدة",
    editTitle: "تعديل حركة",
    amount: "المبلغ",
    date: "التاريخ",
    category: "التصنيف",
    chooseCategory: "اختر التصنيف",
    counterparty: "الجهة",
    counterpartyHint: "اسم العميل أو المورد",
    note: "ملاحظة",
    addedBy: "أضافه",
    createdAt: "تاريخ الإضافة",
    deleteTitle: "حذف الحركة",
    deleteConfirm: "سيتم حذف هذه الحركة من السجل. هل تريد المتابعة؟",
    addButton: "إضافة حركة",
    hijriHint: "التاريخ الهجري للعرض فقط",
    // v1.2a
    party: "الجهة",
    project: "ضمن إضافة",
  },

  ledger: {
    title: "السجل",
    from: "من تاريخ",
    to: "إلى تاريخ",
    query: "بحث في الجهة أو الملاحظة",
    totalIn: "إجمالي الوارد",
    totalOut: "إجمالي الصادر",
    net: "الصافي",
    emptyTitle: "لا توجد حركات",
    emptyHint: "ابدأ بإضافة أول حركة.",
    emptyFiltered: "لا توجد حركات مطابقة للتصفية.",
  },

  dashboard: {
    ownerTitle: "الرئيسية",
    staffTitle: "الرئيسية",
    balanceTotal: "الرصيد الإجمالي",
    monthIn: "وارد هذا الشهر",
    monthOut: "صادر هذا الشهر",
    monthNet: "الصافي",
    balanceByMethod: "الرصيد حسب طريقة الدفع",
    last6Months: "آخر 6 أشهر",
    topOutCategories: "أعلى المصروفات هذا الشهر",
    percentOfMonthOut: "من صادر الشهر",
    recent: "آخر الحركات",
    myRecent: "حركاتي الأخيرة",
    establishmentWideHint: "الأرقام أعلاه لكامل المنشأة، وليست خاصة بك.",
    noEditPermission: "التعديل يتطلب إذن صاحب المنشأة",
    emptyChart: "لا توجد بيانات لعرضها بعد.",
  },

  reports: {
    title: "التقارير",
    month: "الشهر",
    customRange: "فترة مخصصة",
    inByCategory: "الوارد حسب التصنيف",
    outByCategory: "الصادر حسب التصنيف",
    totalIn: "إجمالي الوارد",
    totalOut: "إجمالي الصادر",
    net: "الصافي",
    rangeLabel: "الفترة",
    printedFor: "منشأة",
    empty: "لا توجد حركات في هذه الفترة.",
  },

  /** The Excel workbook (`/api/export`). Sheet names are Excel tab names: 31 chars max, no `/\?*[]:`. */
  export: {
    ledgerSheet: "الحركات",
    summarySheet: "الملخص",
    infoSheet: "معلومات",
    ledgerTitle: `${APP_NAME} — سجل الحركات`,
    summaryTitle: `${APP_NAME} — ملخص الفترة`,
    establishment: "المنشأة",
    period: "الفترة",
    from: "من",
    to: "إلى",
    generatedAt: "تاريخ الإنشاء",
    generatedBy: "أنشأه",
    appVersion: "إصدار التطبيق",
    byPaymentMethod: "حسب طريقة الدفع",
    totalsRow: "الإجمالي",
    infoItem: "البند",
    infoValue: "القيمة",
  },

  /** The printed report (`/owner/reports` → طباعة). */
  print: {
    printedAt: "تاريخ الطباعة",
    // v1.2a
    statementTitle: "كشف حساب",
    projectSummaryTitle: "ملخص الإضافة",
    generatedBy: `تم الإنشاء بواسطة ${APP_NAME}`,
  },

  settings: {
    title: "الإعدادات",
    tabCategories: "التصنيفات",
    tabStaff: "الموظفون",
    tabJoinCode: "رمز الانضمام",
    tabLocks: "إقفال الأشهر",
    tabAccount: "حسابي",

    categoriesIn: "تصنيفات الوارد",
    categoriesOut: "تصنيفات الصادر",
    categoryName: "اسم التصنيف",
    addCategory: "إضافة تصنيف",
    renameCategory: "تعديل الاسم",

    staffPending: "طلبات الانضمام",
    staffActive: "الموظفون",
    allowEdit: "السماح بالتعديل",
    resetPassword: "إعادة تعيين كلمة المرور",
    resetPasswordFor: "كلمة مرور جديدة للموظف",
    noPendingStaff: "لا توجد طلبات انضمام.",
    noStaff: "لا يوجد موظفون بعد.",
    rejectStaffConfirm: "سيتم رفض الطلب ولن يستطيع الموظف الدخول. هل تريد المتابعة؟",

    joinCodeTitle: "رمز الانضمام",
    joinCodeHint: "أعط هذا الرمز للموظف ليستخدمه عند إنشاء حسابه.",
    regenerate: "إعادة توليد الرمز",
    regenerateConfirm: "سيتوقف العمل بالرمز الحالي فورا. هل تريد المتابعة؟",

    locksTitle: "إقفال الأشهر",
    locksHint: "بعد إقفال الشهر لا يمكن إضافة أو تعديل أو حذف حركاته.",
    lock: "إقفال",
    unlock: "إلغاء الإقفال",
    locked: "مقفل",
    unlocked: "مفتوح",
    lockedBy: "أقفله",
    currentMonthHint: "لا يمكن إقفال الشهر الحالي أو شهر قادم.",
  },

  admin: {
    requestsTitle: "طلبات أصحاب المنشآت",
    noRequests: "لا توجد طلبات جديدة.",
    establishmentsTitle: "المنشآت",
    establishment: "المنشأة",
    owner: "صاحب المنشأة",
    ownerEmail: "بريد صاحب المنشأة",
    staffCount: "عدد الموظفين",
    transactionCount: "عدد الحركات",
    lastActivity: "آخر نشاط",
    requestedAt: "تاريخ الطلب",
    approveOwnerConfirm: "سيتم تفعيل الحساب وإنشاء التصنيفات الافتراضية للمنشأة.",
    rejectOwnerConfirm: "سيتم رفض الطلب وتعطيل المنشأة. هل تريد المتابعة؟",
    resetOwnerPassword: "إعادة تعيين كلمة مرور المالك",
    searchEstablishments: "ابحث باسم المنشأة أو صاحبها",
    noEstablishments: "لا توجد منشآت بعد.",
    noAmountsNotice: "لا تعرض المبالغ المالية في صفحات الإدارة.",
  },

  lock: {
    badge: "شهر مقفل",
    blockedTitle: "هذا الشهر مقفل",
    blockedHint: "لا يمكن إضافة أو تعديل حركات في شهر مقفل.",
  },

  err: {
    required: "هذا الحقل مطلوب",
    invalidInput: "تحقق من البيانات المدخلة",
    tooLong: "القيمة طويلة جدا",
    emailInvalid: "البريد الإلكتروني غير صحيح",
    passwordShort: "كلمة المرور يجب أن تكون 10 أحرف على الأقل",
    passwordMismatch: "كلمتا المرور غير متطابقتين",
    passwordWrong: "كلمة المرور الحالية غير صحيحة",
    nameShort: "الاسم يجب أن يكون حرفين على الأقل",
    nameLong: "الاسم يجب ألا يتجاوز 30 حرفًا",
    establishmentNameShort: "اسم المنشأة قصير جدا",
    establishmentNameLong: "اسم المنشأة طويل جدا",
    joinCodeInvalid: "رمز الانضمام غير صحيح",
    dateInvalid: "التاريخ غير صحيح",
    dateFuture: "لا يمكن اختيار تاريخ في المستقبل",
    rangeInvalid: "الفترة غير صحيحة",
    rangeTooLong: "المدة طويلة جدا. اختر فترة لا تتجاوز سنة.",
    amountInvalid: "المبلغ غير صحيح",
    amountPositive: "المبلغ يجب أن يكون أكبر من صفر",
    amountTooLarge: "المبلغ كبير جدا",
    categoryInvalid: "التصنيف غير صحيح",
    categoryDirectionMismatch: "التصنيف لا يطابق نوع الحركة",
    lastActiveCategory: "يجب أن يبقى تصنيف واحد نشط على الأقل لكل نوع",
    categoryDuplicate: "يوجد تصنيف بهذا الاسم",

    loginFailed: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    signupFailed: "تعذر إنشاء الحساب. تحقق من البيانات وحاول مرة أخرى.",
    joinFailed: "رمز الانضمام غير صحيح أو غير مفعل",
    tooManyAttempts: "محاولات كثيرة. حاول بعد 15 دقيقة.",

    notFound: "العنصر غير موجود",
    forbidden: "لا تملك صلاحية لهذا الإجراء",
    monthLocked: "الشهر مقفل ولا يمكن التعديل عليه",
    cannotLockCurrentMonth: "لا يمكن إقفال الشهر الحالي أو شهر قادم",
    unexpected: "حدث خطأ غير متوقع. حاول مرة أخرى.",

    // v1.1e — names (each part: 2–30 characters)
    nameChars: "يُسمح بالحروف العربية أو الإنجليزية فقط، مع مسافة أو شرطة (-) أو فاصلة عليا (')",
    nameDigits: "لا يُسمح بالأرقام في الاسم",
    nameRepeated: "لا يُسمح بتكرار الحرف نفسه 3 مرات متتالية",
    nameJunk: "يرجى إدخال الاسم الحقيقي كما في الهوية",
    nameFirstLastSame: "يجب أن يختلف الاسم الأول عن اسم العائلة",

    // v1.1e — password (10–72 characters)
    passwordLong: "كلمة المرور طويلة جدًا: الحد الأقصى 72 حرفًا إنجليزيًا، أو نحو 36 حرفًا عربيًا",
    passwordLetterDigit: "كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل",
    passwordPersonal: "كلمة المرور يجب ألا تحتوي على اسمك أو على الجزء الأول من بريدك",
    passwordCommon: "كلمة المرور هذه شائعة جدًا ويسهل تخمينها، اختر غيرها",

    // v1.1e — email
    emailDots: "البريد الإلكتروني لا يحتوي على نقطتين متتاليتين",
    emailDomain: "نطاق البريد يجب أن يحتوي على نقطة، مثل example.com",
    emailDisposable: "لا نقبل عناوين البريد المؤقتة، استخدم بريدك الدائم",

    // v1.1e — codes. Reset uses only the generic key (no existence oracle).
    codeFormat: "الرمز مكوّن من 6 أرقام",
    codeInvalid: "الرمز غير صحيح",
    codeExpired: "انتهت صلاحية الرمز، اطلب رمزًا جديدًا",
    codeAttempts: "تجاوزت عدد المحاولات المسموح، اطلب رمزًا جديدًا",
    codeInvalidOrExpired: "الرمز غير صحيح أو انتهت صلاحيته",
    resendTooSoon: "انتظر حتى ينتهي العد التنازلي ثم أعد الإرسال",
    verifySessionExpired: "انتهت مهلة التحقق، سجّل الدخول مرة أخرى",
    emailNotVerified: "لا يمكن اعتماد حساب لم يُوثّق بريده الإلكتروني بعد",

    // v1.2a — parties, إضافة, agreements (src/i18n/ar.v12a.ts)
    ...errV12a,

    // v1.2b — employees, salaries, attendance (src/i18n/ar.v12b.ts)
    ...errV12b,

    // v1.2c — reminders and reports (src/i18n/ar.v12c.ts)
    ...errV12c,
  },

  /** v1.1e — sign-up field labels and helper lines. Western digits throughout. */
  signupForm: {
    firstName: "الاسم الأول",
    middleName: "اسم الأب",
    lastName: "اسم العائلة",
    firstNameHelp: "كما في الهوية، بالعربية أو الإنجليزية، بدون أرقام",
    middleNameHelp: "اختياري، كما في الهوية",
    lastNameHelp: "كما في الهوية، ويختلف عن الاسم الأول",
    emailHelp: "سنرسل إليه رمز تحقق من 6 أرقام",
    passwordHelp: "10 أحرف على الأقل، فيها حرف ورقم، ولا تحتوي اسمك أو بريدك",
    confirmPasswordHelp: "أعد كتابة كلمة المرور نفسها",
    establishmentNameHelp: "كما سيظهر في التقارير، من 2 إلى 80 حرفًا",
    joinCodeHelp: "8 أحرف وأرقام إنجليزية، اطلبه من صاحب المنشأة",
    /** `{email}` is replaced by the suggested address, rendered left-to-right. */
    didYouMean: "هل تقصد {email}؟",
    strengthLabel: "قوة كلمة المرور",
    strengthWeak: "ضعيفة",
    strengthFair: "مقبولة",
    strengthStrong: "قوية",
  },

  verify: {
    title: "تأكيد البريد الإلكتروني",
    sentTo: "أرسلنا رمزًا من 6 أرقام إلى",
    codeLabel: "رمز التحقق",
    codeHelp: "6 أرقام، صالح لمدة 10 دقائق",
    submit: "تأكيد",
    resend: "لم يصلك الرمز؟ أعد الإرسال",
    resendIn: "يمكنك إعادة الإرسال بعد",
    seconds: "ثانية",
    resent: "أرسلنا رمزًا جديدًا",
    spamNote: "إن لم تجد الرسالة خلال دقيقة، فتحقق من مجلد الرسائل غير المرغوبة (Spam)",
    done: "تم تأكيد بريدك الإلكتروني",
  },

  forgot: {
    link: "نسيت كلمة المرور؟",
    title: "نسيت كلمة المرور",
    intro: "أدخل بريدك الإلكتروني وسنرسل إليك رمزًا لإعادة تعيين كلمة المرور.",
    emailHelp: "البريد الذي أنشأت به حسابك في زخم، بالأحرف الإنجليزية",
    submit: "إرسال الرمز",
    sent: "إن كان البريد مسجلاً فقد أُرسل رمز التحقق",
  },

  reset: {
    title: "إعادة تعيين كلمة المرور",
    submit: "حفظ كلمة المرور الجديدة",
    done: "تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.",
  },

  /** v1.1e — transactional email (Brevo). Sender display name is the app name. */
  mail: {
    senderName: APP_NAME,
    verifySubject: `رمز تأكيد بريدك في ${APP_NAME}`,
    resetSubject: `رمز إعادة تعيين كلمة المرور في ${APP_NAME}`,
    existsSubject: `محاولة تسجيل ببريدك في ${APP_NAME}`,
    verifyIntro: "استخدم الرمز التالي لتأكيد بريدك الإلكتروني:",
    resetIntro: "استخدم الرمز التالي لإعادة تعيين كلمة المرور:",
    existsBody: "طلب أحدهم إنشاء حساب بهذا البريد، وهو مسجل لدينا بالفعل. إن كنت أنت، فسجّل الدخول أو استخدم «نسيت كلمة المرور؟».",
    expiry: "الرمز صالح لمدة 10 دقائق.",
    ignore: "إن لم تطلب هذا فتجاهل هذه الرسالة، ولن يتغير شيء في حسابك.",
  },

  // v1.2a sections (navGroup, navItem, parties, projects, plans, dues, …)
  ...v12a,

  // v1.2b sections (employees, attendance, myAttendance, deductions, payslip, …)
  ...v12b,

  // v1.2c sections (reminderSettings, digestMail, clientReminder, aging, …)
  ...v12c,

  // v1.3 sections (dashVisual, duesRibbon, planBar, budgetMeter, liveClock, …)
  ...v13Sections,

  a11y: {
    skipToContent: "تجاوز إلى المحتوى",
    openMenu: "فتح القائمة",
    closeMenu: "إغلاق القائمة",
    rowActions: "إجراءات السجل",
  },
} as const;

export type Translations = typeof t;

/** `t.err.*` lookup for a key returned by a server action. */
export function errorMessage(key: string): string {
  const name = key.startsWith("err.") ? key.slice(4) : key;
  if (name in t.err) {
    return t.err[name as keyof typeof t.err];
  }
  return t.err.unexpected;
}

export default t;
