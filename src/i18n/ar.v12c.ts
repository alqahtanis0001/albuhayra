/**
 * v1.2c strings — التذكيرات (owner digest, client reminders) and reports
 * (aging, statement export, party filter). Spread into `t` by src/i18n/ar.ts.
 * Keys are the lead's; `frontend` may improve values. `{name}`, `{n}`,
 * `{amount}`, `{date}`, `{title}`, `{establishment}` are placeholders; digits
 * are always Western. Counted strings are PluralForms for `plural()`.
 */

export const v12cSections = {
  reminderSettings: {
    title: "التذكيرات",
    digestTitle: "ملخص يومي بالبريد",
    digestHelp: "رسالة يومية إلى بريدك فيها الدفعات المتأخرة والمستحقة قريبًا، لنا وعلينا. لا تُرسل إن لم يكن هناك ما يُذكر.",
    enabled: "إرسال الملخص اليومي",
    hour: "ساعة الإرسال (بتوقيت الرياض)",
    hourHelp: "يُرسل الملخص مرة واحدة في اليوم عند هذه الساعة أو بعدها",
    saved: "تم حفظ إعدادات التذكيرات",
    sentTo: "يُرسل إلى",
    notConfigured: "لم يُفعَّل الإرسال التلقائي على الخادم بعد، وسيبدأ الملخص فور تفعيله.",
  },

  /** The digest email (C6). */
  digestMail: {
    subject: "ملخص المستحقات اليومي — {establishment}",
    intro: "هذا ملخص المستحقات في {establishment} لهذا اليوم:",
    overdue: "متأخرة",
    today: "مستحقة اليوم",
    tomorrow: "مستحقة غدًا",
    upcoming: "خلال فترة التذكير",
    toUs: "لنا",
    fromUs: "علينا",
    total: "الإجمالي",
    party: "الجهة",
    plan: "الاتفاقية",
    remaining: "المتبقي",
    dueDate: "تاريخ الاستحقاق",
    more: {
      one: "وواحدة أخرى",
      two: "واثنتان أخريان",
      few: "و{n} أخرى",
      many: "و{n} أخرى",
      other: "و{n} أخرى",
    },
    openDues: "فتح المستحقات",
    footer: "وصلتك هذه الرسالة لأن الملخص اليومي مفعّل في إعدادات التذكيرات. يمكنك إيقافه من هناك.",
  },

  /** Client reminders (C9–C12). */
  clientReminder: {
    optIn: "تذكير هذه الجهة بالمستحقات",
    optInHelp: "عند التفعيل يظهر زر «تذكير» على دفعاتها المستحقة لنا. لا يُرسل شيء إلا بضغطك.",
    remind: "تذكير",
    dialogTitle: "تذكير {name}",
    byEmail: "إرسال بريد إلكتروني",
    byWhatsApp: "نص واتساب",
    noEmail: "لا يوجد بريد إلكتروني لهذه الجهة",
    sent: "تم إرسال التذكير",
    copyText: "نسخ النص",
    copied: "تم نسخ النص",
    whatsAppHelp: "انسخ النص وأرسله من واتساب بنفسك.",
    /** The email and WhatsApp text sent to the party. */
    subject: "تذكير بدفعة مستحقة — {establishment}",
    body: "السلام عليكم،\nنذكّركم بدفعة مستحقة لـ{establishment} بقيمة {amount}، تاريخ استحقاقها {date}، ضمن «{title}».\nمع الشكر.",
    mailFooter: "أُرسلت هذه الرسالة من {establishment} عبر زخم. لا تردّ على هذه الرسالة؛ للتواصل راسل {establishment} مباشرة.",
  },

  aging: {
    title: "أعمار المستحقات",
    tab: "أعمار المستحقات",
    help: "الدفعات المتأخرة غير المسددة، موزعة حسب عدد أيام التأخير.",
    bucket0: "0–30 يومًا",
    bucket31: "31–60 يومًا",
    bucket61: "61–90 يومًا",
    bucketOver: "أكثر من 90 يومًا",
    toUs: "لنا",
    fromUs: "علينا",
    party: "الجهة",
    total: "الإجمالي",
    empty: "لا توجد مستحقات متأخرة.",
    printTitle: "تقرير أعمار المستحقات",
  },

  statementExport: {
    excel: "تصدير Excel",
    pdf: "حفظ PDF",
    pdfHint: "اختر «حفظ كـ PDF» في نافذة الطباعة.",
    sheetName: "كشف الحساب",
    title: "كشف حساب — {name}",
  },

  reportFilter: {
    /** Tab label for the existing by-category report beside «أعمار المستحقات» (N8). */
    byCategoryTab: "حسب التصنيف",
    /** Info-sheet label naming the party a filtered export covers (S7). */
    exportParty: "الجهة",
    exportAllParties: "كل الجهات",
    byParty: "بحسب الجهة",
    allParties: "كل الجهات",
    invalidParty: "الجهة المختارة غير صحيحة، ولم يُعرض التقرير.",
  },

  /** v1.2c error keys. Merged into `t.err` by ar.ts. */
  errV12c: {
    remindersNotOptedIn: "هذه الجهة لم تُفعَّل لها التذكيرات",
    reminderNotApplicable: "لا يمكن التذكير بهذه الدفعة",
    reminderTooSoon: "أُرسل تذكير بهذه الدفعة اليوم، حاول غدًا",
    partyNoEmail: "لا يوجد بريد إلكتروني لهذه الجهة",
    mailFailed: "تعذّر إرسال البريد الآن، حاول لاحقًا",
  },
} as const;
