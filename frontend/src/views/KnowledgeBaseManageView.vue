<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useKbStore } from '../stores/kb';
import type { KbArticleSummary } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = useKbStore();
const { t } = useI18n();

const isCreating = ref(false);
const editingId = ref<number | null>(null);

const title = ref('');
const summary = ref('');
const body = ref('');
const categoryId = ref<number | ''>('');
const isPublished = ref(false);

const canSubmit = computed(
  () => title.value.trim() !== '' && body.value.trim() !== '' && categoryId.value !== ''
);

const resetForm = (): void => {
  isCreating.value = false;
  editingId.value = null;
  title.value = '';
  summary.value = '';
  body.value = '';
  categoryId.value = '';
  isPublished.value = false;
};

const onStartCreate = (): void => {
  resetForm();
  isCreating.value = true;
  categoryId.value = store.categories[0]?.id ?? '';
};

/** Editing needs the markdown body, which list rows do not carry — fetch the article first. */
const onStartEdit = async (article: KbArticleSummary): Promise<void> => {
  resetForm();
  await store.loadArticle(article.id);
  const loaded = store.selectedArticle;
  if (!loaded) return;
  editingId.value = loaded.id;
  title.value = loaded.title;
  summary.value = loaded.summary ?? '';
  body.value = loaded.body;
  categoryId.value = loaded.categoryId;
  isPublished.value = loaded.isPublished;
};

const onSubmit = async (): Promise<void> => {
  if (!canSubmit.value) return;

  const trimmedSummary = summary.value.trim();
  const saved =
    editingId.value === null
      ? await store.submitArticle({
          title: title.value.trim(),
          body: body.value.trim(),
          categoryId: Number(categoryId.value),
          summary: trimmedSummary === '' ? undefined : trimmedSummary,
          isPublished: isPublished.value
        })
      : await store.saveArticle(editingId.value, {
          title: title.value.trim(),
          body: body.value.trim(),
          categoryId: Number(categoryId.value),
          // Explicit null clears a summary that has been emptied.
          summary: trimmedSummary === '' ? null : trimmedSummary,
          isPublished: isPublished.value
        });

  if (saved) resetForm();
};

onMounted(async () => {
  // Authors browse their own drafts alongside what is live.
  store.includeDrafts = true;
  await Promise.all([store.loadCategories(), store.loadArticles()]);
});
</script>

<template>
  <section class="view">
    <PageHeader :title="t('kb.manage.title')" :subtitle="t('kb.manage.subtitle')">
      <template #actions>
        <RouterLink class="btn btn-secondary" :to="{ name: 'kb' }" data-testid="kb-manage-back-link">
          {{ t('kb.manage.backLink') }}
        </RouterLink>
        <button
          v-if="!isCreating && editingId === null"
          class="btn btn-primary"
          type="button"
          data-testid="kb-new-article-button"
          @click="onStartCreate"
        >
          {{ t('kb.manage.newArticle') }}
        </button>
      </template>
    </PageHeader>

    <AlertBanner v-if="store.error" variant="error" data-testid="kb-manage-error">{{ store.error }}</AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="kb-manage-notice">{{ store.notice }}</AlertBanner>

    <div v-if="isCreating || editingId !== null" class="card">
      <div class="card-header">
        <h3 class="card-title">
          {{ editingId === null ? t('kb.manage.newArticle') : t('kb.manage.editArticle') }}
        </h3>
      </div>
      <form class="card-padded" data-testid="kb-article-form" @submit.prevent="onSubmit">
        <div class="form-grid">
          <div class="form-field">
            <label for="kb-form-title">{{ t('kb.manage.fields.title') }}</label>
            <input
              id="kb-form-title"
              v-model="title"
              data-testid="kb-form-title-input"
              type="text"
              maxlength="255"
              required
            />
          </div>
          <div class="form-field">
            <label for="kb-form-category">{{ t('kb.manage.fields.category') }}</label>
            <select id="kb-form-category" v-model="categoryId" data-testid="kb-form-category-select" required>
              <option value="">{{ t('kb.manage.fields.categoryPlaceholder') }}</option>
              <option v-for="category in store.categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-field">
          <label for="kb-form-summary">{{ t('kb.manage.fields.summary') }}</label>
          <input
            id="kb-form-summary"
            v-model="summary"
            data-testid="kb-form-summary-input"
            type="text"
            maxlength="500"
          />
        </div>

        <div class="form-field">
          <label for="kb-form-body">{{ t('kb.manage.fields.body') }}</label>
          <textarea id="kb-form-body" v-model="body" data-testid="kb-form-body-input" rows="12" required></textarea>
        </div>

        <label class="checkbox-field">
          <input v-model="isPublished" type="checkbox" data-testid="kb-form-published-checkbox" />
          <span>{{ t('kb.manage.publishedHint') }}</span>
        </label>

        <div class="form-actions">
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="!canSubmit || store.saving"
            data-testid="kb-form-submit-button"
          >
            {{
              store.saving
                ? t('common.actions.saving')
                : editingId === null
                  ? t('kb.manage.createSubmit')
                  : t('kb.manage.saveSubmit')
            }}
          </button>
          <button class="btn btn-secondary" type="button" data-testid="kb-form-cancel-button" @click="resetForm">
            {{ t('common.actions.cancel') }}
          </button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-padded">
        <LoadingState v-if="store.loading" data-testid="kb-manage-loading">
          {{ t('kb.loadingArticles') }}
        </LoadingState>

        <EmptyState
          v-else-if="!store.hasArticles"
          :title="t('kb.manage.emptyTitle')"
          :description="t('kb.manage.emptyDescription')"
          data-testid="kb-manage-empty"
        />

        <div v-else class="table-wrapper">
          <table data-testid="kb-manage-table">
            <thead>
              <tr>
                <th scope="col">{{ t('kb.manage.columns.title') }}</th>
                <th scope="col">{{ t('kb.manage.columns.category') }}</th>
                <th scope="col">{{ t('kb.manage.columns.state') }}</th>
                <th scope="col">{{ t('kb.manage.columns.views') }}</th>
                <th scope="col"><span class="sr-only">{{ t('kb.manage.columns.actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="article in store.articles" :key="article.id" data-testid="kb-manage-row">
                <td>{{ article.title }}</td>
                <td>{{ article.category.name }}</td>
                <td>
                  <StatusBadge :variant="article.isPublished ? 'success' : 'warning'">
                    {{ article.isPublished ? t('kb.state.published') : t('kb.state.draft') }}
                  </StatusBadge>
                </td>
                <td>{{ article.viewCount }}</td>
                <td class="row-actions">
                  <button
                    class="btn btn-secondary btn-sm"
                    type="button"
                    data-testid="kb-edit-article-button"
                    @click="onStartEdit(article)"
                  >
                    {{ t('common.actions.edit') }}
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    :disabled="store.saving"
                    data-testid="kb-toggle-published-button"
                    @click="store.togglePublished(article)"
                  >
                    {{ article.isPublished ? t('kb.actions.unpublish') : t('kb.actions.publish') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: var(--space-3);
  font-size: var(--font-sm);
}

.checkbox-field input {
  width: auto;
}

.row-actions {
  display: flex;
  gap: 0.4rem;
}
</style>
