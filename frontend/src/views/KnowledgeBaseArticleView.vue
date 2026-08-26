<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useKbStore } from '../stores/kb';
import { renderMarkdown } from '../services/markdown';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = useKbStore();
const route = useRoute();

const articleId = computed(() => Number(route.params.id));

/**
 * `renderMarkdown` escapes the whole body before inserting any tag of its own, so the `v-html`
 * below cannot execute author-supplied markup — see services/markdown.ts.
 */
const bodyHtml = computed(() =>
  store.selectedArticle ? renderMarkdown(store.selectedArticle.body) : ''
);

const formatDate = (value: string): string => new Date(value).toLocaleDateString();

onMounted(() => {
  void store.loadArticle(articleId.value);
});

// Following a link from one article to another reuses this component, so the id change has to
// drive the reload — `onMounted` only fires once.
watch(articleId, (next) => {
  void store.loadArticle(next);
});
</script>

<template>
  <section class="view">
    <PageHeader :title="store.selectedArticle?.title ?? 'Article'">
      <template #actions>
        <RouterLink class="btn btn-secondary" :to="{ name: 'kb' }" data-testid="kb-back-link">
          Back to the knowledge base
        </RouterLink>
      </template>
    </PageHeader>

    <AlertBanner v-if="store.error" variant="error" data-testid="kb-article-error">
      {{ store.error }}
    </AlertBanner>

    <LoadingState v-if="store.detailLoading" data-testid="kb-article-loading">
      Loading this article…
    </LoadingState>

    <EmptyState
      v-else-if="!store.selectedArticle"
      title="Article not found"
      description="It may have been unpublished, or the link is incorrect."
      data-testid="kb-article-missing"
    />

    <div v-else class="card">
      <div class="card-padded">
        <p class="article-meta" data-testid="kb-article-meta">
          <StatusBadge variant="neutral">{{ store.selectedArticle.category.name }}</StatusBadge>
          <StatusBadge v-if="!store.selectedArticle.isPublished" variant="warning" data-testid="kb-article-draft-badge">
            Draft
          </StatusBadge>
          <span data-testid="kb-article-views">{{ store.selectedArticle.viewCount }} views</span>
          <span>Updated {{ formatDate(store.selectedArticle.updatedAt) }}</span>
        </p>

        <!-- eslint-disable-next-line vue/no-v-html -- body is escaped by renderMarkdown -->
        <article class="article-body" data-testid="kb-article-body" v-html="bodyHtml"></article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 var(--space-3);
  font-size: var(--font-sm);
  color: var(--text-subtle);
}

.article-body {
  max-width: 70ch;
  line-height: 1.65;
}

.article-body :deep(h2) {
  font-size: 1.3rem;
  margin: var(--space-4) 0 var(--space-2);
}

.article-body :deep(h2):first-child {
  margin-top: 0;
}

.article-body :deep(h3) {
  font-size: 1.1rem;
  margin: var(--space-3) 0 var(--space-2);
}

.article-body :deep(h4) {
  font-size: 1rem;
  margin: var(--space-3) 0 var(--space-2);
}

.article-body :deep(p) {
  margin: 0 0 var(--space-3);
}

.article-body :deep(ul) {
  margin: 0 0 var(--space-3);
  padding-left: 1.4rem;
}

.article-body :deep(li) {
  margin-bottom: 0.35rem;
}

.article-body :deep(code) {
  background-color: var(--slate-100);
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.3rem;
  font-size: 0.9em;
}
</style>
