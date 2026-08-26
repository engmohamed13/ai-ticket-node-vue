jest.mock('../db/prisma', () => ({
  prisma: {
    kbCategory: { findMany: jest.fn(), findUnique: jest.fn() },
    kbArticle: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() }
  }
}));

import request from 'supertest';
import app from '../app';
import { prisma } from '../db/prisma';
import { bearer } from './authTestHelper';

const mockedCategoryFindMany = prisma.kbCategory.findMany as jest.Mock;
const mockedCategoryFindUnique = prisma.kbCategory.findUnique as jest.Mock;
const mockedArticleFindMany = prisma.kbArticle.findMany as jest.Mock;
const mockedArticleFindUnique = prisma.kbArticle.findUnique as jest.Mock;
const mockedArticleCreate = prisma.kbArticle.create as jest.Mock;
const mockedArticleUpdate = prisma.kbArticle.update as jest.Mock;

/** A reader: every role holds `kb:read`, nobody but staff holds `kb:manage`. */
const readerBearer = () =>
  bearer({
    userId: 50,
    roleKey: 'CUSTOMER',
    customerId: 10,
    permissions: ['tickets:read', 'kb:read']
  });

const authorBearer = () =>
  bearer({
    userId: 7,
    roleKey: 'SUPPORT_AGENT',
    customerId: null,
    permissions: ['tickets:read', 'kb:read', 'kb:manage']
  });

const published = { id: 1, title: 'Cannot sign in', isPublished: true, viewCount: 4 };
const draft = { id: 2, title: 'Draft', isPublished: false, viewCount: 0 };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/kb/categories', () => {
  it('lists categories for any signed-in role', async () => {
    mockedCategoryFindMany.mockResolvedValue([{ id: 1, name: 'Getting Started' }]);

    const response = await request(app).get('/api/kb/categories').set('Authorization', readerBearer());

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it('401s without a token', async () => {
    const response = await request(app).get('/api/kb/categories');

    expect(response.status).toBe(401);
  });

  it('403s a token without kb:read', async () => {
    const response = await request(app)
      .get('/api/kb/categories')
      .set('Authorization', bearer({ permissions: ['tickets:read'] }));

    expect(response.status).toBe(403);
  });
});

describe('GET /api/kb/articles', () => {
  it('returns published articles only for a reader', async () => {
    mockedArticleFindMany.mockResolvedValue([published]);

    const response = await request(app).get('/api/kb/articles').set('Authorization', readerBearer());

    expect(response.status).toBe(200);
    expect(mockedArticleFindMany.mock.calls[0][0].where.isPublished).toBe(true);
  });

  it('passes the search term through to the query', async () => {
    mockedArticleFindMany.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/kb/articles?search=sign%20in')
      .set('Authorization', readerBearer());

    expect(response.status).toBe(200);
    expect(mockedArticleFindMany.mock.calls[0][0].where.OR).toHaveLength(3);
  });

  it('passes the category filter through to the query', async () => {
    mockedArticleFindMany.mockResolvedValue([]);

    await request(app).get('/api/kb/articles?categoryId=3').set('Authorization', readerBearer());

    expect(mockedArticleFindMany.mock.calls[0][0].where.categoryId).toBe(3);
  });

  it('lets an author include drafts', async () => {
    mockedArticleFindMany.mockResolvedValue([published, draft]);

    const response = await request(app)
      .get('/api/kb/articles?includeDrafts=true')
      .set('Authorization', authorBearer());

    expect(response.status).toBe(200);
    expect(mockedArticleFindMany.mock.calls[0][0].where.isPublished).toBeUndefined();
  });

  it('ignores includeDrafts from a caller without kb:manage', async () => {
    mockedArticleFindMany.mockResolvedValue([published]);

    await request(app).get('/api/kb/articles?includeDrafts=true').set('Authorization', readerBearer());

    expect(mockedArticleFindMany.mock.calls[0][0].where.isPublished).toBe(true);
  });

  it('400s an unknown query parameter', async () => {
    const response = await request(app)
      .get('/api/kb/articles?nope=1')
      .set('Authorization', readerBearer());

    expect(response.status).toBe(400);
  });
});

describe('GET /api/kb/articles/:id', () => {
  it('returns a published article to a reader', async () => {
    mockedArticleFindUnique.mockResolvedValue(published);
    mockedArticleUpdate.mockResolvedValue({ ...published, viewCount: 5 });

    const response = await request(app).get('/api/kb/articles/1').set('Authorization', readerBearer());

    expect(response.status).toBe(200);
    expect(response.body.data.viewCount).toBe(5);
  });

  it('404s a draft for a reader', async () => {
    mockedArticleFindUnique.mockResolvedValue(draft);

    const response = await request(app).get('/api/kb/articles/2').set('Authorization', readerBearer());

    expect(response.status).toBe(404);
  });

  it('returns a draft to an author', async () => {
    mockedArticleFindUnique.mockResolvedValue(draft);

    const response = await request(app).get('/api/kb/articles/2').set('Authorization', authorBearer());

    expect(response.status).toBe(200);
  });

  it('400s a non-numeric id', async () => {
    const response = await request(app).get('/api/kb/articles/abc').set('Authorization', readerBearer());

    expect(response.status).toBe(400);
  });
});

describe('POST /api/kb/articles', () => {
  it('creates an article for an author', async () => {
    mockedCategoryFindUnique.mockResolvedValue({ id: 3 });
    mockedArticleCreate.mockResolvedValue(draft);

    const response = await request(app)
      .post('/api/kb/articles')
      .set('Authorization', authorBearer())
      .send({ title: 'How to reset', body: 'Steps…', categoryId: 3 });

    expect(response.status).toBe(201);
    expect(mockedArticleCreate.mock.calls[0][0].data.authorId).toBe(7);
  });

  it('403s a reader', async () => {
    const response = await request(app)
      .post('/api/kb/articles')
      .set('Authorization', readerBearer())
      .send({ title: 'T', body: 'B', categoryId: 3 });

    expect(response.status).toBe(403);
    expect(mockedArticleCreate).not.toHaveBeenCalled();
  });

  it('400s a missing body field', async () => {
    const response = await request(app)
      .post('/api/kb/articles')
      .set('Authorization', authorBearer())
      .send({ title: 'T', categoryId: 3 });

    expect(response.status).toBe(400);
  });

  it('404s an unknown category', async () => {
    mockedCategoryFindUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/kb/articles')
      .set('Authorization', authorBearer())
      .send({ title: 'T', body: 'B', categoryId: 99 });

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/kb/articles/:id', () => {
  it('publishes a draft for an author', async () => {
    mockedArticleFindUnique.mockResolvedValue(draft);
    mockedArticleUpdate.mockResolvedValue({ ...draft, isPublished: true });

    const response = await request(app)
      .patch('/api/kb/articles/2')
      .set('Authorization', authorBearer())
      .send({ isPublished: true });

    expect(response.status).toBe(200);
    expect(response.body.data.isPublished).toBe(true);
  });

  it('403s a reader', async () => {
    const response = await request(app)
      .patch('/api/kb/articles/2')
      .set('Authorization', readerBearer())
      .send({ isPublished: true });

    expect(response.status).toBe(403);
    expect(mockedArticleUpdate).not.toHaveBeenCalled();
  });

  it('400s an empty update body', async () => {
    const response = await request(app)
      .patch('/api/kb/articles/2')
      .set('Authorization', authorBearer())
      .send({});

    expect(response.status).toBe(400);
  });
});
