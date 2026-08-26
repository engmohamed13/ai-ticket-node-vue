import api from './api';
import type {
  ApiResponse,
  CustomerPortalSummary,
  PortalTicket,
  SubmitFeedbackPayload,
  TicketFeedback
} from '../types';

/**
 * The customer-facing half of the API (Story 16). Every endpoint here is scoped server-side to
 * the signed-in customer, so none of these calls takes a customerId — sending one would be
 * ignored anyway.
 */
export const fetchPortalSummary = async (): Promise<CustomerPortalSummary> => {
  const response = await api.get<ApiResponse<CustomerPortalSummary>>('/customers/portal/summary');
  if (!response.data.data) throw new Error(response.data.message || 'Unable to load your summary');
  return response.data.data;
};

export const fetchPortalTickets = async (): Promise<PortalTicket[]> => {
  const response = await api.get<ApiResponse<PortalTicket[]>>('/customers/portal/tickets');
  return response.data.data ?? [];
};

/** `null` — not an error — when the ticket exists but has not been rated yet. */
export const fetchTicketFeedback = async (ticketId: number): Promise<TicketFeedback | null> => {
  const response = await api.get<ApiResponse<TicketFeedback>>(`/tickets/${ticketId}/feedback`);
  return response.data.data ?? null;
};

export const submitTicketFeedback = async (
  ticketId: number,
  payload: SubmitFeedbackPayload
): Promise<TicketFeedback> => {
  const response = await api.post<ApiResponse<TicketFeedback>>(`/tickets/${ticketId}/feedback`, payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to submit your feedback');
  return response.data.data;
};
