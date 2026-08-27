<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
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
const { t, te } = useI18n();

/** Staff for the agent filter. A failure here leaves the dropdown empty, not the page broken. */
const agents = ref<Pick<AuthUser, 'id' | 'name'>[]>([]);

/** The satisfaction score is out of five; the scale lives here so the label can interpolate it. */
const RATING_SCALE = 5;

/**
 * Enum value → translated label. The wire format is untouched; only the label changes.
 * Distribution rows come straight from the API, so an unknown value falls back to itself.
 */
const statusLabel = (value: string): string =>
  te(`reports.status.${value}`) ? t(`reports.status.${value}`) : value;

const priorityLabel = (value: string): string =>
  te(`reports.priority.${value}`) ? t(`reports.priority.${value}`) : value;

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
    <PageHeader :title="t('reports.title')" :subtitle="t('reports.subtitle')" />

    <AlertBanner v-if="store.error" variant="error" data-testid="dashboard-error">
      {{ store.error }}
    </AlertBanner>

    <div class="card">
      <div class="card-padded">
        <form class="filter-bar" data-testid="dashboard-filter-form" @submit.prevent="store.load()">
          <div class="form-field">
            <label for="dashboard-start">{{ t('reports.filters.from') }}</label>
            <input id="dashboard-start" v-model="store.startDate" type="date" data-testid="filter-start-date" />
          </div>
          <div class="form-field">
            <label for="dashboard-end">{{ t('reports.filters.to') }}</label>
            <input id="dashboard-end" v-model="store.endDate" type="date" data-testid="filter-end-date" />
          </div>
          <div class="form-field">
            <label for="dashboard-status">{{ t('reports.filters.status') }}</label>
            <select id="dashboard-status" v-model="store.statusFilter" data-testid="filter-status">
              <option value="">{{ t('reports.filters.allStatuses') }}</option>
              <option v-for="value in TICKET_STATUSES" :key="value" :value="value">{{ statusLabel(value) }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="dashboard-priority">{{ t('reports.filters.priority') }}</label>
            <select id="dashboard-priority" v-model="store.priorityFilter" data-testid="filter-priority">
              <option value="">{{ t('reports.filters.allPriorities') }}</option>
              <option v-for="value in TICKET_PRIORITIES" :key="value" :value="value">{{ priorityLabel(value) }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="dashboard-agent">{{ t('reports.filters.agent') }}</label>
            <select id="dashboard-agent" v-model="store.agentFilter" data-testid="filter-agent">
              <option value="">{{ t('reports.filters.allAgents') }}</option>
              <option v-for="agent in agents" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
            </select>
          </div>
          <button class="btn btn-primary" type="submit" data-testid="apply-filters-button">
            {{ t('reports.filters.apply') }}
          </button>
          <button
            v-if="store.hasFilters"
            class="btn btn-ghost btn-sm"
            type="button"
            data-testid="clear-filters-button"
            @click="store.clearFilters()"
          >
            {{ t('common.actions.clear') }}
          </button>
        </form>
      </div>
    </div>

    <LoadingState v-if="store.loading" data-testid="dashboard-loading">{{ t('reports.loading') }}</LoadingState>

    <template v-else>
      <div class="kpi-grid" data-testid="dashboard-kpis">
        <div class="kpi-card">
          <p class="kpi-label">{{ t('reports.kpis.total') }}</p>
          <p class="kpi-value" data-testid="kpi-total">{{ store.summary?.totalTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('reports.kpis.open') }}</p>
          <p class="kpi-value" data-testid="kpi-open">{{ store.summary?.openTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('reports.kpis.pending') }}</p>
          <p class="kpi-value" data-testid="kpi-pending">{{ store.summary?.pendingTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('reports.kpis.resolved') }}</p>
          <p class="kpi-value" data-testid="kpi-resolved">{{ store.summary?.resolvedTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('reports.kpis.overdue') }}</p>
          <p class="kpi-value is-danger" data-testid="kpi-overdue">{{ store.summary?.overdueTickets ?? 0 }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('reports.kpis.satisfaction') }}</p>
          <p class="kpi-value" data-testid="kpi-satisfaction">
            <template v-if="store.satisfaction?.averageRating !== null && store.satisfaction !== null">
              <!-- One key for the whole score, so Arabic can phrase "4.5 من 5" rather than
                   glue a translated fragment onto a number. The scale keeps its own styling
                   through a slot. -->
              <i18n-t keypath="reports.kpis.satisfactionValue" scope="global">
                <template #rating>{{ store.satisfaction.averageRating }}</template>
                <template #scale><span class="kpi-suffix">{{ RATING_SCALE }}</span></template>
              </i18n-t>
            </template>
            <template v-else>{{ t('common.states.none') }}</template>
          </p>
          <p class="kpi-note" data-testid="kpi-satisfaction-count">
            {{ t('reports.kpis.ratings', { count: store.satisfaction?.totalFeedback ?? 0 }) }}
          </p>
        </div>
      </div>

      <div class="panel-grid">
        <div class="card">
          <div class="card-header"><h3 class="card-title">{{ t('reports.panels.byStatus') }}</h3></div>
          <div class="card-padded">
            <ul class="bar-list" data-testid="status-distribution">
              <li v-for="entry in store.summary?.byStatus ?? []" :key="entry.status" class="bar-row">
                <span class="bar-label">{{ statusLabel(entry.status) }}</span>
                <span class="bar-track">
                  <span class="bar-fill" :style="{ width: percent(entry.count, store.statusPeak) }"></span>
                </span>
                <span class="bar-value">{{ entry.count }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title">{{ t('reports.panels.byPriority') }}</h3></div>
          <div class="card-padded">
            <ul class="bar-list" data-testid="priority-distribution">
              <li v-for="entry in store.summary?.byPriority ?? []" :key="entry.priority" class="bar-row">
                <span class="bar-label">{{ priorityLabel(entry.priority) }}</span>
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
        <div class="card-header"><h3 class="card-title">{{ t('reports.panels.trends') }}</h3></div>
        <div class="card-padded">
          <EmptyState
            v-if="store.trends.length === 0"
            :title="t('reports.trends.emptyTitle')"
            :description="t('reports.trends.emptyDescription')"
            data-testid="trends-empty"
          />
          <div v-else class="trend-chart" data-testid="ticket-trends">
            <div v-for="point in store.trends" :key="point.week" class="trend-column" data-testid="trend-column">
              <div class="trend-bars">
                <span
                  class="trend-bar is-created"
                  :style="{ height: percent(point.created, store.trendPeak) }"
                  :title="t('reports.trends.createdTooltip', { count: point.created })"
                ></span>
                <span
                  class="trend-bar is-resolved"
                  :style="{ height: percent(point.resolved, store.trendPeak) }"
                  :title="t('reports.trends.resolvedTooltip', { count: point.resolved })"
                ></span>
              </div>
              <span class="trend-label">{{ shortWeek(point.week) }}</span>
            </div>
          </div>
          <p class="legend">
            <span class="legend-key is-created"></span> {{ t('reports.trends.legendCreated') }}
            <span class="legend-key is-resolved"></span> {{ t('reports.trends.legendResolved') }}
          </p>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">{{ t('reports.panels.workload') }}</h3></div>
        <div class="card-padded">
          <EmptyState
            v-if="store.workload.length === 0"
            :title="t('reports.workload.emptyTitle')"
            :description="t('reports.workload.emptyDescription')"
            data-testid="workload-empty"
          />
          <div v-else class="table-wrapper">
            <table data-testid="agent-workload-table">
              <thead>
                <tr>
                  <th scope="col">{{ t('reports.workload.agent') }}</th>
                  <th scope="col">{{ t('reports.workload.assigned') }}</th>
                  <th scope="col">{{ t('reports.workload.open') }}</th>
                  <th scope="col">{{ t('reports.workload.pending') }}</th>
                  <th scope="col">{{ t('reports.workload.resolved') }}</th>
                  <th scope="col">{{ t('reports.workload.overdue') }}</th>
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
        <div class="card-header"><h3 class="card-title">{{ t('reports.panels.topArticles') }}</h3></div>
        <div class="card-padded">
          <EmptyState
            v-if="store.topArticles.length === 0"
            :title="t('reports.articles.emptyTitle')"
            :description="t('reports.articles.emptyDescription')"
            data-testid="top-articles-empty"
          />
          <ul v-else class="article-list" data-testid="top-articles">
            <li v-for="article in store.topArticles" :key="article.id" class="article-row" data-testid="top-article-row">
              <RouterLink :to="{ name: 'kb-article', params: { id: article.id } }" class="article-title">
                {{ article.title }}
              </RouterLink>
              <StatusBadge variant="neutral">{{ article.category.name }}</StatusBadge>
              <span class="article-views">{{ t('reports.articles.views', { count: article.viewCount }) }}</span>
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
  text-align: end;
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
  inset-inline-start: 0;
  inset-inline-end: 0;
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
  margin-inline-start: 0.6rem;
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
