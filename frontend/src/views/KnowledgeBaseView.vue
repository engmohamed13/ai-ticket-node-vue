<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useKbStore } from '../stores/kb';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = useKbStore();
const auth = useAuthStore();

const canManage = computed(() => auth.can('kb:manage'));

const hasFilters = computed(() => store.search.trim() !== '' || store.categoryFilter !== '');

const onSearch = async (): Promise<void> => {
  await store.loadArticles();
};

const onSelectCategory = async (categoryId: number | ''): Promise<void> => {
  store.categoryFilter = categoryId;
  await store.loadArticles();
};

/** Article counts per category, so the browse rail can show what is behind each one. */
const countByCategory = computed(() => {
  const counts = new Map<number, number>();
  for (const article of store.articles) {
    counts.set(article.categoryId, (counts.get(article.categoryId) ?? 0) + 1);
  }
  return counts;
});

onMounted(async () => {
  await Promise.all([store.loadCategories(), store.loadArticles()]);
});
</script>

<template>
  <section class="view">
    <PageHeader title="Knowledge Base" subtitle="Guides and answers to the questions we are asked most.">
      <template #actions>
        <RouterLink v-if="canManage" class="btn btn-secondary" :to="{ name: 'kb-manage' }" data-testid="kb-manage-link">
          Manage articles
        </RouterLink>
      </template>
    </PageHeader>

    <AlertBanner v-if="store.error" variant="error" data-testid="kb-error">{{ store.error }}</AlertBanner>

    <div class="card">
      <div class="card-padded">
        <form class="search-bar" data-testid="kb-search-form" @submit.prevent="onSearch">
          <div class="form-field search-field">
            <label for="kb-search">Search articles</label>
            <input
              id="kb-search"
              v-model="store.search"
              data-testid="kb-search-input"
              type="search"
              placeholder="Try “sign in” or “priority”"
            />
          </div>
          <div class="form-field">
            <label for="kb-category">Category</label>
            <select
              id="kb-category"
              v-model="store.categoryFilter"
              data-testid="kb-category-select"
              @change="onSearch"
            >
              <option value="">All categories</option>
              <option v-for="category in store.categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          <button class="btn btn-primary" type="submit" data-testid="kb-search-button">Search</button>
          <button
            v-if="hasFilters"
            class="btn btn-ghost btn-sm"
            type="button"
            data-testid="kb-clear-filters-button"
            @click="store.clearFilters()"
          >
            Clear
          </button>
        </form>
      </div>
    </div>

    <div class="kb-layout">
      <aside class="card categories-rail">
        <div class="card-header">
          <h3 class="card-title">Categories</h3>
        </div>
        <div class="card-padded">
          <ul class="category-list" data-testid="kb-category-list">
            <li>
              <button
                class="category-button"
                :class="{ 'is-active': store.categoryFilter === '' }"
                type="button"
                data-testid="kb-category-all"
                @click="onSelectCategory('')"
              >
                All categories
              </button>
            </li>
            <li v-for="category in store.categories" :key="category.id">
              <button
                class="category-button"
                :class="{ 'is-active': store.categoryFilter === category.id }"
                type="button"
                data-testid="kb-category-item"
                @click="onSelectCategory(category.id)"
              >
                <span>{{ category.name }}</span>
                <span v-if="countByCategory.get(category.id)" class="category-count">
                  {{ countByCategory.get(category.id) }}
                </span>
              </button>
              <p v-if="category.description" class="category-description">{{ category.description }}</p>
            </li>
          </ul>
        </div>
      </aside>

      <div class="card articles-panel">
        <div class="card-padded">
          <LoadingState v-if="store.loading" data-testid="kb-loading">Loading articles…</LoadingState>

          <EmptyState
            v-else-if="!store.hasArticles"
            title="No articles found"
            description="Try a different search term, or clear the category filter."
            data-testid="kb-empty"
          />

          <ul v-else class="article-list" data-testid="kb-article-list">
            <li v-for="article in store.articles" :key="article.id" class="article-item" data-testid="kb-article-item">
              <RouterLink
                class="article-title"
                :to="{ name: 'kb-article', params: { id: article.id } }"
                data-testid="kb-article-link"
              >
                {{ article.title }}
              </RouterLink>
              <p v-if="article.summary" class="article-summary">{{ article.summary }}</p>
              <p class="article-meta">
                <StatusBadge variant="neutral">{{ article.category.name }}</StatusBadge>
                <span>{{ article.viewCount }} views</span>
                <StatusBadge v-if="!article.isPublished" variant="warning" data-testid="kb-draft-badge">
                  Draft
                </StatusBadge>
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.search-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}

.search-field {
  flex: 1 1 260px;
}

.kb-layout {
  display: grid;
  grid-template-columns: minmax(200px, 260px) 1fr;
  gap: var(--space-3);
  align-items: start;
}

@media (max-width: 780px) {
  .kb-layout {
    grid-template-columns: 1fr;
  }
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.category-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.6rem;
  text-align: left;
  font-size: var(--font-sm);
  color: var(--slate-600);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.category-button:hover {
  background-color: var(--slate-100);
  color: var(--text-main);
}

.category-button.is-active {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.category-count {
  font-variant-numeric: tabular-nums;
  color: var(--text-subtle);
}

.category-description {
  margin: 0 0 0.4rem 0.6rem;
  font-size: var(--font-sm);
  color: var(--text-subtle);
}

.article-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.article-item {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-color);
}

.article-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.article-item:first-child {
  padding-top: 0;
}

.article-title {
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
}

.article-title:hover {
  text-decoration: underline;
}

.article-summary {
  margin: 0.35rem 0 0;
  color: var(--text-subtle);
  font-size: var(--font-sm);
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0 0;
  font-size: var(--font-sm);
  color: var(--text-subtle);
}
</style>
