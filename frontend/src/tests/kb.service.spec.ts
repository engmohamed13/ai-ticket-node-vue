import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import {
  createKbArticle,
  fetchKbArticle,
  fetchKbArticles,
  fetchKbCategories,
  updateKbArticle
} from '../services/kb.service';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }
}));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = api.post as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = api.patch as unknown as ReturnType<typeof vi.fn>;

const envelope = <T>(data: T, message = 'OK') => ({ data: { success: true, message, data } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchKbCategories', () => {
  it('reads the categories endpoint', async () => {
    mockedGet.mockResolvedValue(envelope([{ id: 1, name: 'Getting Started' }]));

    await expect(fetchKbCategories()).resolves.toHaveLength(1);
    expect(mockedGet).toHaveBeenCalledWith('/kb/categories');
  });

  it('falls back to an empty list', async () => {
    mockedGet.mockResolvedValue(envelope(null));

    await expect(fetchKbCategories()).resolves.toEqual([]);
  });
});

describe('fetchKbArticles', () => {
  it('sends no params at all when nothing is filtered', async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await fetchKbArticles();

    expect(mockedGet).toHaveBeenCalledWith('/kb/articles', {
      params: { search: undefined, categoryId: undefined, includeDrafts: undefined }
    });
  });

  it('trims the search term before sending it', async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await fetchKbArticles({ search: '  sign in  ' });

    expect(mockedGet.mock.calls[0][1].params.search).toBe('sign in');
  });

  it('drops a whitespace-only search term', async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await fetchKbArticles({ search: '   ' });

    expect(mockedGet.mock.calls[0][1].params.search).toBeUndefined();
  });

  it('sends includeDrafts as the string the API validates', async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await fetchKbArticles({ includeDrafts: true });

    expect(mockedGet.mock.calls[0][1].params.includeDrafts).toBe('true');
  });
});

describe('fetchKbArticle', () => {
  it('reads one article by id', async () => {
    mockedGet.mockResolvedValue(envelope({ id: 5, title: 'T', body: '# T' }));

    await expect(fetchKbArticle(5)).resolves.toMatchObject({ id: 5 });
    expect(mockedGet).toHaveBeenCalledWith('/kb/articles/5');
  });

  it('throws the API message when the article is missing', async () => {
    mockedGet.mockResolvedValue({ data: { success: false, message: 'Article 5 not found', data: null } });

    await expect(fetchKbArticle(5)).rejects.toThrow('Article 5 not found');
  });
});

describe('createKbArticle', () => {
  it('posts the payload', async () => {
    mockedPost.mockResolvedValue(envelope({ id: 5 }));

    await createKbArticle({ title: 'T', body: 'B', categoryId: 3 });

    expect(mockedPost).toHaveBeenCalledWith('/kb/articles', { title: 'T', body: 'B', categoryId: 3 });
  });
});

describe('updateKbArticle', () => {
  it('patches only the supplied fields', async () => {
    mockedPatch.mockResolvedValue(envelope({ id: 5 }));

    await updateKbArticle(5, { isPublished: true });

    expect(mockedPatch).toHaveBeenCalledWith('/kb/articles/5', { isPublished: true });
  });

  it('throws the API message on failure', async () => {
    mockedPatch.mockResolvedValue({ data: { success: false, message: 'Article 5 not found', data: null } });

    await expect(updateKbArticle(5, { title: 'X' })).rejects.toThrow('Article 5 not found');
  });
});
