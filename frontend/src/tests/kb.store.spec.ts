import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useKbStore } from '../stores/kb';
import {
  createKbArticle,
  fetchKbArticle,
  fetchKbArticles,
  fetchKbCategories,
  updateKbArticle
} from '../services/kb.service';
import type { KbArticle, KbArticleSummary, KbCategory } from '../types';

vi.mock('../services/kb.service', () => ({
  fetchKbCategories: vi.fn(),
  fetchKbArticles: vi.fn(),
  fetchKbArticle: vi.fn(),
  createKbArticle: vi.fn(),
  updateKbArticle: vi.fn()
}));

const mockedCategories = fetchKbCategories as unknown as ReturnType<typeof vi.fn>;
const mockedArticles = fetchKbArticles as unknown as ReturnType<typeof vi.fn>;
const mockedArticle = fetchKbArticle as unknown as ReturnType<typeof vi.fn>;
const mockedCreate = createKbArticle as unknown as ReturnType<typeof vi.fn>;
const mockedUpdate = updateKbArticle as unknown as ReturnType<typeof vi.fn>;

const STAMP = '2026-08-26T10:00:00.000Z';

const category: KbCategory = {
  id: 3,
  name: 'Getting Started',
  description: null,
  createdAt: STAMP
};

const summary = (overrides: Partial<KbArticleSummary> = {}): KbArticleSummary => ({
  id: 1,
  title: 'Cannot sign in',
  summary: 'Password resets and locked accounts.',
  categoryId: 3,
  category,
  isPublished: true,
  viewCount: 4,
  authorId: 7,
  author: { id: 7, name: 'Agent' },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...overrides
});

const article = (overrides: Partial<KbArticle> = {}): KbArticle => ({
  ...summary(),
  body: '# Cannot sign in',
  ...overrides
});

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('loadArticles', () => {
  it('passes the current search and category filter through', async () => {
    mockedArticles.mockResolvedValue([summary()]);

    const store = useKbStore();
    store.search = 'sign in';
    store.categoryFilter = 3;
    await store.loadArticles();

    expect(mockedArticles).toHaveBeenCalledWith({
      search: 'sign in',
      categoryId: 3,
      includeDrafts: false
    });
    expect(store.hasArticles).toBe(true);
  });

  it('sends no categoryId when the filter is blank', async () => {
    mockedArticles.mockResolvedValue([]);

    const store = useKbStore();
    await store.loadArticles();

    expect(mockedArticles.mock.calls[0][0].categoryId).toBeUndefined();
  });

  it('asks for drafts when the author flag is set', async () => {
    mockedArticles.mockResolvedValue([]);

    const store = useKbStore();
    store.includeDrafts = true;
    await store.loadArticles();

    expect(mockedArticles.mock.calls[0][0].includeDrafts).toBe(true);
  });

  it('surfaces a failure in the error ref', async () => {
    mockedArticles.mockRejectedValue(new Error('Unable to load the knowledge base'));

    const store = useKbStore();
    await store.loadArticles();

    expect(store.error).toBe('Unable to load the knowledge base');
    expect(store.loading).toBe(false);
  });
});

describe('clearFilters', () => {
  it('resets both filters and reloads', async () => {
    mockedArticles.mockResolvedValue([]);

    const store = useKbStore();
    store.search = 'billing';
    store.categoryFilter = 3;
    await store.clearFilters();

    expect(store.search).toBe('');
    expect(store.categoryFilter).toBe('');
    expect(mockedArticles.mock.calls[0][0]).toMatchObject({ search: '', categoryId: undefined });
  });
});

describe('loadCategories', () => {
  it('populates the category list', async () => {
    mockedCategories.mockResolvedValue([category]);

    const store = useKbStore();
    await store.loadCategories();

    expect(store.categories).toEqual([category]);
  });
});

describe('loadArticle', () => {
  it('stores the fetched article', async () => {
    mockedArticle.mockResolvedValue(article());

    const store = useKbStore();
    await store.loadArticle(1);

    expect(store.selectedArticle?.body).toBe('# Cannot sign in');
  });

  it('clears the selection and records the error on a 404', async () => {
    mockedArticle.mockRejectedValue(new Error('Article 99 not found'));

    const store = useKbStore();
    await store.loadArticle(99);

    expect(store.selectedArticle).toBeNull();
    expect(store.error).toBe('Article 99 not found');
  });
});

describe('submitArticle', () => {
  it('reports a draft save differently from a publish', async () => {
    mockedCreate.mockResolvedValue(article({ isPublished: false, title: 'Draft piece' }));
    mockedArticles.mockResolvedValue([]);

    const store = useKbStore();
    await expect(
      store.submitArticle({ title: 'Draft piece', body: 'B', categoryId: 3 })
    ).resolves.toBe(true);

    expect(store.notice).toContain('saved as a draft');
  });

  it('reloads the list after a successful create', async () => {
    mockedCreate.mockResolvedValue(article({ isPublished: true }));
    mockedArticles.mockResolvedValue([summary()]);

    const store = useKbStore();
    await store.submitArticle({ title: 'T', body: 'B', categoryId: 3, isPublished: true });

    expect(mockedArticles).toHaveBeenCalled();
    expect(store.notice).toContain('published');
  });

  it('returns false and surfaces the error on failure', async () => {
    mockedCreate.mockRejectedValue(new Error('Knowledge base category 99 not found'));

    const store = useKbStore();
    await expect(store.submitArticle({ title: 'T', body: 'B', categoryId: 99 })).resolves.toBe(false);

    expect(store.error).toBe('Knowledge base category 99 not found');
    expect(store.saving).toBe(false);
  });
});

describe('saveArticle', () => {
  it('updates the matching list row in place', async () => {
    mockedArticles.mockResolvedValue([summary()]);
    mockedUpdate.mockResolvedValue(article({ title: 'Renamed' }));

    const store = useKbStore();
    await store.loadArticles();
    await expect(store.saveArticle(1, { title: 'Renamed' })).resolves.toBe(true);

    expect(store.articles[0].title).toBe('Renamed');
    expect(store.notice).toContain('updated');
  });

  it('refreshes the open article when it is the one being saved', async () => {
    mockedArticle.mockResolvedValue(article());
    mockedUpdate.mockResolvedValue(article({ title: 'Renamed' }));

    const store = useKbStore();
    await store.loadArticle(1);
    await store.saveArticle(1, { title: 'Renamed' });

    expect(store.selectedArticle?.title).toBe('Renamed');
  });
});

describe('togglePublished', () => {
  it('flips the published flag of the given article', async () => {
    mockedUpdate.mockResolvedValue(article({ isPublished: false }));

    const store = useKbStore();
    await store.togglePublished(summary({ isPublished: true }));

    expect(mockedUpdate).toHaveBeenCalledWith(1, { isPublished: false });
  });

  it('publishes a draft', async () => {
    mockedUpdate.mockResolvedValue(article({ isPublished: true }));

    const store = useKbStore();
    await store.togglePublished(summary({ isPublished: false }));

    expect(mockedUpdate).toHaveBeenCalledWith(1, { isPublished: true });
  });
});
