/**
 * v1.2a strings — navigation groups, الجهات, إضافة, الاتفاقيات, المستحقات.
 * Spread into `t` by src/i18n/ar.ts, so callers still write `t.parties.title`.
 * Same rules as ar.ts: keys are the lead's; `frontend` may improve values.
 * `{n}`, `{date}`, `{title}`, `{seq}` are placeholders the component replaces;
 * digits are always Western.
 */

export const v12aSections = {
  /** Side-nav group headings (owner). */
  navGroup: {
    finance: "المالية",
    additions: "الأنشطة",
    partiesAndCommitments: "العملاء والالتزامات",
    /** v1.4 (D16, c8): heading only — the «الموظفون» item is unchanged. */
    staff: "الموظفون والحضور",
    settings: "الإعدادات",
    expand: "إظهار القسم",
    collapse: "إخفاء القسم",
  },

  /** Owner nav items added or renamed in v1.2a. */
  navItem: {
    newEntry: "حركة جديدة",
    projectsList: "الأنشطة",
    projectNew: "نشاط جديد",
    parties: "الجهات",
    plans: "الاتفاقيات",
    dues: "المستحقات",
    staffList: "الموظفون",
    attendance: "الحضور",
    /** v1.4 part 3 (R16): «حسابات الدخول» read as money to the owner. */
    logins: "دخول الموظفين",
    categories: "التصنيفات",
    joinCode: "رمز انضمام الموظفين",
    locks: "إقفال الأشهر",
    /** v1.2c (spec §1): Settings › التذكيرات. */
    reminders: "التذكيرات",
    account: "حسابي",
    more: "المزيد",
    moreTitle: "كل الأقسام",
    /** Accessible text for the count badge on المستحقات. Plural forms: src/lib/plural.ts. */
    overdueBadge: {
      one: "قسط متأخر واحد",
      two: "قسطان متأخران",
      few: "{n} أقساط متأخرة",
      many: "{n} قسطًا متأخرًا",
      other: "{n} قسط متأخر",
    },
    /** v1.4 (D17, c10): accessible text for the pending-join-requests badge on حسابات الدخول. */
    pendingBadge: {
      one: "طلب انضمام واحد",
      two: "طلبا انضمام",
      few: "{n} طلبات انضمام",
      many: "{n} طلب انضمام",
      other: "{n} طلب انضمام",
    },
  },

  comingSoon: {
    badge: "قريباً",
    title: "هذا القسم قيد الإعداد",
    body: "سيتوفر في تحديث قادم. لا يلزمك فعل شيء الآن.",
    staffBody: "ملفات الموظفين والرواتب قادمة في التحديث التالي. إدارة حسابات دخول الموظفين في «دخول الموظفين».",
    attendanceBody: "تسجيل حضور الموظفين وانصرافهم قادم في التحديث التالي.",
    toLogins: "الانتقال إلى دخول الموظفين",
  },

  partyType: {
    label: "نوع الجهة",
    CUSTOMER: "عميل",
    SUPPLIER: "مورد",
    EMPLOYEE: "موظف",
    OTHER: "أخرى",
  },

  /** Tab labels on the parties list (plural). */
  partyTypeTab: {
    ALL: "الكل",
    CUSTOMER: "العملاء",
    SUPPLIER: "الموردون",
    EMPLOYEE: "الموظفون",
    OTHER: "أخرى",
  },

  parties: {
    title: "الجهات",
    newTitle: "جهة جديدة",
    editTitle: "تعديل الجهة",
    add: "إضافة جهة",
    name: "اسم الجهة",
    nameHelp: "كما تعرفه في تعاملاتك، من 2 إلى 80 حرفًا",
    phone: "رقم الجوال",
    phoneHelp: "اختياري. أرقام فقط، ويجوز أن يبدأ بـ +",
    email: "البريد الإلكتروني",
    emailHelp: "اختياري",
    notes: "ملاحظات",
    owedToUs: "لنا",
    owedByUs: "علينا",
    balanceHint: "المتبقي من الاتفاقيات القائمة",
    settled: "لا رصيد",
    empty: "لا توجد جهات بعد.",
    emptyHint: "أضف عملاءك ومورديك لتربط بهم الحركات والاتفاقيات.",
    emptyFiltered: "لا توجد جهات من هذا النوع.",
    activate: "تفعيل الجهة",
    deactivate: "إيقاف الجهة",
    deactivateConfirm: "لن تظهر الجهة في القوائم عند إضافة حركة جديدة، وتبقى حركاتها كما هي. هل تريد المتابعة؟",
    delete: "حذف الجهة",
    deleteConfirm: "سيتم حذف الجهة نهائيًا. هل تريد المتابعة؟",
    hasHistoryHint: "لا يمكن حذف جهة لها حركات أو اتفاقيات، ويمكن إيقافها.",
    choose: "اختر الجهة",
    none: "بدون جهة",
    /** v1.4 part 3 (R10): second, after «+ جهة جديدة»; says it is not saved. */
    other: "أخرى — اسم لمرة واحدة (لا يُحفظ)",
    otherName: "اسم الجهة",
    viewStatement: "كشف الحساب",
  },

  statement: {
    title: "كشف حساب",
    date: "التاريخ",
    description: "البيان",
    amount: "المبلغ",
    balance: "الرصيد",
    planCharge: "اتفاقية: {title}",
    paymentReceived: "دفعة مستلمة — {title}",
    paymentMade: "دفعة مدفوعة — {title}",
    /** v1.4 part 3 (R16): «أرشفة الاتفاقية» → «إنهاء وأرشفة». */
    writeOff: "إنهاء وأرشفة وشطب المتبقي — {title}",
    closingBalance: "الرصيد الختامي",
    empty: "لا توجد اتفاقيات مع هذه الجهة.",
    otherTransactions: "حركات أخرى مع الجهة",
    otherHint: "حركات غير مرتبطة باتفاقية، لا تدخل في الرصيد.",
    otherCapped: "تُعرض أحدث الحركات فقط، والقائمة الكاملة في السجل.",
    otherViewAll: "عرض في السجل",
    print: "طباعة الكشف",
  },

  projectStatus: {
    label: "الحالة",
    ACTIVE: "جارٍ",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغى",
  },

  projects: {
    title: "الأنشطة",
    listTitle: "الأنشطة",
    newTitle: "نشاط جديد",
    editTitle: "تعديل النشاط",
    add: "نشاط جديد",
    name: "اسم النشاط",
    nameHelp: "مثل: فرع جديد، ترميم المحل، معدات المطبخ",
    description: "الوصف",
    budget: "الميزانية",
    budgetHelp: "اختياري. اتركه فارغًا إن لم تحدد ميزانية",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    endDateHelp: "اختياري",
    spent: "المصروف",
    income: "الوارد",
    budgetRemaining: "المتبقي من الميزانية",
    overBudget: "تجاوز الميزانية بمقدار",
    noBudget: "بدون ميزانية",
    recordCost: "تسجيل تكلفة",
    byCategory: "حسب التصنيف",
    transactions: "حركات النشاط",
    empty: "لا توجد أنشطة بعد.",
    emptyHint: "النشاط بند تسميه أنت وله تكاليفه الخاصة، مثل فرع جديد أو مناسبة.",
    emptyFiltered: "لا توجد أنشطة بهذه الحالة.",
    emptyTransactions: "لا توجد حركات في هذا النشاط بعد.",
    markCompleted: "تعليم كمكتمل",
    markCancelled: "إلغاء النشاط",
    reopen: "إعادة فتح",
    delete: "حذف النشاط",
    deleteConfirm: "سيتم حذف النشاط نهائيًا. هل تريد المتابعة؟",
    hasHistoryHint: "لا يمكن حذف نشاط له حركات، ويمكن إلغاؤه.",
    within: "ضمن نشاط",
    none: "بدون نشاط",
    activeOnHome: "الأنشطة الجارية",
    viewAll: "عرض كل الأنشطة",
    printSummary: "طباعة الملخص",
    summaryTitle: "ملخص النشاط",
  },

  planStatus: {
    label: "الحالة",
    UPCOMING: "قادمة",
    ACTIVE: "جارية",
    COMPLETED: "مكتملة",
    ARCHIVED: "مؤرشفة",
    CANCELLED: "ملغاة",
  },

  /** v1.4 (D17, c7): masculine agreement — these words sit beside «قسط». */
  instalmentStatus: {
    UPCOMING: "قادم",
    DUE: "مستحق",
    OVERDUE: "متأخر",
    PARTIAL: "مدفوع جزئياً",
    PAID: "مدفوع",
  },

  /** Plural forms by Intl.PluralRules("ar") category — pick with plural() from src/lib/plural.ts. */
  countdown: {
    inDays: {
      one: "بعد يوم واحد",
      two: "بعد يومين",
      few: "بعد {n} أيام",
      many: "بعد {n} يوماً",
      other: "بعد {n} يوم",
    },
    /** v1.4 (D21, reviewer M6): masculine beside «القسط N» and the masculine status badge. */
    today: "مستحق اليوم",
    lateDays: {
      one: "متأخر يوماً واحداً",
      two: "متأخر يومين",
      few: "متأخر {n} أيام",
      many: "متأخر {n} يوماً",
      other: "متأخر {n} يوم",
    },
  },

  /** Direction wording on agreements depends on who the party is. */
  planDirection: {
    label: "الاتجاه",
    IN: "سيدفع لنا",
    OUT: "سندفع له",
  },

  plans: {
    title: "الاتفاقيات",
    /** v1.4 part 3 (R16): subtitle under the list title. */
    subtitle: "ما اتفقت عليه مع عميل أو مورد ويُدفع على دفعات، وكذلك رواتب الموظفين",
    newTitle: "اتفاقية جديدة",
    editTitle: "تعديل الاتفاقية",
    add: "اتفاقية جديدة",
    party: "الجهة",
    titleField: "عنوان الاتفاقية",
    titleHelp: "مثل: عقد توريد، أقساط سيارة، إيجار المستودع",
    /** v1.4 part 3 (R8): prefilled once a party is chosen; `{name}` is the party. Editable. */
    titlePrefill: "اتفاقية مع {name}",
    total: "المبلغ الإجمالي",
    category: "التصنيف",
    categoryHelp: "تُسجَّل كل دفعة تحت هذا التصنيف، ويمكن تغييره عند التسجيل",
    startDate: "تاريخ البدء",
    reminderDays: "التذكير قبل الاستحقاق (أيام)",
    reminderHelp: "يظهر القسط «مستحقًا» قبل موعده بهذا العدد من الأيام",
    notes: "ملاحظات",
    paid: "المدفوع",
    remaining: "المتبقي",
    nextDue: "القسط القادم",
    progress: "سُدّد {paid} من {count}",
    instalments: "الأقساط",
    payments: "السدادات",
    recordPayment: "تسجيل دفعة",
    cancel: "إلغاء الاتفاقية",
    cancelConfirm: "سيتم إلغاء الاتفاقية ولن تظهر في المستحقات. هل تريد المتابعة؟",
    cancelBlocked: "لا يمكن إلغاء اتفاقية عليها دفعات، ويمكن أرشفتها.",
    /** v1.4 part 3 (R16): «أرشفة» was unknown; the button now says what it does. */
    archive: "إنهاء وأرشفة",
    archiveConfirm: "سيتوقف تتبع المتبقي ويُشطب من رصيد الجهة، وتبقى الدفعات المسجلة كما هي. هل تريد المتابعة؟",
    allDirections: "كل الاتجاهات",
    allStatuses: "كل الحالات",
    /** v1.4 (D17, c18): the ARCHIVED option of the status filter; badge values are unchanged. */
    archivedFilter: "مؤرشفة / منتهية",
    allParties: "كل الجهات",
    empty: "لا توجد اتفاقيات بعد.",
    emptyHint: "سجّل ما اتفقت عليه مع عميل أو مورد، وقسّمه إلى أقساط.",
    emptyFiltered: "لا توجد اتفاقيات مطابقة للتصفية.",
    lockedRowHint: "قسط عليه سداد، لا يتغير",
    paidRowsNotice: "على هذه الاتفاقية سدادات: تتغير الأقساط غير المسددة فقط.",
    /** Shown with the amount (<MoneyText>) when allocate() leaves a residue — should never happen under the rules. */
    overpaidWarning: "مبلغ زائد عن إجمالي الاتفاقية",
    overpaidHint: "المسدد أكبر من إجمالي الاتفاقية. راجع السدادات أو عدّل الاتفاقية.",
  },

  schedule: {
    title: "جدول الأقساط",
    modeEqual: "أقساط متساوية",
    modeCustom: "تواريخ ومبالغ مخصصة",
    count: "عدد الأقساط",
    frequency: "التكرار",
    WEEKLY: "أسبوعي",
    MONTHLY: "شهري",
    EVERY_N_DAYS: "كل عدد من الأيام",
    everyDays: "كل (يوم)",
    generate: "توليد الجدول",
    /** v1.4 part 3 (R14): the first instalment's date control, above «توليد», and the hint under it. */
    firstDate: "تاريخ أول قسط",
    editHint: "يمكنك تعديل أي صف بعد التوليد",
    addRow: "إضافة قسط",
    removeRow: "حذف القسط",
    row: "القسط",
    dueDate: "تاريخ الاستحقاق",
    amountDue: "المبلغ",
    sum: "مجموع الأقساط",
    difference: "الفرق عن الإجمالي",
    matches: "المجموع يطابق الإجمالي",
    /** buildSchedule returned null because count > total halalas (V6). `{n}` = min(120, total). */
    countCapped: "عدد الأقساط لا يتجاوز {n} لهذا المبلغ",
  },

  dues: {
    title: "المستحقات",
    /** v1.4 part 3 (R16): subtitle under the page title. */
    subtitle: "ما حان موعده هذا الأسبوع",
    thisWeek: "مستحقات هذا الأسبوع",
    weekRange: "من اليوم حتى {date}",
    overdue: "متأخرات",
    toUs: "لنا",
    fromUs: "علينا",
    empty: "لا توجد مستحقات هذا الأسبوع.",
    /** v1.4 part 3 (R1): the empty week card explains itself and hands cash over. */
    emptyIntro: "هنا تظهر الأقساط التي حان موعدها هذا الأسبوع: لنا من العملاء وعلينا للموردين والموظفين.",
    cashLink: "قبضت مبلغًا بدون اتفاقية؟ سجّله كحركة جديدة",
    partiesLink: "كم باقي على عميل؟ افتح الجهات",
    noOverdue: "لا توجد متأخرات.",
    overdueStrip: {
      one: "قسط متأخر واحد",
      two: "قسطان متأخران",
      few: "{n} أقساط متأخرة",
      many: "{n} قسطًا متأخرًا",
      other: "{n} قسط متأخر",
    },
    viewAll: "عرض كل المستحقات",
    /** v1.4 (D17, c2): link under the heading of /owner/dues → /owner/plans?pick=payment. */
    pickOther: "دفعة على اتفاقية غير مستحقة بعد؟ اختر من الاتفاقيات",
  },

  /** Staff home card (user's ruling: party, amount due, due date — nothing more). */
  staffDues: {
    title: "المستحقات",
    hint: "أقساط متأخرة أو مستحقة خلال 7 أيام",
    party: "الجهة",
    amountDue: "المبلغ المستحق",
    dueDate: "تاريخ الاستحقاق",
    empty: "لا توجد مستحقات متأخرة ولا خلال 7 أيام.",
  },

  payment: {
    title: "تسجيل دفعة",
    forInstalment: "القسط {seq} من «{title}»",
    remaining: "المتبقي على هذا القسط",
    planRemaining: "المتبقي على الاتفاقية",
    /** v1.4 part 3 (R6): a SALARY instalment is a salary month, never «القسط n». `{month}` = «أكتوبر 2026», `{name}` = the employee. */
    salaryTitle: "راتب شهر {month} — {name}",
    salaryRemaining: "المتبقي من راتب الشهر",
    /** Plan remaining minus this month's remaining; hidden at 0. */
    upcomingSalaries: "الرواتب القادمة",
    salaryRollsOver: "ما يزيد عن راتب هذا الشهر يُحتسب للرواتب القادمة.",
    rollsOver: "ما يزيد عن هذا القسط يُحتسب للأقساط التالية.",
    linkedNotice: "هذه الحركة سداد لاتفاقية: الاتجاه والجهة ثابتان.",
    viewPlan: "عرض الاتفاقية",
  },

  /** v1.2a error keys. Merged into `t.err` by ar.ts. */
  errV12a: {
    entityNameShort: "الاسم قصير جدًا: حرفان على الأقل",
    entityNameLong: "الاسم طويل جدًا: 80 حرفًا كحد أقصى",
    phoneInvalid: "رقم الجوال غير صحيح: من 7 إلى 15 رقمًا",
    partyInvalid: "الجهة غير صحيحة",
    partyDuplicate: "توجد جهة نشطة بهذا الاسم",
    partyHasHistory: "لا يمكن حذف جهة لها حركات أو اتفاقيات، ويمكن إيقافها",
    projectInvalid: "النشاط غير صحيح",
    projectClosed: "لا يمكن ربط حركة جديدة بنشاط مكتمل أو ملغى",
    projectHasHistory: "لا يمكن حذف نشاط له حركات، ويمكن إلغاؤه",
    scheduleInvalid: "جدول الأقساط غير صحيح",
    scheduleEmpty: "أضف قسطًا واحدًا على الأقل",
    scheduleTooLong: "الحد الأقصى 120 قسطًا",
    scheduleSum: "مجموع الأقساط يجب أن يساوي المبلغ الإجمالي",
    scheduleBeforeStart: "لا يمكن أن يسبق تاريخ قسط تاريخ بدء الاتفاقية",
    schedulePaidRowChanged: "لا يمكن تعديل أو حذف قسط عليه سداد",
    planInvalid: "الاتفاقية غير صحيحة",
    planClosed: "الاتفاقية مؤرشفة أو ملغاة",
    planHasPayments: "لا يمكن إلغاء اتفاقية عليها دفعات، ويمكن أرشفتها",
    planPartyLocked: "لا يمكن تغيير الجهة أو الاتجاه بعد تسجيل دفعات",
    totalBelowPaid: "الإجمالي لا يمكن أن يقل عن المبالغ المسددة",
    instalmentInvalid: "القسط غير صحيح",
    instalmentPaid: "هذا القسط مسدد بالكامل",
    paymentExceedsRemaining: "المبلغ يتجاوز المتبقي على الاتفاقية",
    paymentDirectionMismatch: "اتجاه الحركة لا يطابق الاتفاقية",
    paymentPartyMismatch: "الجهة لا تطابق الاتفاقية",
    paymentLinkFixed: "لا يمكن تغيير ارتباط السداد بالاتفاقية",
    concurrentChange: "تغيّرت البيانات أثناء الحفظ، حاول مرة أخرى",
  },
} as const;
