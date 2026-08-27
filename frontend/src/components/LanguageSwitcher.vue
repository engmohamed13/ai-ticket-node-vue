<script setup lang="ts">
/**
 * Two-button language toggle. Switching re-points vue-i18n, flips `<html dir>` so the
 * whole layout mirrors, and stores the choice so it survives a reload and a sign-out.
 */
import { useI18n } from 'vue-i18n';
import { SUPPORTED_LOCALES, applyDocumentLocale, persistLocale } from '../config/i18n';
import type { SupportedLocale } from '../config/i18n';

const { t, locale } = useI18n();

const select = (next: SupportedLocale): void => {
  if (locale.value === next) return;
  locale.value = next;
  applyDocumentLocale(next);
  persistLocale(next);
};
</script>

<template>
  <div class="language-switcher" role="group" :aria-label="t('common.language.label')" data-testid="language-switcher">
    <button
      v-for="code in SUPPORTED_LOCALES"
      :key="code"
      type="button"
      class="language-option"
      :class="{ 'is-active': locale === code }"
      :lang="code"
      :aria-pressed="locale === code"
      :title="t('common.language.switchTo', { language: t(`common.language.${code}`) })"
      :data-testid="`language-option-${code}`"
      @click="select(code)"
    >
      {{ t(`common.language.${code}`) }}
    </button>
  </div>
</template>

<style scoped>
.language-switcher {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background-color: var(--surface-sunken);
  flex-shrink: 0;
}

.language-option {
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: var(--radius-xs);
  background: none;
  width: auto;
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--font-xs);
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.language-option:hover:not(.is-active) {
  color: var(--text-main);
}

.language-option.is-active {
  background-color: var(--surface-color);
  color: var(--color-primary);
  box-shadow: var(--shadow-xs);
}
</style>
