import { createI18n } from 'vue-i18n';

const messages = {
  en: {
    common: {
      appName: 'TicketSystem',
      adminUser: 'Admin',
      logout: 'Logout',
      language: 'Language',
      english: 'English',
      arabic: 'Arabic',
      tryAgain: 'Try Again',
      cancel: 'Cancel',
      loading: 'Loading...',
      user: 'User #{id}'
    },
    nav: {
      dashboard: 'Dashboard',
      tickets: 'Tickets',
      createTicket: 'Create Ticket'
    },
    status: {
      Open: 'Open',
      'In Progress': 'In Progress',
      Closed: 'Closed'
    },
    priority: {
      Low: 'Low',
      Medium: 'Medium',
      High: 'High',
      priorityLabel: 'Priority'
    },
    login: {
      title: 'Ticket System',
      subtitle: 'Please login to continue',
      email: 'Email',
      emailPlaceholder: 'admin@example.com',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      loginBtn: 'Login',
      loggingIn: 'Logging in...',
      requiredError: 'Email and password are required.',
      failedError: 'Login failed. Please try again.',
      unexpectedError: 'An error occurred during login.'
    },
    dashboard: {
      welcomeTitle: 'Welcome Back!',
      welcomeText: 'Here is a quick overview of your ticket system.',
      createTicket: '+ Create Ticket',
      viewAllTickets: 'View All Tickets',
      loadingStats: 'Loading your statistics...',
      failedStats: 'Failed to load tickets data.',
      totalTickets: 'Total Tickets',
      openTickets: 'Open Tickets',
      closedTickets: 'Closed Tickets',
      highPriority: 'High Priority'
    },
    tickets: {
      title: 'Ticket Dashboard',
      subtitle: 'Welcome back! Here is the overview of your support tickets.',
      createTicketBtn: '+ Create Ticket',
      loadingTickets: 'Loading your tickets...',
      failedTickets: 'Failed to load tickets.',
      noTicketsTitle: 'No Tickets Found',
      noTicketsDesc: "You don't have any tickets matching this view. Create a new one or clear the filter!",
      createFirstBtn: 'Create Ticket',
      noDescription: 'No description provided.',
      comments: 'Comments',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this ticket?',
      failedDelete: 'Failed to delete ticket.',
      showingFilter: 'Showing: {filter}',
      filterAll: 'All Tickets',
      filterOpen: 'Open Tickets',
      filterClosed: 'Closed Tickets',
      filterHighPriority: 'High Priority Tickets',
      clearFilter: 'Clear Filter'
    },
    ticketForm: {
      createHeader: 'Create New Ticket',
      editHeader: 'Edit Ticket #{id}',
      titleLabel: 'Ticket Title',
      titlePlaceholder: 'Brief summary of the issue...',
      priorityLabel: 'Priority Level',
      statusLabel: 'Status',
      descriptionLabel: 'Detailed Description',
      descriptionPlaceholder: 'Provide as much detail as possible...',
      createBtn: 'Create Ticket',
      creatingBtn: 'Creating...',
      saveBtn: 'Save Changes',
      savingBtn: 'Saving...',
      titleRequired: 'Title is required.',
      failedCreate: 'Failed to create ticket.',
      failedUpdate: 'Failed to update ticket.',
      failedLoad: 'Failed to load ticket.',
      loadingDetails: 'Loading ticket details...',
      returnToDashboard: 'Return to Dashboard'
    },
    comments: {
      backToDashboard: '← Back to Dashboard',
      loading: 'Loading ticket and comments...',
      failedLoad: 'Failed to load ticket details or comments.',
      discussion: 'Discussion ({count})',
      noCommentsYet: 'No comments yet. Be the first to start the discussion!',
      leaveComment: 'Leave a Comment',
      commentPlaceholder: 'Type your comment here...',
      postComment: 'Post Comment',
      postingComment: 'Posting...',
      commentRequired: 'Comment text is required.',
      failedPost: 'Failed to add comment.'
    }
  },
  ar: {
    common: {
      appName: 'نظام التذاكر',
      adminUser: 'المدير',
      logout: 'تسجيل الخروج',
      language: 'اللغة',
      english: 'English',
      arabic: 'العربية',
      tryAgain: 'المحاولة مرة أخرى',
      cancel: 'إلغاء',
      loading: 'جاري التحميل...',
      user: 'المستخدم #{id}'
    },
    nav: {
      dashboard: 'لوحة التحكم',
      tickets: 'التذاكر',
      createTicket: 'إنشاء تذكرة'
    },
    status: {
      Open: 'مفتوح',
      'In Progress': 'قيد التنفيذ',
      Closed: 'مغلق'
    },
    priority: {
      Low: 'منخفض',
      Medium: 'متوسط',
      High: 'مرتفع',
      priorityLabel: 'الأولوية'
    },
    login: {
      title: 'نظام التذاكر',
      subtitle: 'يرجى تسجيل الدخول للمتابعة',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'admin@example.com',
      password: 'كلمة المرور',
      passwordPlaceholder: '••••••••',
      loginBtn: 'تسجيل الدخول',
      loggingIn: 'جاري تسجيل الدخول...',
      requiredError: 'البريد الإلكتروني وكلمة المرور مطلوبان.',
      failedError: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.',
      unexpectedError: 'حدث خطأ أثناء تسجيل الدخول.'
    },
    dashboard: {
      welcomeTitle: 'أهلاً بعودتك!',
      welcomeText: 'إليك نظرة عامة سريعة على نظام التذاكر الخاص بك.',
      createTicket: '+ إنشاء تذكرة',
      viewAllTickets: 'عرض جميع التذاكر',
      loadingStats: 'جاري تحميل الإحصائيات...',
      failedStats: 'فشل تحميل بيانات التذاكر.',
      totalTickets: 'إجمالي التذاكر',
      openTickets: 'التذاكر المفتوحة',
      closedTickets: 'التذاكر المغلقة',
      highPriority: 'عالية الأهمية'
    },
    tickets: {
      title: 'لوحة التذاكر',
      subtitle: 'أهلاً بعودتك! إليك نظرة عامة على تذاكر الدعم الخاصة بك.',
      createTicketBtn: '+ إنشاء تذكرة',
      loadingTickets: 'جاري تحميل التذاكر...',
      failedTickets: 'فشل تحميل التذاكر.',
      noTicketsTitle: 'لا توجد تذاكر',
      noTicketsDesc: 'لا توجد تذاكر تطابق هذا العرض. أنشئ تذكرة جديدة أو ألغِ التصفية!',
      createFirstBtn: 'إنشاء تذكرة',
      noDescription: 'لا يوجد وصف مقدم.',
      comments: 'التعليقات',
      edit: 'تعديل',
      delete: 'حذف',
      confirmDelete: 'هل أنت تأكد من أنك تريد حذف هذه التذكرة؟',
      failedDelete: 'فشل حذف التذكرة.',
      showingFilter: 'عرض: {filter}',
      filterAll: 'جميع التذاكر',
      filterOpen: 'التذاكر المفتوحة',
      filterClosed: 'التذاكر المغلقة',
      filterHighPriority: 'التذاكر عالية الأهمية',
      clearFilter: 'إلغاء التصفية'
    },
    ticketForm: {
      createHeader: 'إنشاء تذكرة جديدة',
      editHeader: 'تعديل التذكرة #{id}',
      titleLabel: 'عنوان التذكرة',
      titlePlaceholder: 'ملخص قصير للمشكلة...',
      priorityLabel: 'مستوى الأهمية',
      statusLabel: 'الحالة',
      descriptionLabel: 'الوصف التفصيلي',
      descriptionPlaceholder: 'قدم أكبر قدر ممكن من التفاصيل...',
      createBtn: 'إنشاء التذكرة',
      creatingBtn: 'جاري الإنشاء...',
      saveBtn: 'Save Changes',
      savingBtn: 'Saving...',
      titleRequired: 'العنوان مطلوب.',
      failedCreate: 'فشل إنشاء التذكرة.',
      failedUpdate: 'فشل تحديث التذكرة.',
      failedLoad: 'فشل تحميل التذكرة.',
      loadingDetails: 'جاري تحميل تفاصيل التذكرة...',
      returnToDashboard: 'العودة إلى لوحة التحكم'
    },
    comments: {
      backToDashboard: '← العودة إلى لوحة التحكم',
      loading: 'جاري تحميل التذكرة والتعليقات...',
      failedLoad: 'فشل تحميل تفاصيل التذكرة أو التعليقات.',
      discussion: 'المناقشة ({count})',
      noCommentsYet: 'لا توجد تعليقات بعد. كن أول من يبدأ المناقشة!',
      leaveComment: 'أضف تعليقاً',
      commentPlaceholder: 'اكتب تعليقك هنا...',
      postComment: 'نشر التعليق',
      postingComment: 'جاري النشر...',
      commentRequired: 'نص التعليق مطلوب.',
      failedPost: 'فشل إضافة التعليق.'
    }
  }
};

const savedLang = (localStorage.getItem('lang') as 'en' | 'ar') || 'en';

export const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  fallbackLocale: 'en',
  messages
});

export const setLanguage = (lang: 'en' | 'ar') => {
  i18n.global.locale.value = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
};

// Initialize direction on boot
document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', savedLang);
