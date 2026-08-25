# CustomerSupportCRM

A Customer Support CRM built with a Node.js + Express + TypeScript API, a Vue 3 + Vite frontend, and PostgreSQL via Prisma. This repository currently covers project setup and bootstrap: the API, the database connection, and a Vue shell that proves the full Vue → API → PostgreSQL chain through a live system health page.

## Prerequisites

- Node.js 24 LTS
- PostgreSQL 16 (or compatible)
- A PostgreSQL database named `CustomerCRM` — see [database/README.md](database/README.md)

## Run order

1. **Database** — create and migrate `CustomerCRM`. Follow [database/README.md](database/README.md).
2. **Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Serves the API at `http://localhost:3000`.
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Serves the app at `http://localhost:5173`.

## Demo script

1. Open `http://localhost:5173/health`. It shows API status `ok` and database status `up`.
2. Stop PostgreSQL, then click **Refresh** — the page shows an amber "API is reachable but the database is not" banner and database status `down`.
3. Restart PostgreSQL, then click **Refresh** — the page returns to the green, healthy state.

## Repository layout

- `backend/` — Express + TypeScript API, Prisma, PostgreSQL access.
- `frontend/` — Vue 3 + Vite + TypeScript client (Vue Router, Pinia, axios).
- `database/` — instructions for recreating the `CustomerCRM` database.
- `.squad/` — planning and story tracking for this project.
