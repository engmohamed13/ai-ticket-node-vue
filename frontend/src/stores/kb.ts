import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import {
  createKbArticle,
  fetchKbArticle,
  fetchKbArticles,
  fetchKbCategories,
  updateKbArticle
} from '../services/kb.service';
import type {
  CreateKbArticlePayload,
  KbArticle,
  KbArticleSummary,
  KbCategory,
  UpdateKbArticlePayload
} from '../types';

/**
 * Knowledge base state (Story 19). The search box and category dropdown are held here rather
 * than in the view so the browse screen and the authoring screen share one filter set — an
 * author who publishes a draft lands back on the same query they were looking at.
 */
export const useKbStore = defineStore('kb', () => {
  const categories = ref<KbCategory[]>([]);
  const articles = ref<KbArticleSummary[]>([]);
  const selectedArticle = ref<KbArticle | null>(null);
  const search = ref('');
  const categoryFilter = ref<number | ''>('');
  const includeDrafts = ref(false);
  const loading = ref(false);
  const detailLoading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);

  const hasArticles = computed(() => articles.value.length > 0);

  const loadCategories = async (): Promise<void> => {
    try {
      categories.value = await fetchKbCategories();
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load the knowledge base categories');
    }
  };

  const loadArticles = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      articles.value = await fetchKbArticles({
        search: search.value,
        categoryId: categoryFilter.value === '' ? undefined : Number(categoryFilter.value),
        includeDrafts: includeDrafts.value
      });
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load the knowledge base');
    } finally {
      loading.value = false;
    }
  };

  const clearFilters = async (): Promise<void> => {
    search.value = '';
    categoryFilter.value = '';
    await loadArticles();
  };

  /** `null` on failure so the view can render "not found" rather than a blank page. */
  const loadArticle = async (id: number): Promise<void> => {
    detailLoading.value = true;
    error.value = null;
    try {
      selectedArticle.value = await fetchKbArticle(id);
    } catch (cause) {
      selectedArticle.value = null;
      error.value = toErrorMessage(cause, 'Unable to load this article');
    } finally {
      detailLoading.value = false;
    }
  };

  const submitArticle = async (payload: CreateKbArticlePayload): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    saving.value = true;
    try {
      const created = await createKbArticle(payload);
      notice.value = created.isPublished
        ? `"${created.title}" published`
        : `"${created.title}" saved as a draft`;
      await loadArticles();
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to create the article');
      return false;
    } finally {
      saving.value = false;
    }
  };

  const saveArticle = async (id: number, payload: UpdateKbArticlePayload): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    saving.value = true;
    try {
      const updated = await updateKbArticle(id, payload);
      if (selectedArticle.value?.id === id) selectedArticle.value = updated;
      // Keep the list row in step without a full reload.
      articles.value = articles.value.map((article) =>
        article.id === id ? { ...article, ...updated } : article
      );
      notice.value = `"${updated.title}" updated`;
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to update the article');
      return false;
    } finally {
      saving.value = false;
    }
  };

  const togglePublished = async (article: KbArticleSummary): Promise<boolean> =>
    saveArticle(article.id, { isPublished: !article.isPublished });

  return {
    categories,
    articles,
    selectedArticle,
    search,
    categoryFilter,
    includeDrafts,
    loading,
    detailLoading,
    saving,
    error,
    notice,
    hasArticles,
    loadCategories,
    loadArticles,
    clearFilters,
    loadArticle,
    submitArticle,
    saveArticle,
    togglePublished
  };
});
