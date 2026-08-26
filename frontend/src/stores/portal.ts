import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import {
  fetchPortalSummary,
  fetchPortalTickets,
  fetchTicketFeedback,
  submitTicketFeedback
} from '../services/portal.service';
import { fetchTicket } from '../services/tickets.service';
import { CLOSED_TICKET_STATUSES } from '../types';
import type { CustomerPortalSummary, PortalTicket, TicketDetail, TicketFeedback } from '../types';

/**
 * State for the customer portal (Story 17). Deliberately separate from `stores/tickets.ts`:
 * that store models the agent queue (scopes, claim/assign, internal comments) and none of it
 * applies to a customer looking at their own requests.
 *
 * The ticket detail is read through the existing `GET /api/tickets/:id`, which already scopes a
 * CUSTOMER-role token to its own ticket and strips the agents' internal comment/attachment
 * lists — there is no separate portal detail endpoint to maintain.
 */
export const usePortalStore = defineStore('portal', () => {
  const summary = ref<CustomerPortalSummary | null>(null);
  const tickets = ref<PortalTicket[]>([]);
  const selectedTicket = ref<TicketDetail | null>(null);
  const feedback = ref<TicketFeedback | null>(null);
  const loading = ref(false);
  const detailLoading = ref(false);
  const submitting = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);

  const hasTickets = computed(() => tickets.value.length > 0);

  /** Feedback is only offered once the ticket is finished — the same rule the API enforces. */
  const canLeaveFeedback = computed(
    () =>
      selectedTicket.value !== null &&
      feedback.value === null &&
      CLOSED_TICKET_STATUSES.includes(selectedTicket.value.status)
  );

  const loadDashboard = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const [nextSummary, nextTickets] = await Promise.all([fetchPortalSummary(), fetchPortalTickets()]);
      summary.value = nextSummary;
      tickets.value = nextTickets;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load your tickets');
    } finally {
      loading.value = false;
    }
  };

  /**
   * On failure `selectedTicket` is put back to `null` so the view can tell "still loading" from
   * "failed to load" from "loaded" with three plain `v-if` branches — the same three-state
   * contract `stores/customers.ts` uses for a customer profile.
   */
  const loadTicketDetail = async (ticketId: number): Promise<void> => {
    detailLoading.value = true;
    error.value = null;
    notice.value = null;
    try {
      const ticket = await fetchTicket(ticketId);
      selectedTicket.value = ticket;
      // Only a finished ticket can have been rated, so skip the extra request otherwise.
      feedback.value = CLOSED_TICKET_STATUSES.includes(ticket.status)
        ? await fetchTicketFeedback(ticketId)
        : null;
    } catch (cause) {
      selectedTicket.value = null;
      feedback.value = null;
      error.value = toErrorMessage(cause, 'Unable to load this ticket');
    } finally {
      detailLoading.value = false;
    }
  };

  const submitFeedback = async (
    ticketId: number,
    rating: number,
    comment?: string
  ): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    submitting.value = true;
    try {
      feedback.value = await submitTicketFeedback(ticketId, { rating, comment });
      notice.value = 'Thank you — your feedback has been recorded.';
      // Keep the dashboard list honest without a second round trip.
      tickets.value = tickets.value.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              feedback: {
                id: feedback.value!.id,
                rating: feedback.value!.rating,
                createdAt: feedback.value!.createdAt
              }
            }
          : ticket
      );
      if (summary.value !== null) {
        summary.value = {
          ...summary.value,
          awaitingFeedback: Math.max(0, summary.value.awaitingFeedback - 1)
        };
      }
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to submit your feedback');
      return false;
    } finally {
      submitting.value = false;
    }
  };

  return {
    summary,
    tickets,
    selectedTicket,
    feedback,
    loading,
    detailLoading,
    submitting,
    error,
    notice,
    hasTickets,
    canLeaveFeedback,
    loadDashboard,
    loadTicketDetail,
    submitFeedback
  };
});
