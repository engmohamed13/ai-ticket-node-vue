import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import {
  fetchAgentWorkload,
  fetchCustomerSatisfaction,
  fetchTicketTrends,
  fetchTicketsSummary,
  fetchTopKbArticles
} from '../services/dashboard.service';
import type { DashboardFilter } from '../services/dashboard.service';
import type {
  AgentWorkloadRow,
  CustomerSatisfaction,
  KbArticleSummary,
  TicketPriority,
  TicketStatus,
  TicketTrendPoint,
  TicketsSummary
} from '../types';

/** How many weeks of history the trend chart shows. */
export const TREND_WEEKS = 8;

/**
 * Management dashboard state (Story 21). The five panels are fetched in parallel from five
 * endpoints — one failing panel is reported without blanking the rest, which is why each
 * result is applied independently rather than in a single all-or-nothing assignment.
 */
export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<TicketsSummary | null>(null);
  const satisfaction = ref<CustomerSatisfaction | null>(null);
  const trends = ref<TicketTrendPoint[]>([]);
  const workload = ref<AgentWorkloadRow[]>([]);
  const topArticles = ref<KbArticleSummary[]>([]);

  const startDate = ref('');
  const endDate = ref('');
  const statusFilter = ref<TicketStatus | ''>('');
  const priorityFilter = ref<TicketPriority | ''>('');
  const agentFilter = ref<number | ''>('');

  const loading = ref(false);
  const error = ref<string | null>(null);

  const hasFilters = computed(
    () =>
      startDate.value !== '' ||
      endDate.value !== '' ||
      statusFilter.value !== '' ||
      priorityFilter.value !== '' ||
      agentFilter.value !== ''
  );

  /** True when the user has typed a range the API would reject — checked before requesting. */
  const rangeIsInvalid = computed(
    () => startDate.value !== '' && endDate.value !== '' && startDate.value > endDate.value
  );

  const currentFilter = computed<DashboardFilter>(() => ({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    status: statusFilter.value === '' ? undefined : statusFilter.value,
    priority: priorityFilter.value === '' ? undefined : priorityFilter.value,
    assignedToUserId: agentFilter.value === '' ? undefined : Number(agentFilter.value)
  }));

  const load = async (): Promise<void> => {
    if (rangeIsInvalid.value) {
      error.value = 'The start date must be on or before the end date.';
      return;
    }

    loading.value = true;
    error.value = null;
    const filter = currentFilter.value;

    // `allSettled`, not `all`: a single failing panel should not blank the other four.
    const results = await Promise.allSettled([
      fetchTicketsSummary(filter),
      fetchCustomerSatisfaction(filter),
      fetchTicketTrends(TREND_WEEKS, filter),
      fetchAgentWorkload(filter),
      fetchTopKbArticles()
    ]);

    if (results[0].status === 'fulfilled') summary.value = results[0].value;
    if (results[1].status === 'fulfilled') satisfaction.value = results[1].value;
    if (results[2].status === 'fulfilled') trends.value = results[2].value;
    if (results[3].status === 'fulfilled') workload.value = results[3].value;
    if (results[4].status === 'fulfilled') topArticles.value = results[4].value;

    const firstFailure = results.find((result) => result.status === 'rejected');
    if (firstFailure && firstFailure.status === 'rejected') {
      error.value = toErrorMessage(firstFailure.reason, 'Unable to load the dashboard');
    }

    loading.value = false;
  };

  const clearFilters = async (): Promise<void> => {
    startDate.value = '';
    endDate.value = '';
    statusFilter.value = '';
    priorityFilter.value = '';
    agentFilter.value = '';
    await load();
  };

  /** Largest bar in the trend chart, so the bars can be scaled without a chart library. */
  const trendPeak = computed(() =>
    Math.max(1, ...trends.value.map((point) => Math.max(point.created, point.resolved)))
  );

  const statusPeak = computed(() =>
    Math.max(1, ...(summary.value?.byStatus ?? []).map((entry) => entry.count))
  );

  const priorityPeak = computed(() =>
    Math.max(1, ...(summary.value?.byPriority ?? []).map((entry) => entry.count))
  );

  return {
    summary,
    satisfaction,
    trends,
    workload,
    topArticles,
    startDate,
    endDate,
    statusFilter,
    priorityFilter,
    agentFilter,
    loading,
    error,
    hasFilters,
    rangeIsInvalid,
    currentFilter,
    trendPeak,
    statusPeak,
    priorityPeak,
    load,
    clearFilters
  };
});
