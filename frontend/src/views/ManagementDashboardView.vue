<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useDashboardStore } from '../stores/dashboard';
import { fetchUsers } from '../services/users.service';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../types';
import type { AuthUser } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = useDashboardStore();

/** Staff for the agent filter. A failure here leaves the dropdown empty, not the page broken. */
const agents = ref<Pick<AuthUser, 'id' | 'name'>[]>([]);

const percent = (value: number, peak: number): string => `${Math.round((value / peak) * 100)}%`;

/** "2026-W35" reads better on an axis as "W35". */
const shortWeek = (week: string): string => week.split('-')[1] ?? week;

onMounted(async () => {
  await store.load();
  try {
    const staff = await fetchUsers();
    agents.value = staff
      .filter((user) => user.roleKey !== 'CUSTOMER')
      .map((user) => ({ id: user.id, name: user.name }));
  } catch {
    // The agent dropdown is a convenience; the dashboard works without it.
    agents.value = [];
  }
});
</script>

<template>
  <section class="view">
    <PageHeader
      title="Management Dashboard"
      subtitle="Volume, SLA health, agent load, and what customers think."
    />

    <AlertBanner v-if="store.error" variant="error" data-testid="dashboard-error">
      {{ store.error }}
    </AlertBanner>

    <div class="card">
      <div class="card-padded">
        <form class="filter-bar" data-testid="dashboard-filter-form" @submit.prevent="store.load()">
          <div class="form-field">
            <label for="dashboard-start">From</label>
            <input id="dashboard-start" v-model="store.startDate" type="date" data-testid="filter-start-date" />
          </div>
          <div class="form-field">
            <label for="dashboard-end">To</label>
            <input id="dashboard-end" v-model="store.endDate" type="date" data-testid="filter-end-date" />
          </div>
          <div class="form-field">
            <label for="dashboard-status">Status</label>
            <select id="dashboard-status" v-model="store.statusFilter" data-testid="filter-status">
              <option value="">All statuses</option>
              <option v-for="value in TICKET_STATUSES" :key="value" :value="value">{{ value }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="dashboard-priority">Priority</label>
            <select id="dashboard-priority" v-model="store.priorityFilter" data-testid="filter-priority">
              <option value="">All priorities</option>
              <option v-for="value in TICKET_PRIORITIES" :key="value" :value="value">{{ value }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="dashboard-agent">Agent</label>
            <select id="dashboard-agent" v-model="store.agentFilter" data-testid="filter-agent">
              <option value="">All agents</option>
              <option v-for="agent in agents" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
            </select>
          </div>
          <button class="btn btn-primary" type="submit" data-testid="apply-filters-button">Apply</button>
          <button
            v-if="store.hasFilters"
            class="btn btn-ghost btn-sm"
            type="button"
            data-testid="clear-filters-button"
            @click="store.clearFilters()"
          >
            Clear
          </button>
        </form>
      </div>
    </div>

    <LoadingState v-if="store.loading" data-testid="dashboard-loading">Loading the dashboard…</LoadingState>

    <template v-else>
      <div class="kpi-grid" data-testid="dashboard-kpis">
        <div class="kpi-card">
          <p class="kpi-label">Total tickets</p>
          <p class="kpi-value" data-testid="kpi-total">{{ store.summary?.totalTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Open</p>
          <p class="kpi-value" data-testid="kpi-open">{{ store.summary?.openTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Pending</p>
          <p class="kpi-value" data-testid="kpi-pending">{{ store.summary?.pendingTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Resolved</p>
          <p class="kpi-value" data-testid="kpi-resolved">{{ store.summary?.resolvedTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Overdue</p>
          <p class="kpi-value is-danger" data-testid="kpi-overdue">{{ store.summary?.overdueTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Satisfaction</p>
          <p class="kpi-value" data-testid="kpi-satisfaction">
            <template v-if="store.satisfaction?.averageRating !== null && store.satisfaction !== null">
              {{ store.satisfaction.averageRating }}<span class="kpi-suffix">/5</span>
            </template>
            <template v-else>—</template>
          </p>
          <p class="kpi-note" data-testid="kpi-satisfaction-count">
            {{ store.satisfaction?.totalFeedback ?? 0 }} ratings
          </p>
        </div>
      </div>

      <div class="panel-grid">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Tickets by status</h3></div>
          <div class="card-padded">
            <ul class="bar-list" data-testid="status-distribution">
              <li v-for="entry in store.summary?.byStatus ?? []" :key="entry.status" class="bar-row">
                <span class="bar-label">{{ entry.status }}</span>
                <span class="bar-track">
                  <span class="bar-fill" :style="{ width: percent(entry.count, store.statusPeak) }"></span>
                </span>
                <span class="bar-value">{{ entry.count }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title">Tickets by priority</h3></div>
          <div class="card-padded">
            <ul class="bar-list" data-testid="priority-distribution">
              <li v-for="entry in store.summary?.byPriority ?? []" :key="entry.priority" class="bar-row">
                <span class="bar-label">{{ entry.priority }}</span>
                <span class="bar-track">
                  <span class="bar-fill" :style="{ width: percent(entry.count, store.priorityPeak) }"></span>
                </span>
                <span class="bar-value">{{ entry.count }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">Created vs resolved, by week</h3></div>
        <div class="card-padded">
          <EmptyState
            v-if="store.trends.length === 0"
            title="No trend data"
            description="Nothing was opened or closed in this window."
            data-testid="trends-empty"
          />
          <div v-else class="trend-chart" data-testid="ticket-trends">
            <div v-for="point in store.trends" :key="point.week" class="trend-column" data-testid="trend-column">
              <div class="trend-bars">
                <span
                  class="trend-bar is-created"
                  :style="{ height: percent(point.created, store.trendPeak) }"
                  :title="`${point.created} created`"
                ></span>
                <span
                  class="trend-bar is-resolved"
                  :style="{ height: percent(point.resolved, store.trendPeak) }"
                  :title="`${point.resolved} resolved`"
                ></span>
              </div>
              <span class="trend-label">{{ shortWeek(point.week) }}</span>
            </div>
          </div>
          <p class="legend">
            <span class="legend-key is-created"></span> Created
            <span class="legend-key is-resolved"></span> Resolved
          </p>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">Agent workload</h3></div>
        <div class="card-padded">
          <EmptyState
            v-if="store.workload.length === 0"
            title="No assigned tickets"
            description="Nothing matches these filters, so no agent has anything queued."
            data-testid="workload-empty"
          />
          <div v-else class="table-wrapper">
            <table data-testid="agent-workload-table">
              <thead>
                <tr>
                  <th scope="col">Agent</th>
                  <th scope="col">Assigned</th>
                  <th scope="col">Open</th>
                  <th scope="col">Pending</th>
                  <th scope="col">Resolved</th>
                  <th scope="col">Overdue</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in store.workload" :key="row.agentId" data-testid="workload-row">
                  <td>{{ row.agentName }}</td>
                  <td>{{ row.totalAssigned }}</td>
                  <td>{{ row.open }}</td>
                  <td>{{ row.pending }}</td>
                  <td>{{ row.resolved }}</td>
                  <td :class="{ 'is-danger': row.overdue > 0 }">{{ row.overdue }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">Most-read knowledge base articles</h3></div>
        <div class="card-padded">
          <EmptyState
            v-if="store.topArticles.length === 0"
            title="No published articles"
            description="Publish a knowledge base article and its readership will show up here."
            data-testid="top-articles-empty"
          />
          <ul v-else class="article-list" data-testid="top-articles">
            <li v-for="article in store.topArticles" :key="article.id" class="article-row" data-testid="top-article-row">
              <RouterLink :to="{ name: 'kb-article', params: { id: article.id } }" class="article-title">
                {{ article.title }}
              </RouterLink>
              <StatusBadge variant="neutral">{{ article.category.name }}</StatusBadge>
              <span class="article-views">{{ article.viewCount }} views</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.kpi-card {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.kpi-label {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--text-subtle);
}

.kpi-value {
  margin: 0.35rem 0 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.kpi-suffix {
  font-size: 0.9rem;
  color: var(--text-subtle);
  font-weight: 500;
}

.kpi-note {
  margin: 0.2rem 0 0;
  font-size: var(--font-xs);
  color: var(--text-subtle);
}

.is-danger {
  color: var(--color-danger, #dc2626);
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-3);
}

.bar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-row {
  display: grid;
  grid-template-columns: 6.5rem 1fr 2.5rem;
  align-items: center;
  gap: 0.6rem;
  font-size: var(--font-sm);
}

.bar-track {
  height: 0.6rem;
  background-color: var(--slate-100);
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  background-color: var(--color-primary);
  border-radius: 999px;
}

.bar-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  height: 160px;
  padding-bottom: 1.4rem;
  overflow-x: auto;
}

.trend-column {
  flex: 1 1 0;
  min-width: 2.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.2rem;
  height: 100%;
}

.trend-bar {
  width: 0.7rem;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
}

.trend-bar.is-created {
  background-color: var(--color-primary);
}

.trend-bar.is-resolved {
  background-color: var(--slate-400, #94a3b8);
}

.trend-label {
  position: absolute;
  bottom: -1.3rem;
  left: 0;
  right: 0;
  text-align: center;
  font-size: var(--font-xs);
  color: var(--text-subtle);
}

.legend {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: var(--space-3) 0 0;
  font-size: var(--font-xs);
  color: var(--text-subtle);
}

.legend-key {
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 2px;
}

.legend-key.is-created {
  background-color: var(--color-primary);
}

.legend-key.is-resolved {
  background-color: var(--slate-400, #94a3b8);
  margin-left: 0.6rem;
}

.article-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.article-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border-color);
}

.article-row:last-child {
  border-bottom: 0;
}

.article-title {
  flex: 1;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.article-title:hover {
  text-decoration: underline;
}

.article-views {
  font-size: var(--font-sm);
  color: var(--text-subtle);
  font-variant-numeric: tabular-nums;
}
</style>
