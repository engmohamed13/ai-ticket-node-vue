<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useKbStore } from '../stores/kb';
import type { KbArticleSummary } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = useKbStore();

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
    <PageHeader title="Manage articles" subtitle="Write, edit, publish, and unpublish knowledge base articles.">
      <template #actions>
        <RouterLink class="btn btn-secondary" :to="{ name: 'kb' }" data-testid="kb-manage-back-link">
          View knowledge base
        </RouterLink>
        <button
          v-if="!isCreating && editingId === null"
          class="btn btn-primary"
          type="button"
          data-testid="kb-new-article-button"
          @click="onStartCreate"
        >
          New article
        </button>
      </template>
    </PageHeader>

    <AlertBanner v-if="store.error" variant="error" data-testid="kb-manage-error">{{ store.error }}</AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="kb-manage-notice">{{ store.notice }}</AlertBanner>

    <div v-if="isCreating || editingId !== null" class="card">
      <div class="card-header">
        <h3 class="card-title">{{ editingId === null ? 'New article' : 'Edit article' }}</h3>
      </div>
      <form class="card-padded" data-testid="kb-article-form" @submit.prevent="onSubmit">
        <div class="form-grid">
          <div class="form-field">
            <label for="kb-form-title">Title</label>
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
            <label for="kb-form-category">Category</label>
            <select id="kb-form-category" v-model="categoryId" data-testid="kb-form-category-select" required>
              <option value="">Select a category…</option>
              <option v-for="category in store.categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-field">
          <label for="kb-form-summary">Summary (optional)</label>
          <input
            id="kb-form-summary"
            v-model="summary"
            data-testid="kb-form-summary-input"
            type="text"
            maxlength="500"
          />
        </div>

        <div class="form-field">
          <label for="kb-form-body">Body (markdown)</label>
          <textarea id="kb-form-body" v-model="body" data-testid="kb-form-body-input" rows="12" required></textarea>
        </div>

        <label class="checkbox-field">
          <input v-model="isPublished" type="checkbox" data-testid="kb-form-published-checkbox" />
          <span>Published — visible to customers and agents</span>
        </label>

        <div class="form-actions">
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="!canSubmit || store.saving"
            data-testid="kb-form-submit-button"
          >
            {{ store.saving ? 'Saving…' : editingId === null ? 'Create article' : 'Save changes' }}
          </button>
          <button class="btn btn-secondary" type="button" data-testid="kb-form-cancel-button" @click="resetForm">
            Cancel
          </button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-padded">
        <LoadingState v-if="store.loading" data-testid="kb-manage-loading">Loading articles…</LoadingState>

        <EmptyState
          v-else-if="!store.hasArticles"
          title="No articles yet"
          description="Create the first knowledge base article to get started."
          data-testid="kb-manage-empty"
        />

        <div v-else class="table-wrapper">
          <table data-testid="kb-manage-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Category</th>
                <th scope="col">State</th>
                <th scope="col">Views</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="article in store.articles" :key="article.id" data-testid="kb-manage-row">
                <td>{{ article.title }}</td>
                <td>{{ article.category.name }}</td>
                <td>
                  <StatusBadge :variant="article.isPublished ? 'success' : 'warning'">
                    {{ article.isPublished ? 'Published' : 'Draft' }}
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
                    Edit
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    :disabled="store.saving"
                    data-testid="kb-toggle-published-button"
                    @click="store.togglePublished(article)"
                  >
                    {{ article.isPublished ? 'Unpublish' : 'Publish' }}
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
