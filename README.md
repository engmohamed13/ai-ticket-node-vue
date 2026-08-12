# ai-ticket-node-vue

A professional, minimal ticket management module built as a full-stack application. It features secure JWT authentication, ticket CRUD operations, and an interactive comments system.

---

## Repository Goals

This project serves as a reference implementation showcasing:
- **Consistent Business Domains**: Demonstrating how standard enterprise ticket management requirements map onto a specific technology stack.
- **AI-Collaborative Engineering**: Highlighting how an AI pair programmer and human engineer collaborate using a structured, state-driven workflow.
- **Modern Architecture Guidelines**: Following separation of concerns, strict typing, and clean database transaction management.

## AI Ticket Series

This repository is part of a series of AI-assisted implementations of the same Ticket Management System using different technology stacks.

- [ai-ticket-node-vue (Current Stack: Express, TypeScript, Vue 3, PostgreSQL, Prisma)](https://github.com/engmohamed13/ai-ticket-node-vue)
- [ai-ticket-fastapi-angular (Stack: FastAPI, Python, Angular, PostgreSQL, SQLAlchemy) - Coming Soon](#)
- [ai-ticket-dotnet-angular (Stack: ASP.NET Core, C#, Angular, PostgreSQL, EF Core) - Coming Soon](#)

---

## 1. Architecture Overview

The system follows a decoupled client-server architecture where the frontend communicates with the backend via a REST API, securing endpoints using JSON Web Tokens (JWT).

```mermaid
graph TD
    subgraph Frontend [Vue 3 Client]
        UI[Vue Views / Components]
        Router[Vue Router]
        APIClient[Axios Client]
    end

    subgraph Backend [Node.js + Express API Server]
        Middleware[Auth Middleware / JWT Verification]
        Controller[Controllers / Req Validation]
        Service[Services / Business Logic]
        Prisma[Prisma Client ORM]
    end

    subgraph Database [Storage Layer]
        PG[(PostgreSQL Database)]
    end

    UI --> Router
    Router --> APIClient
    APIClient -->|HTTPS + JWT Header| Middleware
    Middleware --> Controller
    Controller --> Service
    Service --> Prisma
    Prisma -->|SQL Queries| PG
```

---

## 2. Features Checklist

- [x] **JWT Authentication**: Secure user login with bcrypt hash verification and JSON Web Tokens.
- [x] **Ticket Management (CRUD)**:
  - [x] Create support tickets with title, description, status, and priority.
  - [x] View lists of support tickets with status badge colors.
  - [x] Search tickets by title or description.
  - [x] Edit and update ticket details.
  - [x] Delete support tickets.
- [x] **Comments System**: Add time-stamped comments to individual tickets, establishing an interactive discussion thread.
- [x] **Database Migration & Seeding**: Idempotent Prisma migrations and automatic admin user seed configuration.

---

## 3. Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express (v5.2)
- **Language**: TypeScript (v6.0)
- **ORM**: Prisma (v5.22)
- **Security**: jsonwebtoken, bcryptjs

### Frontend
- **Framework**: Vue 3 (Composition API)
- **Language**: TypeScript
- **Bundler**: Vite (v8.1)
- **HTTP Client**: Axios

### Database
- **Engine**: PostgreSQL

---

## 4. Folder Structure

```text
ai-ticket-node-vue/
├── .claude/                # Saved tasks backlog representing the AI workflow
├── backend/                # Node.js + Express API server
│   ├── prisma/             # Prisma schema, SQL migrations, and seeding scripts
│   │   ├── migrations/     # Automated SQL schema version history
│   │   ├── schema.prisma   # Prisma ORM schema models
│   │   └── seed.ts         # Initial database seeding script
│   ├── src/
│   │   ├── controllers/    # Express route controller handlers
│   │   ├── middleware/     # JWT authentication filter
│   │   ├── routes/         # Express endpoint definitions
│   │   ├── services/       # Database interactions and business logic
│   │   ├── index.ts        # Express application entrypoint
│   │   └── verify-db.ts    # Database connection test utility
│   ├── package.json        # Backend dependencies & metadata
│   └── tsconfig.json       # TypeScript configuration
├── database/               # Exported raw SQL databases (for non-Prisma setups)
│   ├── README.md           # Database setup instructions
│   ├── schema.sql          # Full database DDL structure
│   └── seed.sql            # Idempotent demo admin user seed queries
├── frontend/               # Vue 3 client application
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── components/     # Shared Vue UI widgets
│   │   ├── router/         # Vue routing setup and auth guards
│   │   ├── services/       # HTTP connection services (Axios client)
│   │   ├── views/          # Routed page views (Login, Board, Detail)
│   │   ├── App.vue         # Main Vue application component
│   │   └── main.ts         # Frontend application startup scripts
│   ├── package.json        # Frontend dependencies & metadata
│   └── vite.config.ts      # Vite configuration file
├── LICENSE                 # MIT License details
├── CONTRIBUTING.md         # Open-source contributing guidelines
└── CODE_OF_CONDUCT.md      # Contributor Covenant Code of Conduct
```

---

## 5. Installation & Onboarding

### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/engmohamed13/ai-ticket-node-vue.git
cd ai-ticket-node-vue
```

---

### Step 2: Configure Backend Environment Variables
Navigate to the `backend/` directory:
```bash
cd backend
cp .env.example .env
```
Open `.env` and enter your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ticketdb?schema=public"
JWT_SECRET="generate-a-strong-custom-jwt-secret-key"
PORT=3000
```

---

### Step 3: Setup the Database
You can set up the PostgreSQL database in one of two ways:

#### Option A: Using Prisma Migrations (Recommended)
Run these commands in the `backend/` folder:
```bash
# Install dependencies
npm install

# Run database migrations to construct the schema
npx prisma migrate dev --name init

# Seed the database with the default demo user
npm run seed
```

#### Option B: Using Raw SQL (Fallback)
If you prefer not to use Prisma CLI, follow the instructions in the [database/README.md](database/README.md) file to import `database/schema.sql` and `database/seed.sql` directly into your local PostgreSQL instance.

---

### Step 4: Run the Backend API Server
Start the API server in development mode:
```bash
npm run dev
```
The server will start on port `3000` (e.g. `http://localhost:3000`).
You can verify database connectivity by running:
```bash
npx ts-node src/verify-db.ts
```

---

### Step 5: Setup and Launch the Frontend Client
Open a new terminal window, navigate to the `frontend/` directory, and start Vite's local dev server:
```bash
cd frontend
npm install
npm run dev
```
The frontend application will boot and display the local network URL (typically `http://localhost:5173`).

---

## 6. Demo Account Credentials

To login and test the application features, use the default seeded account:
- **Email**: `admin@example.com`
- **Password**: `Password123!`

## 7. Running Automated Tests

Both the backend and frontend modules have automated test suites.

### Backend Tests (Jest + Supertest)
The backend test suite covers authentication, ticket creation, parameter validation, search, and status transition rules.
To run the backend tests:
```bash
cd backend
npm test
```

### Frontend Tests (Vitest)
The frontend test suite covers component mounting, search inputs, status transition buttons, and empty/error state layouts.
To run the frontend tests:
```bash
cd frontend
npm test
```

---

## 8. Build Instructions

### Backend Build
To compile the TypeScript backend into production-ready JavaScript code:
```bash
cd backend
npm run build
```
This outputs compiled files into `/backend/dist/`. To launch the compiled server:
```bash
npm start
```

### Frontend Build
To compile the Vue 3 application into optimized static assets:
```bash
cd frontend
npm run build
```
This builds static artifacts into `/frontend/dist/` which can be served by any static host or proxy server (like Nginx).

---

## 9. API Contract & Status Lifecycle

The backend API exposes the following endpoints (all routes except login require a valid JWT token in the `Authorization: Bearer <token>` header):

### Authentication
* **POST `/auth/login`**: Logs in the default admin user and returns a JWT token.

### Tickets Management
* **GET `/tickets`**: Lists all tickets. Accepts an optional `?search=` query parameter to filter tickets by title or description (case-insensitive).
* **POST `/tickets`**: Creates a new ticket. Validates that `priority` is one of `Low`, `Medium`, `High`.
* **GET `/tickets/:id`**: Retrieves a single ticket by its ID.
* **PUT `/tickets/:id`**: Updates ticket fields. Validates status transitions and priority/status values.
* **DELETE `/tickets/:id`**: Deletes a ticket (cascade deletes all nested comments).
* **PATCH `/tickets/:id/status`**: Updates only the status of a ticket.

### Ticket Status Lifecycle Rules
The system enforces a strict linear ticket lifecycle. Status values are limited to: `Open`, `In Progress`, and `Closed`.
Allowed transitions:
* **`Open` -> `In Progress`**: Allowed when beginning work on a ticket.
* **`In Progress` -> `Closed`**: Allowed when resolving the ticket.

Any other transitions (e.g. `Closed` -> `Open` or skipping straight from `Open` -> `Closed`) are rejected with **HTTP 400 Bad Request**.

### Comments Management
* **POST `/tickets/:id/comments`**: Adds a timestamped comment to a ticket.
* **GET `/tickets/:id/comments`**: Retrieves all comments for a ticket.

---

## 10. AI-Assisted Development Workflow

This project preserves the historical **`.claude/`** directory. It contains backlog task files (such as `task-001.md`, `task-002.md`, etc.) outlining the sequential, state-driven backlog implemented by the AI assistant during development. 

This workflow follows:
1. **Context-first coding**: Storing project rules under `.claude/context/` and `.claude/standards/`.
2. **Atomic Step Progression**: Writing small, specific tasks, checking off requirements iteratively, and executing builds between changes.
3. **No-regression checks**: Performing regression checks and logs review at each step.

You can inspect the `.claude/` folder to trace the full development timeline of this application.

---

## 11. Week 4 Documentation

The following documentation files track the implementation details, AI usage log, and requirement verification checklist for the Week 4 Tickets Mini Module:
- [AI Usage Log](docs/ai-usage.md)
- [Delivery Checklist](docs/delivery-checklist.md)

---

## 12. Future Improvements (Roadmap)

To expand on this portfolio template, planned future extensions include:
- **Multi-Role RBAC**: Implementing roles (Admin, Agent, Customer) with distinct UI layouts.
- **File Uploads**: Attaching screenshots and files to tickets using S3 or local storage.
- **Pagination & Advanced Filtering**: Enhancing backend query performance and frontend table pagination.
- **JWT Refresh Tokens**: Implementing cookie-stored session refresh flows.

---

## 13. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
