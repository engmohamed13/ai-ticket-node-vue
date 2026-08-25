# projectsetup — plan overview

Entry point for the **projectsetup** feature. Stories execute in order by their `NN` prefix.

Work item [1 — Project Setup & Bootstrap](../../stories/projectsetup/1/intake.md) is split into three sequential stories so each one is independently runnable and demoable. All three carry the same tracker id.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 01 | [01-story-backend-bootstrap-1.md](01-story-backend-bootstrap-1.md) | Backend bootstrap: Express + TypeScript API skeleton | 1 | — |
| 02 | [02-story-database-prisma-1.md](02-story-database-prisma-1.md) | PostgreSQL `CustomerCRM` and Prisma with an initial migration | 1 | Story 01 |
| 03 | [03-story-frontend-bootstrap-1.md](03-story-frontend-bootstrap-1.md) | Frontend bootstrap: Vue 3 + Vite shell wired to the API | 1 | Stories 01, 02 |

## Dependency notes

- **Strictly sequential.** Story 02 edits files created by Story 01 (`src/config/env.ts`, `src/app.ts`, `src/server.ts`, `src/routes/index.ts`, `src/services/health.service.ts`, `src/docs/openapi.ts`). Story 03 renders the health payload finalised by Story 02, so the API contract must be settled before the frontend work starts.
- **Shared contract:** the `{ success, message, data }` response envelope (Story 01, `backend/src/utils/apiResponse.ts`) and the `ApiHealth` / `DatabaseHealth` shapes (Stories 01–02, `backend/src/services/health.service.ts`). Story 03 mirrors these in `frontend/src/types/index.ts` — changing either side requires updating both.
- **Environment prerequisites** that gate the whole feature: **Node.js 24 LTS** (`node -v` reported `v22.20.0` on this machine on 2026-08-25) and a **running PostgreSQL 16** with a database named exactly `CustomerCRM` (`psql` was not on `PATH` on 2026-08-25). Both are called out in each story's `## Prerequisites`.
- **Style precedent:** the repository's previous Node + Vue implementation was deleted in commit `b1f0b9c` and remains readable from git history at commit `988127f`. Each story cites specific `git show 988127f:<path>` files to match. Those files are **not** in the working tree.
- **Out of scope across all three stories:** authentication/JWT, and the CRM domain model (`Customer`, `Ticket`, `Agent`, `User`). Story 02 creates only a bootstrap `system_info` table so the initial migration is real; domain modelling belongs to a later feature.
