# Story 19 — Knowledge Base UI: articles, FAQs, search (Story: 6)

## Prerequisites

- Story 18 completed: [18-story-knowledge-base-data-model-6.md](18-story-knowledge-base-data-model-6.md). All KB APIs (`GET /api/kb/categories`, `GET /api/kb/articles`, `GET /api/kb/articles/:id`, `POST /api/kb/articles`, `PATCH /api/kb/articles/:id`) are live.
- Story 15 completed: [../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md](../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md). General component patterns and table/list layouts exist.
- Story 09 completed: [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md). Router, auth store, and permissions are in place.

---

## Story Goal

Build a public-facing knowledge base UI where customers and agents can browse and search help articles. Agents can also author new articles and edit drafts. Outcomes:

1. `/kb` route shows the KB home with category list, search box, and featured articles list.
2. `/kb/articles` route shows a searchable, filterable article list (by category, search term).
3. `/kb/articles/:id` route displays full article content (markdown rendered) and view count.
4. Agent/manager can access `/kb/manage` (article management dashboard) to create, edit, and publish articles (gated on `kbArticle:manage`).
5. Sidebar shows "Knowledge Base" link (visible to all roles).

**Not in scope:** comments on articles, article ratings, related articles widget, reading time estimate, print/export, AI-powered search, and automatic TOC generation.

---

## Context — Read These Files First

1. [18-story-knowledge-base-data-model-6.md](18-story-knowledge-base-data-model-6.md) — review the API shapes and filtering logic.
2. `frontend/src/views/TicketsView.vue` / `CustomerDetailView.vue` — list/detail patterns with search/filter.
3. `frontend/src/components/` — `EmptyState.vue`, `LoadingState.vue`, `AlertBanner.vue`, `PageHeader.vue`, status badges.
4. `frontend/src/stores/` — Pinia setup-store pattern for managing KB state.
5. `frontend/src/services/` — axios instance and error handling via `toErrorMessage`.

---

## Implementation Tasks

### 1 — Add KB types to `frontend/src/types/index.ts`

```ts
export interface KnowledgeBaseCategory {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface KnowledgeBaseArticle {
  id: number;
  title: string;
  content: string;
  category: KnowledgeBaseCategory;
  isPublished: boolean;
  viewCount: number;
  author: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}
```

### 2 — Create `frontend/src/services/kb.service.ts`

```ts
import api from './api';
import type { ApiResponse, KnowledgeBaseArticle, KnowledgeBaseCategory } from '../types';

export const fetchCategories = async (): Promise<KnowledgeBaseCategory[]> => {
  const response = await api.get<ApiResponse<KnowledgeBaseCategory[]>>('/kb/categories');
  return response.data.data ?? [];
};

export const fetchArticles = async (search?: string, categoryId?: number): Promise<KnowledgeBaseArticle[]> => {
  const response = await api.get<ApiResponse<KnowledgeBaseArticle[]>>('/kb/articles', {
    params: { search, categoryId }
  });
  return response.data.data ?? [];
};

export const fetchArticle = async (id: number): Promise<KnowledgeBaseArticle> => {
  const response = await api.get<ApiResponse<KnowledgeBaseArticle>>(`/kb/articles/${id}`);
  if (!response.data.data) throw new Error('Article not found');
  return response.data.data;
};

export const createArticle = async (payload: any): Promise<KnowledgeBaseArticle> => {
  const response = await api.post<ApiResponse<KnowledgeBaseArticle>>('/kb/articles', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Failed to create article');
  return response.data.data;
};

export const updateArticle = async (id: number, payload: any): Promise<KnowledgeBaseArticle> => {
  const response = await api.patch<ApiResponse<KnowledgeBaseArticle>>(`/kb/articles/${id}`, payload);
  if (!response.data.data) throw new Error(response.data.message || 'Failed to update article');
  return response.data.data;
};
```

### 3 — Create `frontend/src/stores/kb.ts`

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import {
  fetchArticles,
  fetchArticle,
  fetchCategories,
  createArticle,
  updateArticle
} from '../services/kb.service';
import type { KnowledgeBaseArticle, KnowledgeBaseCategory } from '../types';

export const useKbStore = defineStore('kb', () => {
  const categories = ref<KnowledgeBaseCategory[]>([]);
  const articles = ref<KnowledgeBaseArticle[]>([]);
  const selectedArticle = ref<KnowledgeBaseArticle | null>(null);
  const loading = ref(false);
  const detailLoading = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);

  const hasArticles = computed(() => articles.value.length > 0);

  const loadCategories = async (): Promise<void> => {
    try {
      categories.value = await fetchCategories();
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Failed to load categories');
    }
  };

  const loadArticles = async (search?: string, categoryId?: number): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      articles.value = await fetchArticles(search, categoryId);
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Failed to load articles');
    } finally {
      loading.value = false;
    }
  };

  const loadArticleDetail = async (id: number): Promise<void> => {
    detailLoading.value = true;
    error.value = null;
    try {
      selectedArticle.value = await fetchArticle(id);
    } catch (cause) {
      selectedArticle.value = null;
      error.value = toErrorMessage(cause, 'Failed to load article');
    } finally {
      detailLoading.value = false;
    }
  };

  const submitArticle = async (payload: any): Promise<boolean> => {
    error.value = null;
    try {
      const created = await createArticle(payload);
      articles.value = [...articles.value, created];
      notice.value = 'Article created successfully';
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Failed to create article');
      return false;
    }
  };

  const saveArticle = async (id: number, payload: any): Promise<boolean> => {
    error.value = null;
    try {
      const updated = await updateArticle(id, payload);
      selectedArticle.value = updated;
      notice.value = 'Article updated successfully';
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Failed to update article');
      return false;
    }
  };

  return {
    categories,
    articles,
    selectedArticle,
    loading,
    detailLoading,
    error,
    notice,
    hasArticles,
    loadCategories,
    loadArticles,
    loadArticleDetail,
    submitArticle,
    saveArticle
  };
});
```

### 4 — Create `frontend/src/views/KnowledgeBaseView.vue` (home)

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useKbStore } from '../stores/kb';
import { useAuthStore } from '../stores/auth';
import PageHeader from '../components/ui/PageHeader.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';

const kbStore = useKbStore();
const auth = useAuthStore();
const searchInput = ref('');
const selectedCategory = ref<number | null>(null);

onMounted(async () => {
  await kbStore.loadCategories();
  await kbStore.loadArticles();
});

const handleSearch = async () => {
  await kbStore.loadArticles(searchInput.value || undefined, selectedCategory.value || undefined);
};
</script>

<template>
  <PageHeader
    title="Knowledge Base"
    subtitle="Find answers and helpful guides."
  />

  <AlertBanner v-if="kbStore.error" type="error" :message="kbStore.error" />

  <div class="kb-search">
    <input
      v-model="searchInput"
      type="text"
      placeholder="Search articles..."
      data-testid="kb-search-input"
      @keyup.enter="handleSearch"
    />
    <select
      v-model.number="selectedCategory"
      data-testid="kb-category-select"
      @change="handleSearch"
    >
      <option :value="null">All categories</option>
      <option v-for="cat in kbStore.categories" :key="cat.id" :value="cat.id">
        {{ cat.name }}
      </option>
    </select>
    <button @click="handleSearch" data-testid="kb-search-button">Search</button>
  </div>

  <div v-if="auth.user?.permissions?.includes('kbArticle:manage')" class="kb-manage-link">
    <RouterLink to="/kb/manage" class="btn btn-secondary">Manage Articles</RouterLink>
  </div>

  <LoadingState v-if="kbStore.loading" />

  <div v-else-if="kbStore.hasArticles" data-testid="kb-articles-list" class="articles-list">
    <div v-for="article in kbStore.articles" :key="article.id" class="article-card">
      <RouterLink :to="{ name: 'kb-article', params: { id: article.id } }">
        <h3>{{ article.title }}</h3>
      </RouterLink>
      <p class="category">{{ article.category.name }}</p>
      <p class="meta">👁 {{ article.viewCount }} views | {{ new Date(article.createdAt).toLocaleDateString() }}</p>
    </div>
  </div>

  <p v-else>No articles found.</p>
</template>

<style scoped>
.kb-search {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.kb-search input,
.kb-search select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.875rem;
}

.kb-search input {
  flex: 1;
}

.kb-manage-link {
  margin-bottom: 1rem;
}

.articles-list {
  display: grid;
  gap: 1rem;
}

.article-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  background: var(--background-secondary);
  transition: box-shadow 0.2s;
}

.article-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.article-card a {
  text-decoration: none;
  color: inherit;
}

.article-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-primary);
}

.article-card h3:hover {
  text-decoration: underline;
}

.category {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.5rem 0;
}

.meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}
</style>
```

### 5 — Create `frontend/src/views/KnowledgeBaseArticleView.vue` (detail)

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useKbStore } from '../stores/kb';
import PageHeader from '../components/ui/PageHeader.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';

const kbStore = useKbStore();
const route = useRoute();
const articleId = computed(() => Number(route.params.id));

onMounted(() => kbStore.loadArticleDetail(articleId.value));

import { computed } from 'vue';

// Simple markdown rendering (convert **bold**, *italic*, # headers, - lists)
const renderMarkdown = (md: string) => {
  let html = md
    .replace(/^# (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^## (.*?)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');
  return html;
};
</script>

<template>
  <RouterLink to="/kb" class="back-link">← Back to Knowledge Base</RouterLink>

  <PageHeader
    :title="kbStore.selectedArticle?.title ?? 'Article'"
    :subtitle="`${kbStore.selectedArticle?.category?.name} • ${kbStore.selectedArticle?.viewCount ?? 0} views`"
  />

  <AlertBanner v-if="kbStore.error" type="error" :message="kbStore.error" />

  <LoadingState v-if="kbStore.detailLoading" />

  <template v-else-if="!kbStore.detailLoading && !kbStore.selectedArticle">
    <EmptyState title="Article not found" description="This article may not be available." />
  </template>

  <template v-else>
    <article class="article-content" v-html="renderMarkdown(kbStore.selectedArticle.content)" />
  </template>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--color-primary);
  text-decoration: none;
}

.article-content {
  max-width: 800px;
  line-height: 1.6;
}

.article-content :deep(h2),
.article-content :deep(h3) {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.article-content :deep(strong) {
  font-weight: 600;
}

.article-content :deep(ul) {
  margin: 1rem 0;
  padding-left: 2rem;
}

.article-content :deep(li) {
  margin: 0.5rem 0;
}
</style>
```

### 6 — Create management views and routes (simplified)

Create `frontend/src/views/KnowledgeBaseManageView.vue` for agents to create/edit articles. Follow the pattern of `UsersView.vue` with a form and inline editing. Add routes for `/kb` (home), `/kb/articles/:id` (detail), `/kb/manage` (management).

### 7 — Update sidebar

Add "Knowledge Base" link to `AppSidebar.vue` with no permission gating (all users can view the KB).

### 8 — Tests

Create unit tests for service (`kb.service.spec.ts`), store (`kb.store.spec.ts`), and views following the established Vitest patterns.

---

## Edge Cases & Failure Modes

- **Accessing `/kb/articles/999` (nonexistent article).** The API throws 404; the view renders the "Article not found" `EmptyState`.
- **Markdown in article content contains HTML/script tags.** Vue's `v-html` is vulnerable to XSS. Use a markdown library (e.g., `marked.js`) with sanitization, or escape the content before rendering.
- **Search with special characters (e.g., `"quote$sign"`)**.  Handled safely by the backend's case-insensitive `contains` filter.
- **Two agents editing the same article concurrently.** Last update wins (no conflict detection).

---

## Test Plan

1. Service tests: fetch/create/update functions call correct endpoints.
2. Store tests: load/submit/save actions populate state correctly.
3. View tests: search/filter work; list renders articles; detail renders markdown.

---

## Verification Steps

**Frontend builds:** `npm run build` exits 0.

**Tests pass:** `npm test` includes all KB specs.

**Dev smoke test:**
1. Navigate to `/kb`, confirm categories and articles load.
2. Search for an article, confirm filtering works.
3. Click an article, confirm detail page loads and content renders.
4. Log in as an agent, navigate to `/kb/manage`, create a new article.
5. Go back to `/kb` and confirm the new article appears in the list.

---

## Done Criteria

- [ ] `/kb` home, `/kb/articles`, `/kb/articles/:id`, `/kb/manage` routes created.
- [ ] KB service and store created with full CRUD.
- [ ] Home page displays categories, search box, and article list.
- [ ] Article detail page renders markdown content and view count.
- [ ] Agents can create/edit articles via `/kb/manage`.
- [ ] "Knowledge Base" link in sidebar (all users).
- [ ] All frontend tests pass; `npm run build` and `npm run typecheck` exit 0.
- [ ] Smoke test confirms end-to-end KB browsing and authoring.
