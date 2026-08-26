import { Prisma } from '../generated/prisma/client';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export interface ListArticlesFilter {
  search?: string;
  categoryId?: number;
  /** `false` narrows to drafts; omitted returns both. Only ever set for a `kb:manage` caller. */
  isPublished?: boolean;
}

export interface CreateArticleInput {
  title: string;
  body: string;
  categoryId: number;
  summary?: string;
  isPublished?: boolean;
}

export interface UpdateArticleInput {
  title?: string;
  body?: string;
  categoryId?: number;
  summary?: string | null;
  isPublished?: boolean;
}

const articleInclude = {
  category: true,
  author: { select: { id: true, name: true } }
} as const satisfies Prisma.KbArticleInclude;

/** The list payload omits `body`: a search result page never needs the full markdown. */
const articleListSelect = {
  id: true,
  title: true,
  summary: true,
  categoryId: true,
  isPublished: true,
  viewCount: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  category: true,
  author: { select: { id: true, name: true } }
} as const satisfies Prisma.KbArticleSelect;

export const listCategories = () => prisma.kbCategory.findMany({ orderBy: { name: 'asc' } });

const assertCategoryExists = async (categoryId: number): Promise<void> => {
  const category = await prisma.kbCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError(404, `Knowledge base category ${categoryId} not found`);
};

/**
 * Free-text search across title, summary, and body. `mode: 'insensitive'` is Postgres ILIKE —
 * good enough for a mini-module's article count; no tsvector index is introduced here.
 * A blank or whitespace-only search contributes no clause at all rather than matching nothing.
 */
const buildArticleWhere = (filter: ListArticlesFilter): Prisma.KbArticleWhereInput => {
  const search = filter.search?.trim();
  return {
    ...(filter.isPublished === undefined ? {} : { isPublished: filter.isPublished }),
    ...(filter.categoryId === undefined ? {} : { categoryId: filter.categoryId }),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { summary: { contains: search, mode: 'insensitive' as const } },
            { body: { contains: search, mode: 'insensitive' as const } }
          ]
        }
      : {})
  };
};

export const listArticles = (filter: ListArticlesFilter = {}) =>
  prisma.kbArticle.findMany({
    where: buildArticleWhere(filter),
    select: articleListSelect,
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }]
  });

/**
 * `allowDraft` is the caller's `kb:manage` permission, resolved at the route layer. Without it
 * an unpublished article is a 404 rather than a 403 — a draft's existence is not something a
 * reader is told about.
 *
 * The view counter is only advanced on a published read, so an author previewing their own
 * draft (or re-reading it while editing) does not inflate the number the dashboard ranks on.
 */
export const getArticleById = async (id: number, options: { allowDraft?: boolean } = {}) => {
  const article = await prisma.kbArticle.findUnique({ where: { id }, include: articleInclude });
  if (!article || (!article.isPublished && !options.allowDraft)) {
    throw new AppError(404, `Article ${id} not found`);
  }

  if (!article.isPublished) return article;

  // Fire-and-forget: a failed counter bump must never fail the read itself.
  const updated = await prisma.kbArticle
    .update({ where: { id }, data: { viewCount: { increment: 1 } }, include: articleInclude })
    .catch(() => null);

  return updated ?? article;
};

export const createArticle = async (input: CreateArticleInput, authorId: number) => {
  await assertCategoryExists(input.categoryId);

  return prisma.kbArticle.create({
    data: {
      title: input.title,
      body: input.body,
      summary: input.summary ?? null,
      categoryId: input.categoryId,
      isPublished: input.isPublished ?? false,
      authorId
    },
    include: articleInclude
  });
};

export const updateArticle = async (id: number, input: UpdateArticleInput) => {
  const existing = await prisma.kbArticle.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, `Article ${id} not found`);
  if (input.categoryId !== undefined) await assertCategoryExists(input.categoryId);

  return prisma.kbArticle.update({
    where: { id },
    data: {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.body === undefined ? {} : { body: input.body }),
      ...(input.summary === undefined ? {} : { summary: input.summary }),
      ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
      ...(input.isPublished === undefined ? {} : { isPublished: input.isPublished })
    },
    include: articleInclude
  });
};

/** The dashboard's "most-read articles" panel (Story 21). Published articles only. */
export const listTopArticles = (limit: number) =>
  prisma.kbArticle.findMany({
    where: { isPublished: true },
    select: articleListSelect,
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    take: limit
  });
