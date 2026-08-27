import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import en from '../locales/en';
import ar from '../locales/ar';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  applyDocumentLocale,
  createAppI18n,
  isRtlLocale,
  isSupportedLocale,
  localeDirection,
  messages,
  persistLocale,
  readStoredLocale,
  resolveInitialLocale
} from '../config/i18n';
import { LOCALE_STORAGE_KEY } from '../config/storage';
import { i18n } from './setup';

/** Walks a message object into a flat list of dotted key paths. */
const flattenKeys = (value: unknown, prefix = ''): string[] => {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  );
};

describe('locale helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('supports exactly English and Arabic', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['en', 'ar']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('recognises supported locale codes and rejects anything else', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('ar')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale(7)).toBe(false);
  });

  it('maps Arabic to rtl and English to ltr', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('en')).toBe(false);
    expect(localeDirection('ar')).toBe('rtl');
    expect(localeDirection('en')).toBe('ltr');
  });

  it('reads nothing when no preference is stored', () => {
    expect(readStoredLocale()).toBeNull();
  });

  it('round-trips a stored preference', () => {
    persistLocale('ar');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ar');
    expect(readStoredLocale()).toBe('ar');
  });

  it('ignores an unsupported stored value rather than trusting it', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'klingon');
    expect(readStoredLocale()).toBeNull();
    expect(resolveInitialLocale()).toBe('en');
  });

  it('prefers the stored locale over the default', () => {
    persistLocale('ar');
    expect(resolveInitialLocale()).toBe('ar');
  });

  it('survives localStorage throwing instead of crashing the app', () => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = () => {
      throw new Error('storage disabled');
    };
    Storage.prototype.setItem = () => {
      throw new Error('storage disabled');
    };

    try {
      expect(readStoredLocale()).toBeNull();
      expect(resolveInitialLocale()).toBe('en');
      expect(() => persistLocale('ar')).not.toThrow();
    } finally {
      Storage.prototype.getItem = getItem;
      Storage.prototype.setItem = setItem;
    }
  });
});

describe('applyDocumentLocale', () => {
  afterEach(() => {
    applyDocumentLocale('en');
  });

  it('sets dir and lang on the document root for Arabic', () => {
    applyDocumentLocale('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
  });

  it('sets dir and lang on the document root for English', () => {
    applyDocumentLocale('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });
});

describe('message catalogues', () => {
  it('registers a catalogue for every supported locale', () => {
    expect(Object.keys(messages).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it('has no empty English message', () => {
    for (const key of flattenKeys(en)) {
      const value = key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], en);
      expect(typeof value, `${key} should be a string`).toBe('string');
      expect((value as string).trim(), `${key} should not be blank`).not.toBe('');
    }
  });

  /**
   * The real risk with two hand-maintained catalogues is drift: a key added to English
   * and forgotten in Arabic falls back silently, so the Arabic UI shows English text with
   * no warning. This is the guard.
   */
  it('translates every English key into Arabic with no extra keys', () => {
    const englishKeys = flattenKeys(en).sort();
    const arabicKeys = flattenKeys(ar).sort();

    const missing = englishKeys.filter((key) => !arabicKeys.includes(key));
    const extra = arabicKeys.filter((key) => !englishKeys.includes(key));

    expect(missing, 'keys missing from the Arabic catalogue').toEqual([]);
    expect(extra, 'keys in Arabic that no longer exist in English').toEqual([]);
  });

  it('does not leave Arabic values identical to English for translatable copy', () => {
    // Placeholders, proper nouns, and the language names themselves are intentionally shared.
    const sharedByDesign = new Set([
      'auth.emailPlaceholder',
      'auth.passwordPlaceholder',
      'common.language.en',
      'common.language.ar',
      'common.states.none'
    ]);

    const identical = flattenKeys(en).filter((key) => {
      if (sharedByDesign.has(key)) return false;
      const read = (source: unknown) =>
        key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], source);
      return read(en) === read(ar);
    });

    expect(identical, 'Arabic values still holding the English string').toEqual([]);
  });

  it('keeps interpolation placeholders consistent across locales', () => {
    const placeholders = (value: string) => (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort();

    for (const key of flattenKeys(en)) {
      const read = (source: unknown) =>
        key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], source) as string;
      expect(placeholders(read(ar)), `placeholders differ for ${key}`).toEqual(placeholders(read(en)));
    }
  });
});

describe('message compilation', () => {
  /**
   * vue-i18n compiles a message the first time it is rendered, not when the catalogue
   * loads. So a stray `@` (link syntax) or an unbalanced `{` survives every structural
   * check in this file and only throws when a user opens that one screen — in the locale
   * nobody tested. Forcing every message through the compiler here closes that gap.
   */
  it.each(SUPPORTED_LOCALES)('compiles every %s message', (code) => {
    const instance = createAppI18n(code);
    const catalogue = code === 'en' ? en : ar;
    const failures: string[] = [];

    for (const key of flattenKeys(catalogue)) {
      try {
        // Named args are supplied generously: a message expecting {name} renders with a
        // placeholder value, and one expecting nothing simply ignores the extras.
        instance.global.t(key, {
          name: 'x',
          role: 'x',
          count: 1,
          total: 1,
          from: 1,
          to: 1,
          page: 1,
          pages: 1,
          date: 'x',
          time: 'x',
          size: 1,
          ms: 1,
          seconds: 1,
          min: 1,
          max: 1,
          value: 1,
          scale: 5,
          rating: 1,
          id: 1,
          elapsed: 'x',
          target: 'x',
          field: 'x',
          language: 'x',
          column: 'x',
          password: 'x',
          views: 1
        });
      } catch (cause) {
        failures.push(`${key}: ${(cause as Error).message}`);
      }
    }

    expect(failures, `${code} messages that fail to compile`).toEqual([]);
  });

  it('leaves no message rendering as its own key path', () => {
    // A key that resolves to itself means the namespace was never registered.
    for (const code of SUPPORTED_LOCALES) {
      const instance = createAppI18n(code);
      const catalogue = code === 'en' ? en : ar;
      const unresolved = flattenKeys(catalogue).filter((key) => instance.global.t(key) === key);
      expect(unresolved, `${code} keys resolving to their own path`).toEqual([]);
    }
  });
});

describe('createAppI18n', () => {
  it('starts on the requested locale and falls back to English', () => {
    const instance = createAppI18n('ar');
    expect(instance.global.locale.value).toBe('ar');
    expect(instance.global.fallbackLocale.value).toBe('en');
  });

  it('resolves a known key in both locales', () => {
    const instance = createAppI18n('en');
    expect(instance.global.t('common.actions.save')).toBe('Save');
    instance.global.locale.value = 'ar';
    expect(instance.global.t('common.actions.save')).toBe('حفظ');
  });
});

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    i18n.global.locale.value = 'en';
    applyDocumentLocale('en');
  });

  afterEach(() => {
    i18n.global.locale.value = 'en';
    applyDocumentLocale('en');
  });

  it('renders one button per supported locale, labelled in its own language', () => {
    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(SUPPORTED_LOCALES.length);
    expect(wrapper.find('[data-testid="language-option-en"]').text()).toBe('English');
    expect(wrapper.find('[data-testid="language-option-ar"]').text()).toBe('العربية');
  });

  it('marks the active locale with aria-pressed', () => {
    const wrapper = mount(LanguageSwitcher);
    expect(wrapper.find('[data-testid="language-option-en"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.find('[data-testid="language-option-ar"]').attributes('aria-pressed')).toBe('false');
  });

  it('switches locale, flips the document direction, and stores the choice', async () => {
    const wrapper = mount(LanguageSwitcher);

    await wrapper.find('[data-testid="language-option-ar"]').trigger('click');

    expect(i18n.global.locale.value).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ar');
  });

  it('switches back to English and restores ltr', async () => {
    const wrapper = mount(LanguageSwitcher);

    await wrapper.find('[data-testid="language-option-ar"]').trigger('click');
    await wrapper.find('[data-testid="language-option-en"]').trigger('click');

    expect(i18n.global.locale.value).toBe('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('does nothing when the active locale is clicked again', async () => {
    const wrapper = mount(LanguageSwitcher);

    await wrapper.find('[data-testid="language-option-en"]').trigger('click');

    expect(i18n.global.locale.value).toBe('en');
    // No write happened, so nothing was persisted by a no-op click.
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it('translates its own group label when the locale changes', async () => {
    const wrapper = mount(LanguageSwitcher);
    expect(wrapper.attributes('aria-label')).toBe('Language');

    await wrapper.find('[data-testid="language-option-ar"]').trigger('click');

    expect(wrapper.attributes('aria-label')).toBe('اللغة');
  });
});
