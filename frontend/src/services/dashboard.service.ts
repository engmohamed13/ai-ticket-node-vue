import api from './api';
import type {
  AgentWorkloadRow,
  ApiResponse,
  CustomerSatisfaction,
  KbArticleSummary,
  TicketPriority,
  TicketStatus,
  TicketTrendPoint,
  TicketsSummary
} from '../types';

/** The filter set every dashboard panel shares (Story 21). */
export interface DashboardFilter {
  startDate?: string;
  endDate?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToUserId?: number;
}

const EMPTY_SUMMARY: TicketsSummary = {
  totalTickets: 0,
  openTickets: 0,
  pendingTickets: 0,
  resolvedTickets: 0,
  overdueTickets: 0,
  unassignedTickets: 0,
  byStatus: [],
  byPriority: []
};

const EMPTY_SATISFACTION: CustomerSatisfaction = {
  averageRating: null,
  totalFeedback: 0,
  ratingBreakdown: []
};

/** Blank strings from an untouched `<input type="date">` must not reach the API as params. */
const toParams = (filter: DashboardFilter): Record<string, string | number | undefined> => ({
  startDate: filter.startDate || undefined,
  endDate: filter.endDate || undefined,
  status: filter.status || undefined,
  priority: filter.priority || undefined,
  assignedToUserId: filter.assignedToUserId
});

export const fetchTicketsSummary = async (filter: DashboardFilter = {}): Promise<TicketsSummary> => {
  const response = await api.get<ApiResponse<TicketsSummary>>('/dashboard/tickets-summary', {
    params: toParams(filter)
  });
  return response.data.data ?? EMPTY_SUMMARY;
};

export const fetchCustomerSatisfaction = async (
  filter: DashboardFilter = {}
): Promise<CustomerSatisfaction> => {
  const response = await api.get<ApiResponse<CustomerSatisfaction>>(
    '/dashboard/customer-satisfaction',
    { params: toParams(filter) }
  );
  return response.data.data ?? EMPTY_SATISFACTION;
};

export const fetchTicketTrends = async (
  weeks: number,
  filter: DashboardFilter = {}
): Promise<TicketTrendPoint[]> => {
  const response = await api.get<ApiResponse<TicketTrendPoint[]>>('/dashboard/ticket-trends', {
    params: { ...toParams(filter), weeks }
  });
  return response.data.data ?? [];
};

export const fetchAgentWorkload = async (filter: DashboardFilter = {}): Promise<AgentWorkloadRow[]> => {
  const response = await api.get<ApiResponse<AgentWorkloadRow[]>>('/dashboard/agent-workload', {
    params: toParams(filter)
  });
  return response.data.data ?? [];
};

export const fetchTopKbArticles = async (limit = 5): Promise<KbArticleSummary[]> => {
  const response = await api.get<ApiResponse<KbArticleSummary[]>>('/dashboard/kb-top-articles', {
    params: { limit }
  });
  return response.data.data ?? [];
};
