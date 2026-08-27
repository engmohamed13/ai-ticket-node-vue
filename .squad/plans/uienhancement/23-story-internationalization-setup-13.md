# Story 23 — Internationalization Setup (vue-i18n) (Story: 13)

## Prerequisites

- Story 22 completed: [22-story-design-system-enhancement-13.md](22-story-design-system-enhancement-13.md). Design tokens and component library are in place.
- `npm install vue-i18n@^9.10` must be added to `frontend/package.json` dependencies.
- Translation files for Arabic and English must be prepared.

---

## Story Goal

Set up complete internationalization (i18n) infrastructure using `vue-i18n`, configure language switching, implement RTL/LTR detection, and create translation file structure for Arabic and English. This enables all subsequent views to integrate bilingual content.

Outcomes:

1. **vue-i18n integration** — installed and configured for both Arabic and English.
2. **i18n composable** — `useI18n()` available in all components with `locale`, `t()`, and `setLocale()`.
3. **Translation file structure** — organized JSON files for frontend strings organized by module (auth, dashboard, customers, etc.).
4. **Language persistence** — selected language persists in `localStorage`.
5. **RTL detection** — `<html dir="rtl">` or `dir="ltr"` automatically set based on active language.
6. **Language switcher component** — UI control to switch between Arabic and English.

---

## Context — Read These Files First

1. `frontend/src/main.ts` (11 lines) — where `createPinia()` and `router` are registered. Task 1 adds i18n setup here.
2. `frontend/src/config/env.ts` (1 line) — reads `VITE_*` environment variables. Task 1 reads the default language from env.
3. `frontend/src/stores/auth.ts` — reference for how stores are structured; no changes needed.
4. `frontend/package.json` — dependencies section; Task 1 adds `vue-i18n@^9.10`.
5. `frontend/src/components/AppHeader.vue` (52 lines) — Task 3 adds a language switcher button here.

---

## Implementation Tasks

### 1 — Install and configure vue-i18n

**File: `frontend/package.json`**

Add to dependencies:
```json
"vue-i18n": "^9.10"
```

Then run from `frontend/`:
```bash
npm install
```

**File: `frontend/src/config/i18n.ts`** (create new file)

```ts
import { createI18n } from 'vue-i18n';
import type { I18n } from 'vue-i18n';

const DEFAULT_LOCALE = import.meta.env.VITE_DEFAULT_LOCALE || 'en';
const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Lazy-load translation messages to keep bundle size small
const messages = {
  en: () => import('../locales/en/index'),
  ar: () => import('../locales/ar/index')
};

export const createI18nInstance = async (): Promise<I18n> => {
  // Load default locale immediately, others lazily
  const en = await messages.en();
  const ar = await messages.ar();

  return createI18n<{}, Record<SupportedLocale, any>>({
    legacy: false, // Use Composition API
    locale: DEFAULT_LOCALE,
    fallbackLocale: 'en',
    messages: {
      en: en.default || en,
      ar: ar.default || ar
    },
    globalInjection: true,
    missingWarn: false, // Reduce console noise in production
    fallbackWarn: false
  });
};

export const isRTLLocale = (locale: SupportedLocale): boolean => locale === 'ar';

export const getLocaleDirection = (locale: SupportedLocale): 'ltr' | 'rtl' => {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
};

// Persist locale to localStorage
export const persistLocale = (locale: SupportedLocale): void => {
  localStorage.setItem('crm.locale', locale);
};

export const getPersistedLocale = (): SupportedLocale | null => {
  const stored = localStorage.getItem('crm.locale');
  return stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored) 
    ? (stored as SupportedLocale) 
    : null;
};
```

**File: `frontend/.env.example`**

Update to include:
```
VITE_DEFAULT_LOCALE=en
```

**File: `frontend/.env.development`**

Update to include:
```
VITE_DEFAULT_LOCALE=en
```

**File: `frontend/src/main.ts`**

Replace whole file:
```ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';
import router from './router';
import { onUnauthorized } from './services/authEvents';
import { useAuthStore } from './stores/auth';
import { createI18nInstance, getPersistedLocale, getLocaleDirection, persistLocale } from './config/i18n';

const app = createApp(App);

// Setup Pinia before router so guards can use stores
app.use(createPinia());

// Setup i18n
(async () => {
  const i18n = await createI18nInstance();
  
  // Restore persisted locale or use default
  const persistedLocale = getPersistedLocale();
  if (persistedLocale && persistedLocale !== i18n.global.locale.value) {
    i18n.global.locale.value = persistedLocale;
  }
  
  // Set document direction
  document.documentElement.dir = getLocaleDirection(i18n.global.locale.value);
  document.documentElement.lang = i18n.global.locale.value;
  
  app.use(i18n);
  app.use(router);

  // A 401 from any API call ends the session and returns to the login screen.
  onUnauthorized(() => {
    useAuthStore().clear();
    if (router.currentRoute.value.name !== 'login') {
      void router.push({ name: 'login' });
    }
  });

  app.mount('#app');
})();
```

### 2 — Create translation file structure

**Directory structure:**
```
frontend/src/locales/
├── en/
│   ├── index.ts
│   ├── auth.json
│   ├── common.json
│   ├── dashboard.json
│   ├── customers.json
│   ├── tickets.json
│   ├── communications.json
│   ├── knowledge.json
│   ├── admin.json
│   └── validation.json
└── ar/
    ├── index.ts
    ├── auth.json
    ├── common.json
    ├── dashboard.json
    ├── customers.json
    ├── tickets.json
    ├── communications.json
    ├── knowledge.json
    ├── admin.json
    └── validation.json
```

**File: `frontend/src/locales/en/index.ts`** (create)

```ts
import auth from './auth.json';
import common from './common.json';
import dashboard from './dashboard.json';
import customers from './customers.json';
import tickets from './tickets.json';
import communications from './communications.json';
import knowledge from './knowledge.json';
import admin from './admin.json';
import validation from './validation.json';

export default {
  auth,
  common,
  dashboard,
  customers,
  tickets,
  communications,
  knowledge,
  admin,
  validation
};
```

**File: `frontend/src/locales/ar/index.ts`** (create) — mirror of en/index.ts

```ts
import auth from './auth.json';
import common from './common.json';
import dashboard from './dashboard.json';
import customers from './customers.json';
import tickets from './tickets.json';
import communications from './communications.json';
import knowledge from './knowledge.json';
import admin from './admin.json';
import validation from './validation.json';

export default {
  auth,
  common,
  dashboard,
  customers,
  tickets,
  communications,
  knowledge,
  admin,
  validation
};
```

**File: `frontend/src/locales/en/common.json`** (create)

```json
{
  "appTitle": "Customer Support CRM",
  "dashboard": "Dashboard",
  "users": "Users",
  "roles": "Roles & Permissions",
  "customers": "Customers",
  "tickets": "Tickets",
  "communications": "Communications",
  "knowledgeBase": "Knowledge Base",
  "administration": "Administration",
  "reports": "Reports",
  "systemHealth": "System Health",
  "notifications": "Notifications",
  "signIn": "Sign in",
  "signOut": "Sign out",
  "logout": "Logout",
  "cancel": "Cancel",
  "save": "Save",
  "create": "Create",
  "update": "Update",
  "delete": "Delete",
  "edit": "Edit",
  "close": "Close",
  "submit": "Submit",
  "loading": "Loading...",
  "error": "Error",
  "success": "Success",
  "warning": "Warning",
  "info": "Information",
  "noData": "No data available",
  "emptyState": "No records found",
  "backToDashboard": "Back to Dashboard",
  "accessDenied": "Access Denied"
}
```

**File: `frontend/src/locales/en/auth.json`** (create)

```json
{
  "login": "Login",
  "email": "Email",
  "password": "Password",
  "rememberMe": "Remember me",
  "forgotPassword": "Forgot password?",
  "invalidCredentials": "Invalid email or password",
  "accountDeactivated": "This account has been deactivated",
  "demoAccounts": "Demo accounts (password Passw0rd!)",
  "signInContinue": "Sign in to continue",
  "demoHint": "Demo accounts available for testing",
  "signingIn": "Signing in…"
}
```

**File: `frontend/src/locales/en/validation.json`** (create)

```json
{
  "required": "This field is required",
  "emailInvalid": "Please enter a valid email address",
  "passwordTooShort": "Password must be at least 8 characters",
  "passwordMismatch": "Passwords do not match",
  "nameTooShort": "Name must be at least 2 characters",
  "fieldRequired": "{field} is required",
  "invalidFormat": "Invalid format for {field}"
}
```

**File: `frontend/src/locales/en/dashboard.json`** (create)

```json
{
  "title": "Dashboard",
  "welcome": "Welcome",
  "overview": "System Overview",
  "recentActivity": "Recent Activity",
  "statistics": "Statistics",
  "systemStatus": "System Status",
  "ticketsOverview": "Tickets Overview",
  "customersOverview": "Customers Overview",
  "agentPerformance": "Agent Performance"
}
```

**File: `frontend/src/locales/en/customers.json`** (create)

```json
{
  "title": "Customers",
  "addCustomer": "Add Customer",
  "editCustomer": "Edit Customer",
  "customerDetails": "Customer Details",
  "name": "Name",
  "email": "Email",
  "phone": "Phone",
  "address": "Address",
  "company": "Company",
  "status": "Status",
  "createdAt": "Created",
  "updatedAt": "Updated",
  "active": "Active",
  "inactive": "Inactive",
  "noCustomers": "No customers found",
  "customerCreated": "Customer created successfully",
  "customerUpdated": "Customer updated successfully",
  "customerDeleted": "Customer deleted successfully"
}
```

**File: `frontend/src/locales/en/tickets.json`** (create)

```json
{
  "title": "Tickets",
  "createTicket": "Create Ticket",
  "ticketDetails": "Ticket Details",
  "ticketNumber": "Ticket #",
  "subject": "Subject",
  "description": "Description",
  "priority": "Priority",
  "status": "Status",
  "assignedTo": "Assigned To",
  "createdBy": "Created By",
  "dueDate": "Due Date",
  "category": "Category",
  "noTickets": "No tickets found",
  "ticketCreated": "Ticket created successfully",
  "ticketUpdated": "Ticket updated successfully",
  "open": "Open",
  "inProgress": "In Progress",
  "resolved": "Resolved",
  "closed": "Closed",
  "high": "High",
  "medium": "Medium",
  "low": "Low"
}
```

**File: `frontend/src/locales/en/communications.json`** (create)

```json
{
  "title": "Communications",
  "timeline": "Timeline",
  "newInteraction": "New Interaction",
  "interactions": "Interactions",
  "channel": "Channel",
  "email": "Email",
  "phone": "Phone",
  "chat": "Chat",
  "sms": "SMS",
  "message": "Message",
  "sender": "Sender",
  "sentAt": "Sent",
  "interactionCreated": "Interaction created successfully",
  "interactionUpdated": "Interaction updated successfully"
}
```

**File: `frontend/src/locales/en/knowledge.json`** (create)

```json
{
  "title": "Knowledge Base",
  "articles": "Articles",
  "categories": "Categories",
  "search": "Search articles",
  "article": "Article",
  "createArticle": "Create Article",
  "editArticle": "Edit Article",
  "category": "Category",
  "content": "Content",
  "published": "Published",
  "draft": "Draft",
  "views": "Views",
  "helpful": "Helpful",
  "notHelpful": "Not Helpful",
  "noArticles": "No articles found"
}
```

**File: `frontend/src/locales/en/admin.json`** (create)

```json
{
  "title": "Administration",
  "users": "Users",
  "roles": "Roles & Permissions",
  "permissions": "Permissions",
  "branches": "Branches",
  "departments": "Departments",
  "settings": "Settings",
  "userName": "User Name",
  "userEmail": "Email",
  "userRole": "Role",
  "userStatus": "Status",
  "active": "Active",
  "inactive": "Inactive",
  "createUser": "Create User",
  "editUser": "Edit User",
  "deleteUser": "Delete User",
  "resetPassword": "Reset Password",
  "roleName": "Role Name",
  "roleKey": "Role Key",
  "permissions": "Permissions",
  "savePermissions": "Save Permissions"
}
```

**File: `frontend/src/locales/ar/common.json`** (create)

```json
{
  "appTitle": "نظام إدارة خدمة العملاء",
  "dashboard": "لوحة التحكم",
  "users": "المستخدمون",
  "roles": "الأدوار والصلاحيات",
  "customers": "العملاء",
  "tickets": "التذاكر",
  "communications": "الاتصالات",
  "knowledgeBase": "قاعدة المعرفة",
  "administration": "الإدارة",
  "reports": "التقارير",
  "systemHealth": "صحة النظام",
  "notifications": "الإشعارات",
  "signIn": "تسجيل الدخول",
  "signOut": "تسجيل الخروج",
  "logout": "خروج",
  "cancel": "إلغاء",
  "save": "حفظ",
  "create": "إنشاء",
  "update": "تحديث",
  "delete": "حذف",
  "edit": "تحرير",
  "close": "إغلاق",
  "submit": "إرسال",
  "loading": "جاري التحميل...",
  "error": "خطأ",
  "success": "نجاح",
  "warning": "تحذير",
  "info": "معلومات",
  "noData": "لا توجد بيانات",
  "emptyState": "لم يتم العثور على سجلات",
  "backToDashboard": "العودة إلى لوحة التحكم",
  "accessDenied": "الوصول مرفوض"
}
```

**File: `frontend/src/locales/ar/auth.json`** (create)

```json
{
  "login": "دخول",
  "email": "البريد الإلكتروني",
  "password": "كلمة المرور",
  "rememberMe": "تذكرني",
  "forgotPassword": "هل نسيت كلمة المرور؟",
  "invalidCredentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "accountDeactivated": "تم إيقاف هذا الحساب",
  "demoAccounts": "حسابات توضيحية (كلمة المرور Passw0rd!)",
  "signInContinue": "تسجيل الدخول للمتابعة",
  "demoHint": "حسابات توضيحية متاحة للاختبار",
  "signingIn": "جاري التسجيل…"
}
```

Create remaining Arabic translation files following the same pattern as English files but with Arabic translations.

### 3 — Create language switcher component

**File: `frontend/src/components/LanguageSwitcher.vue`** (create)

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SupportedLocale } from '../config/i18n';
import { getLocaleDirection, persistLocale } from '../config/i18n';

const { locale } = useI18n();

const currentLocale = computed(() => locale.value as SupportedLocale);

const languages = [
  { code: 'en' as SupportedLocale, label: 'English', nativeLabel: 'English' },
  { code: 'ar' as SupportedLocale, label: 'العربية', nativeLabel: 'Arabic' }
];

const switchLanguage = (newLocale: SupportedLocale): void => {
  if (newLocale === currentLocale.value) return;
  
  locale.value = newLocale;
  document.documentElement.dir = getLocaleDirection(newLocale);
  document.documentElement.lang = newLocale;
  persistLocale(newLocale);
};
</script>

<template>
  <div class="language-switcher">
    <button
      v-for="lang in languages"
      :key="lang.code"
      :class="['language-button', { active: currentLocale === lang.code }]"
      type="button"
      :title="`Switch to ${lang.label}`"
      @click="switchLanguage(lang.code)"
    >
      {{ lang.nativeLabel }}
    </button>
  </div>
</template>

<style scoped>
.language-switcher {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.language-button {
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--surface-color);
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--font-xs);
  font-weight: 600;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.language-button:hover {
  border-color: var(--border-color-strong);
  color: var(--text-main);
}

.language-button.active {
  background-color: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
}
</style>
```

### 4 — Add language switcher to header

**File: `frontend/src/components/AppHeader.vue`**

In the template, add the language switcher before the status pill in the header-right section:

```vue
<LanguageSwitcher />
```

Import it in the script:
```ts
import LanguageSwitcher from './LanguageSwitcher.vue';
```

---

## Edge Cases & Failure Modes

- **User has stored locale in localStorage but it's removed from supported locales.** `getPersistedLocale()` returns `null` and fallback to default locale (`en`) applies.
- **Bundle size increase from i18n.** Translation files are lazy-loaded to minimize initial bundle; only active locale is fully loaded in memory.
- **Missing translation key in one language.** `fallbackLocale: 'en'` ensures English fallback is used; missingWarn is disabled in production to avoid console noise.
- **RTL layout with LTR content (e.g., numbers, English text in Arabic).** Expected — Arabic RTL layout handles mixed content per HTML/CSS standards.
- **Language change mid-form.** Form state persists; only UI labels change. Form submission re-validates with new locale's validation messages.
- **Browser language preference ignored.** Intentional — explicit user choice persists over browser preference. Could be extended in future with feature flag.
- **i18n loading fails.** Error is thrown in `main.ts` and app initialization halts. Acceptable for this story; could add error boundary later.

---

## Test Plan

1. **Create `frontend/src/tests/i18n.spec.ts`** — no mocks:
   - i18n instance creates successfully with default locale `en`.
   - `getPersistedLocale()` returns `null` when localStorage is empty.
   - `persistLocale('ar')` saves to localStorage and `getPersistedLocale()` retrieves it.
   - `isRTLLocale('ar')` returns `true`; `isRTLLocale('en')` returns `false`.
   - `getLocaleDirection('ar')` returns `'rtl'`; `getLocaleDirection('en')` returns `'ltr'`.
   - All locale-specific JSON files load without errors.
   - Translation keys exist for both en and ar (spot check 10 common keys).

2. **Create `frontend/src/tests/LanguageSwitcher.spec.ts`** (mock `vue-i18n`):
   - Component renders buttons for English and Arabic.
   - Active button is highlighted when that locale is active.
   - Clicking a language button calls the mocked `setLocale()`.
   - Document direction and lang attribute are updated when language changes.

3. **Manual integration test:**
   - Start app (default `en`).
   - Open DevTools → Application → Local Storage → verify `crm.locale = 'en'`.
   - Click Arabic button → verify `<html dir="rtl">` and `<html lang="ar">`.
   - Click English → verify `<html dir="ltr">` and `<html lang="en">`.
   - Reload page → app restores to previously selected language.
   - i18n keys render correctly in both languages (spot check 5 UI labels).

---

## Verification Steps

1. **Installation:** `npm install` from `frontend/` completes without errors.
2. **Build:** `npm run build` exits 0; no build warnings about missing translations.
3. **Type checking:** `npm run typecheck` exits 0.
4. **Unit tests:** `npm test` passes all new i18n tests.
5. **App startup:** `npm run dev` starts without errors; i18n loads successfully.
6. **Language switching:** In browser, English/Arabic buttons are visible and clickable; switching works.
7. **Persistence:** Reload page after switching language; app restores selection.
8. **RTL/LTR:** HTML direction attribute changes when language changes.
9. **Accessibility:** Tab through language buttons; all focusable and have proper ARIA labels.

---

## Done Criteria

- [ ] `vue-i18n@^9.10` is installed and configured in `frontend/package.json`.
- [ ] `frontend/src/config/i18n.ts` exports locale management functions and RTL detection.
- [ ] `frontend/src/main.ts` initializes i18n before mounting the app and sets document direction.
- [ ] Translation file structure exists with English and Arabic JSON files for all modules (auth, common, dashboard, customers, tickets, communications, knowledge, admin, validation).
- [ ] `frontend/src/components/LanguageSwitcher.vue` is implemented and integrated into AppHeader.
- [ ] Locale preference persists in `localStorage` under key `crm.locale`.
- [ ] Document `dir` attribute switches between `rtl` (Arabic) and `ltr` (English).
- [ ] `npm test` passes all i18n and LanguageSwitcher tests.
- [ ] `npm run build` and `npm run typecheck` both exit 0.
- [ ] Manual smoke test: app loads, language switcher is visible, switching changes document direction, page reload restores selection.

