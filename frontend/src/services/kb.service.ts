import api from './api';
import type {
  ApiResponse,
  CreateKbArticlePayload,
  KbArticle,
  KbArticleSummary,
  KbCategory,
  UpdateKbArticlePayload
} from '../types';

export interface KbArticleFilter {
  search?: string;
  categoryId?: number;
  /** Authors only. The API ignores it for a caller without `kb:manage`. */
  includeDrafts?: boolean;
}

export const fetchKbCategories = async (): Promise<KbCategory[]> => {
  const response = await api.get<ApiResponse<KbCategory[]>>('/kb/categories');
  return response.data.data ?? [];
};

export const fetchKbArticles = async (filter: KbArticleFilter = {}): Promise<KbArticleSummary[]> => {
  const response = await api.get<ApiResponse<KbArticleSummary[]>>('/kb/articles', {
    params: {
      search: filter.search && filter.search.trim().length > 0 ? filter.search.trim() : undefined,
      categoryId: filter.categoryId,
      // The API validates this as the string 'true' / 'false', so only send it when set.
      includeDrafts: filter.includeDrafts ? 'true' : undefined
    }
  });
  return response.data.data ?? [];
};

export const fetchKbArticle = async (id: number): Promise<KbArticle> => {
  const response = await api.get<ApiResponse<KbArticle>>(`/kb/articles/${id}`);
  if (!response.data.data) throw new Error(response.data.message || 'Article not found');
  return response.data.data;
};

export const createKbArticle = async (payload: CreateKbArticlePayload): Promise<KbArticle> => {
  const response = await api.post<ApiResponse<KbArticle>>('/kb/articles', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to create the article');
  return response.data.data;
};

export const updateKbArticle = async (
  id: number,
  payload: UpdateKbArticlePayload
): Promise<KbArticle> => {
  const response = await api.patch<ApiResponse<KbArticle>>(`/kb/articles/${id}`, payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to update the article');
  return response.data.data;
};
