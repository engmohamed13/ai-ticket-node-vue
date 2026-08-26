import { Request, Response } from 'express';
import { getAuth } from '../middleware/auth.middleware';
import {
  createArticle,
  getArticleById,
  listArticles,
  listCategories,
  updateArticle
} from '../services/kb.service';
import type { ListArticlesFilter } from '../services/kb.service';
import { ok } from '../utils/apiResponse';

/** Authors (and only authors) may see drafts. Everyone else gets the published set. */
const canManageKb = (req: Request): boolean => getAuth(req).permissions.includes('kb:manage');

export const listKbCategoriesHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(await listCategories()));
};

export const listKbArticlesHandler = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as { search?: string; categoryId?: number; includeDrafts?: boolean };
  // A reader is pinned to published articles. An author opts into drafts explicitly, so the
  // public article list stays the default even for staff.
  const isPublished = canManageKb(req) && query.includeDrafts ? undefined : true;
  const filter: ListArticlesFilter = {
    search: query.search,
    categoryId: query.categoryId,
    isPublished
  };
  res.json(ok(await listArticles(filter)));
};

export const getKbArticleHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await getArticleById(id, { allowDraft: canManageKb(req) })));
};

export const createKbArticleHandler = async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  const article = await createArticle(req.body, auth.userId);
  res.status(201).json(ok(article, 'Article created'));
};

export const updateKbArticleHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await updateArticle(id, req.body), 'Article updated'));
};
