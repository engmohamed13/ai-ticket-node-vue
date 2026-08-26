# Story 18 — Knowledge Base: data model & APIs (Story: 6)

## Prerequisites

- Story 15 completed: [../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md](../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md). Ticket system with categories is in place (provides precedent for category pattern).
- Story 09 completed: [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md). User/role/permission system is established.
- Story 10 completed: [../customermanagement/10-story-customer-data-model-4.md](../customermanagement/10-story-customer-data-model-4.md). Attachment system established as a reference for file storage pattern (KB articles may include file attachments).
- A running PostgreSQL server with `CustomerCRM` database and migrations applied through Story 15.

---

## Story Goal

Build a knowledge base system where agents/managers author FAQ articles and help documentation, organized by categories with full-text search capabilities. This enables customers and agents to self-serve common questions and reduces support ticket volume.

Outcomes:

1. New `KnowledgeBaseArticle` model with title, content (markdown), category, publish status, view count, author, timestamps.
2. New `KnowledgeBaseCategory` model for organizing articles (e.g., "Getting Started", "Technical Issues", "Billing").
3. New `kbArticle:read` permission for viewing articles (all users); new `kbArticle:manage` permission for creating/editing (agents/managers only).
4. Five new backend APIs: `GET /api/kb/articles` (list with search/category filter), `GET /api/kb/articles/:id` (detail + increment view count), `POST /api/kb/articles` (create, gated on `kbArticle:manage`), `PATCH /api/kb/articles/:id` (update, gated on `kbArticle:manage`), `GET /api/kb/categories` (list all categories).
5. Agents and above gain `kbArticle:manage` permission; all users (including customers) gain `kbArticle:read`.
6. Real migration applied to `CustomerCRM`; seed data includes 2–3 demo articles in 2 demo categories.

**Not in scope for this story:** article versioning/history, comments/ratings on articles, article recommendation algorithm, rich-text editor (articles are markdown-only in this mini-module), attachments to articles, draft preview (only published articles are listed), and scheduled publishing.

---

## Context — Read These Files First

1. [.squad/stories/customerportalknowledgebasemanagementdashboard/6/intake.md](../../stories/customerportalknowledgebasemanagementdashboard/6/intake.md) — `## Description` lists "Knowledge Base", "FAQs", "Knowledge articles", "Search", "Categories". This story delivers the backend data model and APIs.

2. `backend/prisma/schema.prisma` (lines 124–133) — the `TicketCategory` model. Story 18 mirrors this pattern exactly for `KnowledgeBaseCategory` (id, name, created_at, one-to-many articles).

3. `backend/src/services/ticket.service.ts` — read task 1 (prisma queries, filtering, permission checks, response DTOs) and task 5 (service functions pattern). Story 18 follows the same structure for KB articles.

4. `backend/src/auth/permissions.ts` — currently has `'tickets:read'`, `'customers:manage'`, etc. Task 2 adds `'kbArticle:read'` and `'kbArticle:manage'`.

5. `backend/src/auth/roles.ts` — SUPPORT_AGENT, SUPPORT_SUPERVISOR, CRM_MANAGER get `'kbArticle:manage'` (they author articles). CUSTOMER, REPORTING_USER, and all roles get `'kbArticle:read'` (universal article viewing).

6. `backend/src/routes/` — existing route patterns (Story 14, 09, etc.). Story 18 creates `kb.routes.ts` following the same structure.

---

## Implementation tasks

### 1 — Prisma schema: add `KnowledgeBaseCategory` and `KnowledgeBaseArticle`

**File: `backend/prisma/schema.prisma`**

Add before or after the `TicketCategory` model (around line 124):

```prisma
/// A knowledge base article category (e.g., "Getting Started", "Technical Issues").
/// Owned by the organization; all articles use the same category list.
model KnowledgeBaseCategory {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  description String?
  createdAt DateTime @default(now())

  articles  KnowledgeBaseArticle[]

  @@map("kb_categories")
}

/// A knowledge base article: a help document or FAQ authored by an agent.
/// `isPublished` controls visibility (only published articles appear in the API list).
/// `viewCount` tracks popularity (incremented on each GET /api/kb/articles/:id).
/// Content is markdown; the frontend renders it.
model KnowledgeBaseArticle {
  id          Int                     @id @default(autoincrement())
  title       String
  content     String                  // markdown
  categoryId  Int
  isPublished Boolean                 @default(false)
  viewCount   Int                     @default(0)
  authorId    Int
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  category    KnowledgeBaseCategory   @relation(fields: [categoryId], references: [id])
  author      User                    @relation(fields: [authorId], references: [id])

  @@index([categoryId])
  @@index([authorId])
  @@index([isPublished])
  @@map("kb_articles")
}
```

Add a relation to the `User` model (lines 273–301) — after the existing ticket-related relations, add:

```prisma
  kbArticles  KnowledgeBaseArticle[]
```

### 2 — Add KB permissions

**File: `backend/src/auth/permissions.ts`**

Add two new entries to the `PERMISSIONS` tuple:

```ts
'kbArticle:manage',  // agents/managers can create/edit KB articles
'kbArticle:read',    // everyone can view published KB articles
```

### 3 — Grant KB permissions to roles

**File: `backend/src/auth/roles.ts`**

- **SUPPORT_AGENT**, **SUPPORT_SUPERVISOR**, **CRM_MANAGER**: Add `'kbArticle:manage'` to all three.
- **CUSTOMER**, **REPORTING_USER**: Already have or should have `'kbArticle:read'`.
- Ensure all six roles have `'kbArticle:read'` (universal access).

### 4 — Add KB types

**File: `backend/src/kb/types.ts`** (new file)

```ts
export interface KnowledgeBaseArticleDto {
  id: number;
  title: string;
  content: string;
  category: { id: number; name: string };
  isPublished: boolean;
  viewCount: number;
  author: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseCategoryDto {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface CreateArticlePayload {
  title: string;           // required, max 255 chars
  content: string;         // required, markdown
  categoryId: number;      // required
  isPublished?: boolean;   // optional, defaults to false
}

export interface UpdateArticlePayload {
  title?: string;
  content?: string;
  categoryId?: number;
  isPublished?: boolean;
}
```

### 5 — Add KB service functions

**Create file: `backend/src/services/kb.service.ts`**

```ts
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';
import type {
  CreateArticlePayload,
  KnowledgeBaseArticleDto,
  KnowledgeBaseCategoryDto,
  UpdateArticlePayload
} from '../kb/types';

export const getCategories = async (): Promise<KnowledgeBaseCategoryDto[]> => {
  const categories = await prisma.knowledgeBaseCategory.findMany({
    orderBy: { name: 'asc' }
  });
  return categories.map(toKbCategoryDto);
};

export const getArticles = async (filters?: {
  search?: string;
  categoryId?: number;
  isPublished?: boolean;
}): Promise<KnowledgeBaseArticleDto[]> => {
  const where: any = {};
  if (filters?.isPublished !== undefined) where.isPublished = filters.isPublished;
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { content: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const articles = await prisma.knowledgeBaseArticle.findMany({
    where,
    include: { category: true, author: true },
    orderBy: { createdAt: 'desc' }
  });

  return articles.map(toKbArticleDto);
};

export const getArticle = async (id: number): Promise<KnowledgeBaseArticleDto> => {
  const article = await prisma.knowledgeBaseArticle.findUnique({
    where: { id },
    include: { category: true, author: true }
  });

  if (!article) throw new AppError(404, 'Article not found');
  if (!article.isPublished) throw new AppError(403, 'This article is not published');

  // Increment view count asynchronously (fire and forget)
  prisma.knowledgeBaseArticle.update({
    where: { id },
    data: { viewCount: { increment: 1 } }
  }).catch(() => {}); // ignore errors on view count increment

  return toKbArticleDto(article);
};

export const createArticle = async (payload: CreateArticlePayload, authorId: number): Promise<KnowledgeBaseArticleDto> => {
  const category = await prisma.knowledgeBaseCategory.findUnique({
    where: { id: payload.categoryId }
  });

  if (!category) throw new AppError(404, 'Category not found');

  const article = await prisma.knowledgeBaseArticle.create({
    data: {
      title: payload.title,
      content: payload.content,
      categoryId: payload.categoryId,
      isPublished: payload.isPublished ?? false,
      authorId
    },
    include: { category: true, author: true }
  });

  return toKbArticleDto(article);
};

export const updateArticle = async (id: number, payload: UpdateArticlePayload, userId: number): Promise<KnowledgeBaseArticleDto> => {
  const article = await prisma.knowledgeBaseArticle.findUnique({ where: { id } });

  if (!article) throw new AppError(404, 'Article not found');

  // Only the author or an admin can edit (for now, all managers can edit anyone's articles — simple rule for mini-module)
  // In a full app, check `userId === article.authorId || isAdmin(userId)`

  const updated = await prisma.knowledgeBaseArticle.update({
    where: { id },
    data: {
      title: payload.title,
      content: payload.content,
      categoryId: payload.categoryId,
      isPublished: payload.isPublished
    },
    include: { category: true, author: true }
  });

  return toKbArticleDto(updated);
};

// Helper DTOs
const toKbArticleDto = (article: any): KnowledgeBaseArticleDto => ({
  id: article.id,
  title: article.title,
  content: article.content,
  category: { id: article.category.id, name: article.category.name },
  isPublished: article.isPublished,
  viewCount: article.viewCount,
  author: { id: article.author.id, name: article.author.name },
  createdAt: article.createdAt.toISOString(),
  updatedAt: article.updatedAt.toISOString()
});

const toKbCategoryDto = (category: any): KnowledgeBaseCategoryDto => ({
  id: category.id,
  name: category.name,
  description: category.description,
  createdAt: category.createdAt.toISOString()
});
```

### 6 — Add KB controller

**Create file: `backend/src/controllers/kb.controller.ts`**

```ts
import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import * as kbService from '../services/kb.service';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  const categories = await kbService.getCategories();
  res.json({ data: categories });
};

export const getArticles = async (req: Request, res: Response): Promise<void> => {
  const { search, categoryId } = req.query;
  const articles = await kbService.getArticles({
    search: search as string | undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    isPublished: true // customers/agents only see published articles via this endpoint
  });
  res.json({ data: articles });
};

export const getArticle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const article = await kbService.getArticle(Number(id));
  res.json({ data: article });
};

export const createArticle = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.can('kbArticle:manage')) {
    throw new AppError(403, 'Not authorized to create KB articles');
  }

  const article = await kbService.createArticle(req.body, (req.user as any).id);
  res.status(201).json({ data: article, message: 'Article created' });
};

export const updateArticle = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.can('kbArticle:manage')) {
    throw new AppError(403, 'Not authorized to edit KB articles');
  }

  const { id } = req.params;
  const article = await kbService.updateArticle(Number(id), req.body, (req.user as any).id);
  res.json({ data: article, message: 'Article updated' });
};
```

### 7 — Add KB routes

**Create file: `backend/src/routes/kb.routes.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';
import * as kbController from '../controllers/kb.controller';

const router = Router();

const createArticleSchema = z.object({
  body: z.object({
    title: z.string().max(255),
    content: z.string(),
    categoryId: z.number().int().positive(),
    isPublished: z.boolean().optional()
  })
});

const updateArticleSchema = z.object({
  body: z.object({
    title: z.string().max(255).optional(),
    content: z.string().optional(),
    categoryId: z.number().int().positive().optional(),
    isPublished: z.boolean().optional()
  })
});

// Public: list categories
router.get('/kb/categories', kbController.getCategories);

// Public: list published articles (with search/filter)
router.get('/kb/articles', kbController.getArticles);

// Public: get article detail and increment view count
router.get('/kb/articles/:id', kbController.getArticle);

// Protected: create article
router.post(
  '/kb/articles',
  authenticate,
  validate(createArticleSchema),
  kbController.createArticle
);

// Protected: update article
router.patch(
  '/kb/articles/:id',
  authenticate,
  validate(updateArticleSchema),
  kbController.updateArticle
);

export default router;
```

### 8 — Update app routes

**File: `backend/src/app.ts`**

Add the KB router:

```ts
import kbRouter from './routes/kb.routes';

// ... existing route registrations ...

app.use('/api', kbRouter);
```

### 9 — Database migration

Run:

```bash
npx prisma migrate dev --name add_knowledge_base_models
```

Commit the generated migration.

### 10 — Seed KB data

**File: `backend/prisma/seed.ts`**

Add after the ticket seed data:

```ts
// Seed KB categories
const kbCategory1 = await prisma.knowledgeBaseCategory.upsert({
  where: { name: 'Getting Started' },
  update: {},
  create: {
    name: 'Getting Started',
    description: 'Introductory guides for new customers'
  }
});

const kbCategory2 = await prisma.knowledgeBaseCategory.upsert({
  where: { name: 'Technical Support' },
  update: {},
  create: {
    name: 'Technical Support',
    description: 'Solutions for technical issues'
  }
});

// Seed KB articles (published)
await prisma.knowledgeBaseArticle.upsert({
  where: { id: 1 }, // or use a unique compound key
  update: {},
  create: {
    title: 'How to Create Your First Ticket',
    content: '# How to Create Your First Ticket\n\n1. Log in to your account\n2. Click "Submit a ticket"\n3. Fill in the subject and description\n4. Click "Submit"\n\nOur team will respond within 24 hours.',
    categoryId: kbCategory1.id,
    isPublished: true,
    authorId: demoAgent.id // use the seeded support agent user
  }
});

await prisma.knowledgeBaseArticle.upsert({
  where: { id: 2 },
  update: {},
  create: {
    title: 'Troubleshooting Connection Issues',
    content: '# Troubleshooting Connection Issues\n\n## Check Your Internet\n- Ensure you have a stable internet connection\n\n## Clear Browser Cache\n- Clear cookies and temporary files\n\n## Try Another Browser\n- Test in a different browser to rule out extension conflicts',
    categoryId: kbCategory2.id,
    isPublished: true,
    authorId: demoAgent.id
  }
});
```

---

## Edge Cases & Failure Modes

- **Accessing `/api/kb/articles` as an unauthenticated user.** The endpoint is public (no `authenticate` middleware), so it returns all published articles without authentication.

- **Attempting to view an unpublished article by ID (`GET /api/kb/articles/42` when article 42 is unpublished).** The service throws `403 "This article is not published"` so only authors/editors can see drafts.

- **Editing an article that doesn't exist (`PATCH /api/kb/articles/999999`).** The service throws `404 "Article not found"`.

- **Submitting an article with a non-existent category.** `createArticle` queries the category first; if missing, throws `404 "Category not found"`. The article is not created.

- **Full-text search with special characters or empty string.** Prisma's `contains` with `insensitive` mode handles most cases safely. An empty search string (`search: ""`) is falsy in JavaScript, so the filter is skipped (not applied to the query).

- **View count increment fails silently.** The async update is a fire-and-forget with a `.catch()` that ignores errors, so a database error does not crash the request. The article detail still returns successfully.

- **An agent/manager creates an article but the `authorId` is incorrect.** The controller passes `req.user?.id` as the author, so it's always correct (cannot be spoofed via request body).

- **Two users edit the same article concurrently (e.g., both send `PATCH` at the same time).** Prisma serializes the updates; the last update wins. No conflict detection is implemented (out of scope for mini-module).

---

## Test Plan

1. **Service tests** (`backend/src/tests/kb.service.spec.ts`):
   - `getCategories` returns all categories sorted by name.
   - `getArticles` with no filters returns all published articles.
   - `getArticles` with `search: "troubleshooting"` returns only matching articles.
   - `getArticles` with `categoryId: 1` returns only articles in that category.
   - `getArticle` on a published article returns the article and increments `viewCount`.
   - `getArticle` on an unpublished article throws 403.
   - `createArticle` succeeds and returns a DTO with `isPublished: false` (or `true` if explicitly set).
   - `updateArticle` updates the specified fields and leaves others unchanged.

2. **Route tests** (`backend/src/tests/kb.spec.ts`):
   - `GET /api/kb/categories` returns all categories (no auth required).
   - `GET /api/kb/articles?search=help` filters correctly.
   - `POST /api/kb/articles` without `kbArticle:manage` returns 403.
   - `POST /api/kb/articles` with permission succeeds (201).
   - `PATCH /api/kb/articles/1` without permission returns 403.

3. **Database migration test**: `npm run db:seed` completes; inspect with `npx prisma studio` to confirm 2 articles are seeded.

---

## Verification Steps

**Backend builds:** `npm run build` exits 0 from `backend/`.

**Tests pass:** `npm test` exits 0 from `backend/`, including KB specs.

**Database migration:** `npm run db:seed` completes; `npx prisma studio` shows `kb_categories` table with 2 entries and `kb_articles` with 2 published articles.

**Dev smoke test:**
1. `npm run dev` in backend.
2. Call `GET /api/kb/categories` and confirm 2 categories are returned.
3. Call `GET /api/kb/articles` and confirm 2 articles are returned with correct title, excerpt of content, category, author, and `viewCount: 0` or `1` (depending on API call order).
4. Call `GET /api/kb/articles/1` twice and confirm `viewCount` increments each time.
5. Call `GET /api/kb/articles?search=connection` and confirm only the "Troubleshooting Connection Issues" article is returned.
6. Log in as a support agent and call `POST /api/kb/articles` with valid payload; confirm the article is created with `isPublished: false` (draft).
7. Call `GET /api/kb/articles` and confirm the draft is NOT returned (only published articles).
8. Call `PATCH /api/kb/articles/{draftId}` with `isPublished: true` and confirm it becomes visible in the list.
9. As a customer, call `POST /api/kb/articles` without permission; confirm it returns `403`.

---

## Done Criteria

- [ ] `KnowledgeBaseCategory` and `KnowledgeBaseArticle` Prisma models created with correct fields and relations.
- [ ] `kbArticle:read` and `kbArticle:manage` permissions exist; roles are updated.
- [ ] `GET /api/kb/categories`, `GET /api/kb/articles`, `GET /api/kb/articles/:id`, `POST /api/kb/articles`, `PATCH /api/kb/articles/:id` endpoints are implemented.
- [ ] Article list filters by search and category; full-text search works on title and content.
- [ ] View count increments on detail fetch.
- [ ] Only published articles appear in the public list.
- [ ] Database migration creates tables; seed data includes 2 categories and 2 articles.
- [ ] All backend tests pass; `npm run build` and `npm run typecheck` exit 0.
- [ ] Manual smoke test confirms all endpoints work as described.
