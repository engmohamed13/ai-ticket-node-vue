import { createI18n } from 'vue-i18n';
import { LOCALE_STORAGE_KEY } from './storage';
import en from '../locales/en';
import ar from '../locales/ar';

export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Locales that read right-to-left. Drives `<html dir>` and the direction-aware CSS. */
const RTL_LOCALES: readonly SupportedLocale[] = ['ar'];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const isSupportedLocale = (value: unknown): value is SupportedLocale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);

export const isRtlLocale = (locale: SupportedLocale): boolean => RTL_LOCALES.includes(locale);

export const localeDirection = (locale: SupportedLocale): 'ltr' | 'rtl' =>
  isRtlLocale(locale) ? 'rtl' : 'ltr';

/**
 * Reads the stored preference. Returns null when nothing valid is stored — including
 * when `localStorage` throws, which it does in private-mode browsers with storage
 * disabled. A missing preference is never an error; the default locale covers it.
 */
export const readStoredLocale = (): SupportedLocale | null => {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const persistLocale = (locale: SupportedLocale): void => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage unavailable — the choice still applies to this session, it just
    // will not survive a reload. Not worth failing the language switch over.
  }
};

/** Falls back to the stored preference, then the app default. Browser language is ignored by design. */
export const resolveInitialLocale = (): SupportedLocale => readStoredLocale() ?? DEFAULT_LOCALE;

/**
 * Mirrors the active locale onto the document root. `dir` flips the whole layout
 * through CSS logical properties; `lang` drives font selection, hyphenation, and
 * screen-reader pronunciation.
 */
export const applyDocumentLocale = (locale: SupportedLocale): void => {
  const root = document.documentElement;
  root.setAttribute('dir', localeDirection(locale));
  root.setAttribute('lang', locale);
};

/**
 * Messages are bundled statically rather than lazy-loaded: two locales of UI copy
 * is a few KB gzipped, and a synchronous instance keeps `main.ts` synchronous so the
 * router guard can never run before translations exist.
 */
export const messages = { en, ar };

export const createAppI18n = (locale: SupportedLocale = resolveInitialLocale()) =>
  createI18n({
    legacy: false,
    globalInjection: true,
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    messages,
    // A missing key falls back to English silently. Completeness is enforced by
    // src/tests/i18n.spec.ts, which is a build-time guard rather than a console warning.
    missingWarn: false,
    fallbackWarn: false
  });

export type AppI18n = ReturnType<typeof createAppI18n>;
