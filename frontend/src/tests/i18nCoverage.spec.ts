import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import en from '../locales/en';

/**
 * Story-level guard for "all visible UI text is localized". Two failure modes are worth
 * catching automatically:
 *
 *  1. A screen that never wired up i18n at all — easy to miss on a view added later.
 *  2. A namespace file that exists but was never registered in locales/<loc>/index.ts,
 *     which makes every one of its keys render as the raw key path at runtime.
 *
 * Judging every individual string is left to review; these two are mechanical.
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

/** Windows hands back backslash-separated paths; the allowlist below is written with slashes. */
const posix = (path: string): string => path.split(sep).join('/');

/**
 * Presentational wrappers that render only slot content and take their text from the
 * caller. They hold no copy of their own, so there is nothing for them to translate.
 */
const NO_COPY_OF_THEIR_OWN = new Set([
  'components/ui/AlertBanner.vue',
  'components/ui/StatusBadge.vue',
  'components/ui/LoadingState.vue',
  'components/ui/EmptyState.vue',
  'components/ui/PageHeader.vue'
]);

describe('i18n coverage', () => {
  const views = collectFiles(join(SRC, 'views'), '.vue');

  it('finds the view files', () => {
    expect(views.length).toBeGreaterThan(15);
  });

  it.each(views.map((file) => [relative(SRC, file), file] as const))(
    '%s pulls its copy from i18n',
    (_name, file) => {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain("from 'vue-i18n'");
      // Either the composable's `t(...)` or the <i18n-t> component counts as wired up.
      expect(source).toMatch(/\bt\(['"`]|<i18n-t/);
    }
  );

  it('every shipped component either uses i18n or is a slot-only wrapper', () => {
    const components = collectFiles(join(SRC, 'components'), '.vue');
    const missing = components
      .map((file) => posix(relative(SRC, file)))
      .filter((name) => !NO_COPY_OF_THEIR_OWN.has(name))
      .filter((name) => {
        const source = readFileSync(join(SRC, name), 'utf8');
        return !source.includes("from 'vue-i18n'");
      });

    expect(missing, 'components with untranslated copy of their own').toEqual([]);
  });

  it('registers every locale namespace file that exists on disk', () => {
    const namespaceFiles = readdirSync(join(SRC, 'locales/en'))
      .filter((entry) => entry.endsWith('.json'))
      .map((entry) => entry.replace(/\.json$/, ''))
      .sort();

    // An unregistered namespace is invisible at runtime: keys resolve to their own path.
    expect(Object.keys(en).sort()).toEqual(namespaceFiles);
  });

  it('keeps the Arabic catalogue registered against the same namespaces', async () => {
    const ar = (await import('../locales/ar')).default;
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });
});
