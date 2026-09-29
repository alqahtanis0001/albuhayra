/**
 * Every Arabic string in the app. No hard-coded Arabic anywhere else.
 * Keys are owned by the lead; `frontend` may improve the values.
 * `err.*` keys are the error contract — server actions return these keys.
 */
export const t = {
  app: {
    name: "سجل المصروفات",
    tagline: "نظام قيد الإيرادات والمصروفات للمنشآت",
    /** Second line of the top bar for ADMIN, who has no establishment. */
    adminArea: "إدارة النظام",
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
  },

  transaction: {
    newTitle: "إضافة حركة",
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
    nameShort: "الاسم قصير جدا",
    nameLong: "الاسم طويل جدا",
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
  },

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
