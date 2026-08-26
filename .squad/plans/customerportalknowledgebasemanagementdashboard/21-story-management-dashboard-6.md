# Story 21 — Management Dashboard: KPIs, charts, filtering (Story: 6)

## Prerequisites

- Story 15 completed: [../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md](../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md). Ticket system with all statuses and metrics is live.
- Story 16 completed: [16-story-customer-portal-data-model-6.md](16-story-customer-portal-data-model-6.md). Feedback system is live; customer feedback data exists.
- Story 20 completed: [20-story-notifications-system-6.md](20-story-notifications-system-6.md). Notification events (optional but enhances dashboard).
- Story 10 completed: [../customermanagement/10-story-customer-data-model-4.md](../customermanagement/10-story-customer-data-model-4.md). Customer model for customer satisfaction metrics.
- Story 09 completed: [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md). User/role system; dashboard is gated on `CRM_MANAGER` role.

---

## Story Goal

Build a management dashboard showing KPIs, trends, and actionable insights for CRM managers and supervisors. Outcomes:

1. `/dashboard/management` route displays:
   - **Summary cards:** total tickets, open tickets, resolved tickets, overdue tickets, customer satisfaction (avg feedback rating).
   - **Ticket status distribution** chart (pie or bar).
   - **Priority distribution** chart.
   - **Ticket creation trend** chart (tickets by week over last 8 weeks).
   - **Agent workload** table: agents sorted by ticket count (assigned, open, pending, overdue).
   - **Top KB articles** by view count.
   - **Filters:** date range, status filter, priority filter, agent filter.
   
2. New backend endpoints:
   - `GET /api/dashboard/tickets-summary` — ticket counts by status, overdue count.
   - `GET /api/dashboard/customer-satisfaction` — average feedback rating.
   - `GET /api/dashboard/ticket-trends` — ticket creation by week.
   - `GET /api/dashboard/agent-workload` — agent-ticket metrics.
   - `GET /api/dashboard/kb-top-articles` — most-viewed KB articles.

3. All endpoints support optional date-range query params (`startDate`, `endDate`), status/priority filters.

4. Dashboard is gated on `CRM_MANAGER` role or `reporting:read` permission (new permission).

**Not in scope:** scheduled reports, export to PDF/Excel, predictive analytics, anomaly detection, real-time updates (use polling if needed), drill-down detail views for each metric, and custom metric configuration.

---

## Context — Read These Files First

1. [../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md](../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md) — agent dashboard is separate from this management dashboard; they serve different audiences.

2. `backend/prisma/schema.prisma` — `Ticket` (with status, priority, assignedTo, createdAt), `User` (with role), `TicketFeedback` (rating), `KnowledgeBaseArticle` (viewCount).

3. `backend/src/services/ticket.service.ts` — existing query patterns for filtering/aggregation.

4. `frontend/src/views/DashboardView.vue` (if it exists) or `AgentDashboardView.vue` — dashboard layout patterns. Story 21 creates a separate management dashboard.

5. Chart library: use `chart.js` / `recharts` (if available) or simple SVG/canvas for charts. For this mini-module, simple HTML/CSS or a lightweight library suffices.

---

## Implementation Tasks

### Backend

**1 — Add reporting permission**

**File: `backend/src/auth/permissions.ts`**

Add `'reporting:read'` to `PERMISSIONS`.

**File: `backend/src/auth/roles.ts`**

Add `'reporting:read'` to `CRM_MANAGER` and `SUPPORT_SUPERVISOR`.

**2 — Create dashboard service**

**Create file: `backend/src/services/dashboard.service.ts`**

```ts
import { prisma } from '../db/prisma';
import { CLOSED_TICKET_STATUSES, TICKET_STATUSES } from '../tickets/types';

export interface TicketsSummary {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  overdueTickets: number;
  pendingTickets: number;
}

export interface CustomerSatisfaction {
  averageRating: number;
  totalFeedback: number;
  ratingBreakdown: { rating: number; count: number }[];
}

export interface TicketTrend {
  week: string; // "2026-W34", "2026-W35", etc.
  count: number;
}

export interface AgentWorkload {
  agentId: number;
  agentName: string;
  totalAssigned: number;
  open: number;
  pending: number;
  resolved: number;
  overdue: number;
}

export interface TopKbArticle {
  id: number;
  title: string;
  viewCount: number;
  category: string;
}

export const getTicketsSummary = async (startDate?: Date, endDate?: Date): Promise<TicketsSummary> => {
  const where = startDate ? { createdAt: { gte: startDate, lte: endDate || new Date() } } : {};

  const [total, open, resolved, overdue, pending] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { ...where, status: { in: ['New', 'Open'] } } }),
    prisma.ticket.count({ where: { ...where, status: { in: CLOSED_TICKET_STATUSES } } }),
    prisma.ticket.count({ where: { ...where, resolvedAt: null, updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.ticket.count({ where: { ...where, status: 'Pending' } })
  ]);

  return { totalTickets: total, openTickets: open, resolvedTickets: resolved, overdueTickets: overdue, pendingTickets: pending };
};

export const getCustomerSatisfaction = async (startDate?: Date, endDate?: Date): Promise<CustomerSatisfaction> => {
  const where = startDate ? { createdAt: { gte: startDate, lte: endDate || new Date() } } : {};

  const feedback = await prisma.ticketFeedback.findMany({ where });

  if (feedback.length === 0) {
    return { averageRating: 0, totalFeedback: 0, ratingBreakdown: [] };
  }

  const avg = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
  const breakdown = Array.from({ length: 5 }, (_, i) => ({
    rating: i + 1,
    count: feedback.filter(f => f.rating === i + 1).length
  }));

  return { averageRating: parseFloat(avg.toFixed(2)), totalFeedback: feedback.length, ratingBreakdown: breakdown };
};

export const getTicketTrends = async (weeks: number = 8): Promise<TicketTrend[]> => {
  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000)
      }
    },
    select: { createdAt: true }
  });

  const byWeek: Record<string, number> = {};
  tickets.forEach(t => {
    const week = getWeekKey(t.createdAt);
    byWeek[week] = (byWeek[week] ?? 0) + 1;
  });

  return Object.entries(byWeek).map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week));
};

export const getAgentWorkload = async (): Promise<AgentWorkload[]> => {
  const agents = await prisma.user.findMany({ include: { assignedTickets: true } });

  return agents
    .filter(a => a.assignedTickets.length > 0)
    .map(a => ({
      agentId: a.id,
      agentName: a.name,
      totalAssigned: a.assignedTickets.length,
      open: a.assignedTickets.filter(t => ['New', 'Open', 'In Progress'].includes(t.status)).length,
      pending: a.assignedTickets.filter(t => t.status === 'Pending').length,
      resolved: a.assignedTickets.filter(t => CLOSED_TICKET_STATUSES.includes(t.status as any)).length,
      overdue: a.assignedTickets.filter(t => !t.resolvedAt && t.updatedAt < new Date(Date.now() - 24 * 60 * 60 * 1000)).length
    }))
    .sort((a, b) => b.totalAssigned - a.totalAssigned);
};

export const getTopKbArticles = async (limit: number = 5): Promise<TopKbArticle[]> => {
  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: { isPublished: true },
    include: { category: true },
    orderBy: { viewCount: 'desc' },
    take: limit
  });

  return articles.map(a => ({
    id: a.id,
    title: a.title,
    viewCount: a.viewCount,
    category: a.category.name
  }));
};

const getWeekKey = (date: Date): string => {
  const d = new Date(date);
  const week = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};
```

**3 — Create dashboard controller**

**File: `backend/src/controllers/dashboard.controller.ts`**

```ts
import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import * as dashboardService from '../services/dashboard.service';

export const getTicketsSummary = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.can('reporting:read')) {
    throw new AppError(403, 'Not authorized to view reports');
  }

  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  const summary = await dashboardService.getTicketsSummary(start, end);
  res.json({ data: summary });
};

export const getCustomerSatisfaction = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.can('reporting:read')) throw new AppError(403, 'Not authorized');

  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  const satisfaction = await dashboardService.getCustomerSatisfaction(start, end);
  res.json({ data: satisfaction });
};

export const getTicketTrends = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.can('reporting:read')) throw new AppError(403, 'Not authorized');

  const { weeks } = req.query;
  const trends = await dashboardService.getTicketTrends(weeks ? Number(weeks) : 8);
  res.json({ data: trends });
};

export const getAgentWorkload = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.can('reporting:read')) throw new AppError(403, 'Not authorized');

  const workload = await dashboardService.getAgentWorkload();
  res.json({ data: workload });
};

export const getTopKbArticles = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.can('reporting:read')) throw new AppError(403, 'Not authorized');

  const { limit } = req.query;
  const articles = await dashboardService.getTopKbArticles(limit ? Number(limit) : 5);
  res.json({ data: articles });
};
```

**4 — Add dashboard routes**

**File: `backend/src/routes/dashboard.routes.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.get('/dashboard/tickets-summary', authenticate, dashboardController.getTicketsSummary);
router.get('/dashboard/customer-satisfaction', authenticate, dashboardController.getCustomerSatisfaction);
router.get('/dashboard/ticket-trends', authenticate, dashboardController.getTicketTrends);
router.get('/dashboard/agent-workload', authenticate, dashboardController.getAgentWorkload);
router.get('/dashboard/kb-top-articles', authenticate, dashboardController.getTopKbArticles);

export default router;
```

**5 — Register routes in app.ts**

Add `import dashboardRouter from './routes/dashboard.routes'` and `app.use('/api', dashboardRouter)`.

### Frontend

**6 — Add dashboard types**

**File: `frontend/src/types/index.ts`**

```ts
export interface TicketsSummary {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  overdueTickets: number;
  pendingTickets: number;
}

export interface CustomerSatisfaction {
  averageRating: number;
  totalFeedback: number;
  ratingBreakdown: { rating: number; count: number }[];
}

export interface TicketTrend {
  week: string;
  count: number;
}

export interface AgentWorkload {
  agentId: number;
  agentName: string;
  totalAssigned: number;
  open: number;
  pending: number;
  resolved: number;
  overdue: number;
}

export interface TopKbArticle {
  id: number;
  title: string;
  viewCount: number;
  category: string;
}
```

**7 — Create dashboard service**

**File: `frontend/src/services/dashboard.service.ts`**

```ts
import api from './api';
import type { ApiResponse, TicketsSummary, CustomerSatisfaction, TicketTrend, AgentWorkload, TopKbArticle } from '../types';

export const fetchTicketsSummary = async (startDate?: string, endDate?: string): Promise<TicketsSummary> => {
  const response = await api.get<ApiResponse<TicketsSummary>>('/dashboard/tickets-summary', {
    params: { startDate, endDate }
  });
  return response.data.data ?? { totalTickets: 0, openTickets: 0, resolvedTickets: 0, overdueTickets: 0, pendingTickets: 0 };
};

export const fetchCustomerSatisfaction = async (startDate?: string, endDate?: string): Promise<CustomerSatisfaction> => {
  const response = await api.get<ApiResponse<CustomerSatisfaction>>('/dashboard/customer-satisfaction', {
    params: { startDate, endDate }
  });
  return response.data.data ?? { averageRating: 0, totalFeedback: 0, ratingBreakdown: [] };
};

export const fetchTicketTrends = async (weeks?: number): Promise<TicketTrend[]> => {
  const response = await api.get<ApiResponse<TicketTrend[]>>('/dashboard/ticket-trends', {
    params: { weeks }
  });
  return response.data.data ?? [];
};

export const fetchAgentWorkload = async (): Promise<AgentWorkload[]> => {
  const response = await api.get<ApiResponse<AgentWorkload[]>>('/dashboard/agent-workload');
  return response.data.data ?? [];
};

export const fetchTopKbArticles = async (limit?: number): Promise<TopKbArticle[]> => {
  const response = await api.get<ApiResponse<TopKbArticle[]>>('/dashboard/kb-top-articles', {
    params: { limit }
  });
  return response.data.data ?? [];
};
```

**8 — Create dashboard store**

**File: `frontend/src/stores/dashboard.ts`**

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import * as dashboardService from '../services/dashboard.service';
import type { TicketsSummary, CustomerSatisfaction, TicketTrend, AgentWorkload, TopKbArticle } from '../types';

export const useDashboardStore = defineStore('dashboard', () => {
  const ticketsSummary = ref<TicketsSummary | null>(null);
  const satisfaction = ref<CustomerSatisfaction | null>(null);
  const trends = ref<TicketTrend[]>([]);
  const workload = ref<AgentWorkload[]>([]);
  const topArticles = ref<TopKbArticle[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const loadDashboard = async (startDate?: string, endDate?: string) => {
    loading.value = true;
    error.value = null;
    try {
      const [summary, satisf, trendData, workloadData, articles] = await Promise.all([
        dashboardService.fetchTicketsSummary(startDate, endDate),
        dashboardService.fetchCustomerSatisfaction(startDate, endDate),
        dashboardService.fetchTicketTrends(8),
        dashboardService.fetchAgentWorkload(),
        dashboardService.fetchTopKbArticles(5)
      ]);
      ticketsSummary.value = summary;
      satisfaction.value = satisf;
      trends.value = trendData;
      workload.value = workloadData;
      topArticles.value = articles;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Failed to load dashboard');
    } finally {
      loading.value = false;
    }
  };

  return {
    ticketsSummary,
    satisfaction,
    trends,
    workload,
    topArticles,
    loading,
    error,
    loadDashboard
  };
});
```

**9 — Create management dashboard view**

**File: `frontend/src/views/ManagementDashboardView.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useDashboardStore } from '../stores/dashboard';
import { useAuthStore } from '../stores/auth';
import PageHeader from '../components/ui/PageHeader.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';

const store = useDashboardStore();
const auth = useAuthStore();
const startDate = ref('');
const endDate = ref('');

onMounted(() => store.loadDashboard());

const applyDateFilter = () => {
  store.loadDashboard(startDate.value || undefined, endDate.value || undefined);
};
</script>

<template>
  <div v-if="!auth.can('reporting:read')" class="forbidden">
    <p>You do not have permission to view this dashboard.</p>
  </div>

  <template v-else>
    <PageHeader
      title="Management Dashboard"
      subtitle="Key metrics, trends, and agent workload."
    />

    <AlertBanner v-if="store.error" type="error" :message="store.error" />

    <!-- Date filter -->
    <div class="filter-bar">
      <input v-model="startDate" type="date" placeholder="Start date" />
      <input v-model="endDate" type="date" placeholder="End date" />
      <button @click="applyDateFilter">Filter</button>
    </div>

    <LoadingState v-if="store.loading" />

    <template v-else>
      <!-- Summary cards -->
      <div class="summary-cards">
        <div class="card">
          <div class="label">Total Tickets</div>
          <div class="value">{{ store.ticketsSummary?.totalTickets ?? 0 }}</div>
        </div>
        <div class="card">
          <div class="label">Open Tickets</div>
          <div class="value">{{ store.ticketsSummary?.openTickets ?? 0 }}</div>
        </div>
        <div class="card">
          <div class="label">Resolved</div>
          <div class="value">{{ store.ticketsSummary?.resolvedTickets ?? 0 }}</div>
        </div>
        <div class="card">
          <div class="label">Overdue</div>
          <div class="value danger">{{ store.ticketsSummary?.overdueTickets ?? 0 }}</div>
        </div>
        <div class="card">
          <div class="label">Avg. Satisfaction</div>
          <div class="value">{{ store.satisfaction?.averageRating?.toFixed(1) ?? '—' }} / 5</div>
        </div>
      </div>

      <!-- Agent workload table -->
      <section class="section">
        <h3>Agent Workload</h3>
        <table class="workload-table" data-testid="agent-workload-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Assigned</th>
              <th>Open</th>
              <th>Pending</th>
              <th>Resolved</th>
              <th>Overdue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="agent in store.workload" :key="agent.agentId">
              <td>{{ agent.agentName }}</td>
              <td>{{ agent.totalAssigned }}</td>
              <td>{{ agent.open }}</td>
              <td>{{ agent.pending }}</td>
              <td>{{ agent.resolved }}</td>
              <td :class="{ danger: agent.overdue > 0 }">{{ agent.overdue }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Top KB articles -->
      <section class="section">
        <h3>Top Knowledge Base Articles</h3>
        <ul v-if="store.topArticles.length" class="top-articles-list">
          <li v-for="article in store.topArticles" :key="article.id">
            <strong>{{ article.title }}</strong> ({{ article.category }}) — {{ article.viewCount }} views
          </li>
        </ul>
        <p v-else>No articles yet.</p>
      </section>
    </template>
  </template>
</template>

<style scoped>
.forbidden {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.filter-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.filter-bar input {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.filter-bar button {
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  background: var(--background-secondary);
}

.label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.value {
  font-size: 2rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.value.danger {
  color: var(--color-danger);
}

.section {
  margin-bottom: 2rem;
}

.section h3 {
  margin-bottom: 1rem;
}

.workload-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--border-color);
}

.workload-table th,
.workload-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.workload-table th {
  background: var(--background-secondary);
  font-weight: 600;
}

.workload-table td.danger {
  color: var(--color-danger);
  font-weight: 500;
}

.top-articles-list {
  list-style: none;
  padding: 0;
}

.top-articles-list li {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.top-articles-list li:last-child {
  border-bottom: none;
}
</style>
```

**10 — Add route**

**File: `frontend/src/router/index.ts`**

Add:

```ts
import ManagementDashboardView from '../views/ManagementDashboardView.vue';

// In routes array:
{
  path: '/dashboard/management',
  name: 'management-dashboard',
  component: ManagementDashboardView,
  meta: { permission: 'reporting:read' }
},
```

**11 — Update sidebar**

Add "Management Dashboard" link to sidebar, visible only to CRM_MANAGER role:

```vue
<router-link
  v-if="auth.can('reporting:read')"
  to="/dashboard/management"
  class="nav-link"
>
  Management Dashboard
</router-link>
```

**12 — Tests**

Backend: dashboard service and controller tests.
Frontend: dashboard store and view tests.

---

## Edge Cases & Failure Modes

- **No feedback submitted yet.** `customerSatisfaction` returns `averageRating: 0, totalFeedback: 0`.
- **No agents with assigned tickets.** Workload table is empty or shows "No data."
- **Date range is invalid (end before start).** Backend ignores filters or returns empty. Frontend should validate.
- **Concurrent modifications to ticket data.** Aggregation queries see eventual consistency; slight delays are acceptable (mini-module).

---

## Test Plan

1. Backend: summary queries return correct counts; satisfaction averages correctly; trends aggregate by week; workload orders by ticket count.
2. Frontend: dashboard loads and displays all sections; date filter works; table renders agent data correctly.

---

## Verification Steps

**Backend:** `npm test` includes dashboard specs; `npm run build` exits 0.

**Frontend:** `npm test` includes dashboard specs; `npm run build` exits 0.

**Dev smoke test:**
1. Log in as a CRM_MANAGER.
2. Navigate to `/dashboard/management`.
3. Confirm all summary cards display correct counts (total, open, resolved, overdue, satisfaction).
4. Confirm agent workload table shows all assigned agents sorted by ticket count.
5. Apply a date filter and confirm counts update.
6. Confirm "Management Dashboard" link appears in sidebar.

---

## Done Criteria

- [ ] Dashboard endpoints created: tickets-summary, customer-satisfaction, ticket-trends, agent-workload, kb-top-articles.
- [ ] All endpoints support optional date-range filtering and permission gating on `reporting:read`.
- [ ] Frontend dashboard displays summary cards, agent workload table, and top articles.
- [ ] Date filter works; queries respect the date range.
- [ ] Sidebar shows "Management Dashboard" link for authorized users.
- [ ] All tests pass; `npm run build` and `npm run typecheck` exit 0 (both).
- [ ] Smoke test confirms dashboard displays accurate data and filters work.
