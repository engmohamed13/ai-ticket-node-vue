import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import { applyDocumentLocale, localeDirection } from '../config/i18n';
import { i18n } from './setup';

/**
 * Arabic renders right-to-left, so any layout pinned to a *physical* edge stays put
 * when the rest of the page mirrors — a sidebar rail on the left, a dropdown anchored
 * right, a bar chart growing left-to-right. CSS logical properties
 * (`margin-inline-start`, `inset-inline-end`, `text-align: start`, …) mirror on their
 * own, so the rule for this codebase is: use logical properties for anything on the
 * inline axis. This spec is the automated guard for that rule.
 *
 * The block axis (`top`, `bottom`, `translateY`) is unaffected by direction and is
 * deliberately not flagged.
 */
const SRC = resolve(process.cwd(), 'src');

const collectFiles = (dir: string, ext: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, ext, found);
    else if (entry.endsWith(ext)) found.push(full);
  }
  return found;
};

/** Physical inline-axis declarations, each paired with the logical form to use instead. */
const PHYSICAL_PATTERNS: Array<{ pattern: RegExp; use: string }> = [
  { pattern: /\bmargin-left\s*:/g, use: 'margin-inline-start' },
  { pattern: /\bmargin-right\s*:/g, use: 'margin-inline-end' },
  { pattern: /\bpadding-left\s*:/g, use: 'padding-inline-start' },
  { pattern: /\bpadding-right\s*:/g, use: 'padding-inline-end' },
  { pattern: /\bborder-left(-(width|style|color))?\s*:/g, use: 'border-inline-start' },
  { pattern: /\bborder-right(-(width|style|color))?\s*:/g, use: 'border-inline-end' },
  { pattern: /\btext-align\s*:\s*(left|right)\b/g, use: 'text-align: start / end' },
  { pattern: /\bfloat\s*:\s*(left|right)\b/g, use: 'float: inline-start / inline-end' },
  { pattern: /^\s*left\s*:/gm, use: 'inset-inline-start' },
  { pattern: /^\s*right\s*:/gm, use: 'inset-inline-end' }
];

/**
 * Documented exceptions. A physical property is only acceptable on the inline axis when
 * it is symmetric (identical on both edges), because mirroring it changes nothing.
 * Anything added here needs a reason, not just a passing build.
 */
const ALLOWED: Record<string, string> = {};

/** Windows yields backslash-separated paths; ALLOWED keys are written with slashes. */
const posix = (path: string): string => path.split(sep).join('/');

/** Strips comments so a property named inside prose does not count as a use. */
const stripComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const styleBlocks = (source: string): string =>
  [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n');

const findViolations = (css: string): string[] => {
  const cleaned = stripComments(css);
  return PHYSICAL_PATTERNS.flatMap(({ pattern, use }) => {
    const hits = cleaned.match(pattern);
    return hits ? [`${hits[0].trim()} (use ${use})`] : [];
  });
};

describe('RTL safety: inline-axis CSS is logical, not physical', () => {
  const vueFiles = collectFiles(SRC, '.vue');

  it('finds component files to check', () => {
    expect(vueFiles.length).toBeGreaterThan(15);
  });

  it.each(vueFiles.map((file) => [relative(SRC, file), file] as const))(
    '%s uses logical inline properties',
    (name, file) => {
      const violations = findViolations(styleBlocks(readFileSync(file, 'utf8')));
      const allowed = ALLOWED[posix(name)];
      if (allowed) {
        expect(violations.length, `${name}: ${allowed}`).toBeGreaterThan(0);
        return;
      }
      expect(violations, `${name} pins layout to a physical edge`).toEqual([]);
    }
  );

  it('style.css uses logical inline properties', () => {
    const css = readFileSync(join(SRC, 'style.css'), 'utf8');
    expect(findViolations(css)).toEqual([]);
  });

  it('exposes a --dir multiplier for the transforms that have no logical form', () => {
    const css = readFileSync(join(SRC, 'style.css'), 'utf8');
    expect(css).toContain('--dir: 1;');
    expect(css).toMatch(/\[dir=['"]rtl['"]\]\s*\{\s*--dir:\s*-1;/);
  });

  it('flips every translateX offset with --dir so slides leave the correct edge', () => {
    const sources = [join(SRC, 'style.css'), ...vueFiles];
    const offenders: string[] = [];

    for (const file of sources) {
      const raw = readFileSync(file, 'utf8');
      const css = stripComments(file.endsWith('.vue') ? styleBlocks(raw) : raw);
      for (const match of css.matchAll(/translateX\(([^)]*)\)/g)) {
        const offset = match[1];
        // A zero offset is direction-neutral; anything else must consult --dir.
        const neutral = /^\s*0(px|%|rem|em)?\s*$/.test(offset);
        if (!neutral && !offset.includes('--dir')) {
          offenders.push(`${relative(SRC, file)}: translateX(${offset})`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('RTL safety: the document reflects the active locale', () => {
  beforeEach(() => {
    localStorage.clear();
    i18n.global.locale.value = 'en';
    applyDocumentLocale('en');
  });

  afterEach(() => {
    i18n.global.locale.value = 'en';
    applyDocumentLocale('en');
  });

  it('maps each supported locale to a direction', () => {
    expect(localeDirection('en')).toBe('ltr');
    expect(localeDirection('ar')).toBe('rtl');
  });

  it('flips the document to rtl when the user picks Arabic in the UI', async () => {
    const wrapper = mount(LanguageSwitcher);
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');

    await wrapper.find('[data-testid="language-option-ar"]').trigger('click');

    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
  });

  it('restores ltr when the user switches back to English', async () => {
    const wrapper = mount(LanguageSwitcher);

    await wrapper.find('[data-testid="language-option-ar"]').trigger('click');
    await wrapper.find('[data-testid="language-option-en"]').trigger('click');

    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });

  it('ships dir and lang on the served HTML so the first paint is not mis-oriented', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).toMatch(/<html[^>]*\blang=/);
    expect(html).toMatch(/<html[^>]*\bdir=/);
  });
});
