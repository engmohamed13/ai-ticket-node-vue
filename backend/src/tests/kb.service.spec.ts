jest.mock('../db/prisma', () => ({
  prisma: {
    kbCategory: { findMany: jest.fn(), findUnique: jest.fn() },
    kbArticle: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() }
  }
}));

import { prisma } from '../db/prisma';
import {
  createArticle,
  getArticleById,
  listArticles,
  listTopArticles,
  updateArticle
} from '../services/kb.service';

const mockedCategoryFindUnique = prisma.kbCategory.findUnique as jest.Mock;
const mockedArticleFindMany = prisma.kbArticle.findMany as jest.Mock;
const mockedArticleFindUnique = prisma.kbArticle.findUnique as jest.Mock;
const mockedArticleCreate = prisma.kbArticle.create as jest.Mock;
const mockedArticleUpdate = prisma.kbArticle.update as jest.Mock;

const published = { id: 1, title: 'Cannot sign in', isPublished: true, viewCount: 4 };
const draft = { id: 2, title: 'Work in progress', isPublished: false, viewCount: 0 };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listArticles', () => {
  it('adds no clause at all when no filter is supplied', async () => {
    mockedArticleFindMany.mockResolvedValue([]);

    await listArticles();

    expect(mockedArticleFindMany.mock.calls[0][0].where).toEqual({});
  });

  it('narrows to published articles when asked', async () => {
    mockedArticleFindMany.mockResolvedValue([]);

    await listArticles({ isPublished: true });

    expect(mockedArticleFindMany.mock.calls[0][0].where).toEqual({ isPublished: true });
  });

  it('searches title, summary, and body case-insensitively', async () => {
    mockedArticleFindMany.mockResolvedValue([]);

    await listArticles({ search: 'sign in' });

    expect(mockedArticleFindMany.mock.calls[0][0].where.OR).toEqual([
      { title: { contains: 'sign in', mode: 'insensitive' } },
      { summary: { contains: 'sign in', mode: 'insensitive' } },
      { body: { contains: 'sign in', mode: 'insensitive' } }
    ]);
  });

  it('ignores a whitespace-only search rather than matching nothing', async () => {
    mockedArticleFindMany.mockResolvedValue([]);

    await listArticles({ search: '   ' });

    expect(mockedArticleFindMany.mock.calls[0][0].where.OR).toBeUndefined();
  });

  it('combines a category filter with a search', async () => {
    mockedArticleFindMany.mockResolvedValue([]);

    await listArticles({ search: 'billing', categoryId: 3, isPublished: true });

    const where = mockedArticleFindMany.mock.calls[0][0].where;
    expect(where.categoryId).toBe(3);
    expect(where.isPublished).toBe(true);
    expect(where.OR).toHaveLength(3);
  });

  it('never selects the markdown body for a list row', async () => {
    mockedArticleFindMany.mockResolvedValue([]);

    await listArticles();

    expect(mockedArticleFindMany.mock.calls[0][0].select.body).toBeUndefined();
    expect(mockedArticleFindMany.mock.calls[0][0].select.title).toBe(true);
  });
});

describe('getArticleById', () => {
  it('returns a published article and increments its view count', async () => {
    mockedArticleFindUnique.mockResolvedValue(published);
    mockedArticleUpdate.mockResolvedValue({ ...published, viewCount: 5 });

    const article = await getArticleById(1);

    expect(mockedArticleUpdate.mock.calls[0][0].data).toEqual({ viewCount: { increment: 1 } });
    expect(article.viewCount).toBe(5);
  });

  it('still returns the article when the counter bump fails', async () => {
    mockedArticleFindUnique.mockResolvedValue(published);
    mockedArticleUpdate.mockRejectedValue(new Error('db down'));

    await expect(getArticleById(1)).resolves.toMatchObject({ id: 1 });
  });

  it('404s an unpublished draft for a reader', async () => {
    mockedArticleFindUnique.mockResolvedValue(draft);

    await expect(getArticleById(2)).rejects.toMatchObject({ status: 404 });
  });

  it('returns a draft to an author, without touching the view count', async () => {
    mockedArticleFindUnique.mockResolvedValue(draft);

    await expect(getArticleById(2, { allowDraft: true })).resolves.toMatchObject({ id: 2 });
    expect(mockedArticleUpdate).not.toHaveBeenCalled();
  });

  it('404s an article that does not exist', async () => {
    mockedArticleFindUnique.mockResolvedValue(null);

    await expect(getArticleById(99, { allowDraft: true })).rejects.toMatchObject({ status: 404 });
  });
});

describe('createArticle', () => {
  it('defaults a new article to an unpublished draft', async () => {
    mockedCategoryFindUnique.mockResolvedValue({ id: 3 });
    mockedArticleCreate.mockResolvedValue(draft);

    await createArticle({ title: 'T', body: 'B', categoryId: 3 }, 7);

    expect(mockedArticleCreate.mock.calls[0][0].data).toEqual({
      title: 'T',
      body: 'B',
      summary: null,
      categoryId: 3,
      isPublished: false,
      authorId: 7
    });
  });

  it('publishes immediately when asked', async () => {
    mockedCategoryFindUnique.mockResolvedValue({ id: 3 });
    mockedArticleCreate.mockResolvedValue(published);

    await createArticle({ title: 'T', body: 'B', categoryId: 3, isPublished: true }, 7);

    expect(mockedArticleCreate.mock.calls[0][0].data.isPublished).toBe(true);
  });

  it('404s an unknown category rather than creating an orphan', async () => {
    mockedCategoryFindUnique.mockResolvedValue(null);

    await expect(createArticle({ title: 'T', body: 'B', categoryId: 99 }, 7)).rejects.toMatchObject({
      status: 404
    });
    expect(mockedArticleCreate).not.toHaveBeenCalled();
  });
});

describe('updateArticle', () => {
  it('sends only the fields that were supplied', async () => {
    mockedArticleFindUnique.mockResolvedValue(draft);
    mockedArticleUpdate.mockResolvedValue({ ...draft, isPublished: true });

    await updateArticle(2, { isPublished: true });

    expect(mockedArticleUpdate.mock.calls[0][0].data).toEqual({ isPublished: true });
  });

  it('clears the summary on an explicit null', async () => {
    mockedArticleFindUnique.mockResolvedValue(draft);
    mockedArticleUpdate.mockResolvedValue(draft);

    await updateArticle(2, { summary: null });

    expect(mockedArticleUpdate.mock.calls[0][0].data).toEqual({ summary: null });
  });

  it('404s an article that does not exist', async () => {
    mockedArticleFindUnique.mockResolvedValue(null);

    await expect(updateArticle(99, { title: 'X' })).rejects.toMatchObject({ status: 404 });
  });

  it('validates a new category before moving the article to it', async () => {
    mockedArticleFindUnique.mockResolvedValue(draft);
    mockedCategoryFindUnique.mockResolvedValue(null);

    await expect(updateArticle(2, { categoryId: 99 })).rejects.toMatchObject({ status: 404 });
    expect(mockedArticleUpdate).not.toHaveBeenCalled();
  });
});

describe('listTopArticles', () => {
  it('ranks published articles by view count', async () => {
    mockedArticleFindMany.mockResolvedValue([]);

    await listTopArticles(5);

    const args = mockedArticleFindMany.mock.calls[0][0];
    expect(args.where).toEqual({ isPublished: true });
    expect(args.orderBy[0]).toEqual({ viewCount: 'desc' });
    expect(args.take).toBe(5);
  });
});
