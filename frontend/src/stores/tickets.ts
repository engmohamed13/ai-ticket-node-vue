import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import { isTicketOverdue } from '../services/ticketSla';
import {
  addTicketComment,
  assignTicket,
  createTicket,
  deleteTicketAttachment,
  downloadTicketAttachment,
  fetchTicket,
  fetchTicketCategories,
  fetchTicketTimeline,
  fetchTickets,
  updateTicket,
  uploadTicketAttachment
} from '../services/tickets.service';
import type { TicketListFilter } from '../services/tickets.service';
import { useAuthStore } from './auth';
import type {
  CreateTicketPayload,
  Interaction,
  Ticket,
  TicketAttachment,
  TicketCategory,
  TicketDetail,
  UpdateTicketPayload
} from '../types';

/** The dashboard tabs from work item 5. `all` is the unfiltered queue. */
export const TICKET_SCOPES = ['mine', 'open', 'pending', 'overdue', 'unassigned', 'all'] as const;
export type TicketScope = (typeof TICKET_SCOPES)[number];

export const TICKET_SCOPE_LABELS: Record<TicketScope, string> = {
  mine: 'My Tickets',
  open: 'Open Tickets',
  pending: 'Pending Tickets',
  overdue: 'Overdue Tickets',
  unassigned: 'Unassigned',
  all: 'All Tickets'
};

/**
 * Translates a dashboard tab into request params. "Open" means actively worked — every status
 * before Pending — so it is fetched unfiltered and narrowed client-side; the API filters one
 * status at a time. "Overdue" is entirely client-side (see services/ticketSla.ts).
 */
const scopeToFilter = (scope: TicketScope): TicketListFilter => {
  switch (scope) {
    case 'mine':
      return { assignedToMe: true };
    case 'pending':
      return { status: 'Pending' };
    case 'unassigned':
      return { unassigned: true };
    case 'open':
    case 'overdue':
    case 'all':
      return {};
  }
};

const OPEN_STATUSES = ['New', 'Open', 'In Progress'];

export const useTicketsStore = defineStore('tickets', () => {
  // Only needed to resolve "claim this ticket for me" into a concrete user id.
  const auth = useAuthStore();

  const tickets = ref<Ticket[]>([]);
  const categories = ref<TicketCategory[]>([]);
  const selectedTicket = ref<TicketDetail | null>(null);
  const timeline = ref<Interaction[]>([]);
  const scope = ref<TicketScope>('mine');
  const statusFilter = ref<Ticket['status'] | ''>('');
  const priorityFilter = ref<Ticket['priority'] | ''>('');
  const categoryFilter = ref<number | ''>('');
  const loading = ref(false);
  const detailLoading = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);

  /** Scope narrowing and the secondary dropdowns the API cannot express in one request. */
  const visibleTickets = computed(() => {
    const now = Date.now();
    return tickets.value.filter((ticket) => {
      if (scope.value === 'open' && !OPEN_STATUSES.includes(ticket.status)) return false;
      if (scope.value === 'overdue' && !isTicketOverdue(ticket, now)) return false;
      if (statusFilter.value !== '' && ticket.status !== statusFilter.value) return false;
      if (priorityFilter.value !== '' && ticket.priority !== priorityFilter.value) return false;
      if (categoryFilter.value !== '' && ticket.categoryId !== categoryFilter.value) return false;
      return true;
    });
  });

  const counts = computed(() => {
    const now = Date.now();
    return {
      total: tickets.value.length,
      overdue: tickets.value.filter((ticket) => isTicketOverdue(ticket, now)).length,
      unassigned: tickets.value.filter((ticket) => ticket.assignedToUserId === null).length
    };
  });

  const hasTickets = computed(() => visibleTickets.value.length > 0);

  /**
   * A silent load is the dashboard's background poll. Notifications are no longer derived from
   * the difference between two poll results (Story 15's approach) — the backend writes a
   * notification row at the moment the event happens and `stores/notifications.ts` polls for
   * them, so a change is reported once, to the right person, whether or not this screen is open.
   */
  const loadTickets = async (options: { silent?: boolean } = {}): Promise<void> => {
    if (!options.silent) loading.value = true;
    error.value = null;
    try {
      tickets.value = await fetchTickets(scopeToFilter(scope.value));
    } catch (cause) {
      // A failed background poll must not wipe the list the user is looking at.
      if (!options.silent) tickets.value = [];
      error.value = toErrorMessage(cause, 'Unable to load tickets');
    } finally {
      loading.value = false;
    }
  };

  const loadCategories = async (): Promise<void> => {
    try {
      categories.value = await fetchTicketCategories();
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load ticket categories');
    }
  };

  const setScope = async (next: TicketScope): Promise<void> => {
    scope.value = next;
    await loadTickets();
  };

  const loadTicketDetail = async (ticketId: number, options: { silent?: boolean } = {}): Promise<void> => {
    if (!options.silent) detailLoading.value = true;
    error.value = null;
    try {
      const [ticket, ticketTimeline] = await Promise.all([
        fetchTicket(ticketId),
        fetchTicketTimeline(ticketId)
      ]);

      selectedTicket.value = ticket;
      timeline.value = ticketTimeline;
    } catch (cause) {
      if (!options.silent) selectedTicket.value = null;
      error.value = toErrorMessage(cause, 'Unable to load the ticket');
    } finally {
      detailLoading.value = false;
    }
  };

  /** Clears the open ticket so navigating between tickets never shows the previous one's data. */
  const resetDetail = (): void => {
    selectedTicket.value = null;
    timeline.value = [];
  };

  const submitTicket = async (payload: CreateTicketPayload): Promise<Ticket | null> => {
    error.value = null;
    notice.value = null;
    try {
      const created = await createTicket(payload);
      tickets.value = [created, ...tickets.value];
      notice.value = `Ticket #${created.id} created`;
      return created;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to create the ticket');
      return null;
    }
  };

  /** Keeps the list row and the open detail in sync after any single-ticket mutation. */
  const applyUpdated = (updated: Ticket): void => {
    tickets.value = tickets.value.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry));
    if (selectedTicket.value?.id === updated.id) {
      selectedTicket.value = { ...selectedTicket.value, ...updated };
    }
  };

  const saveTicket = async (ticketId: number, payload: UpdateTicketPayload): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      applyUpdated(await updateTicket(ticketId, payload));
      notice.value = 'Ticket updated';
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to update the ticket');
      return false;
    }
  };

  const changeAssignee = async (ticketId: number, assignedToUserId: number | null): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      applyUpdated(await assignTicket(ticketId, assignedToUserId));
      notice.value = assignedToUserId === null ? 'Ticket unassigned' : 'Ticket assigned';
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to assign the ticket');
      return false;
    }
  };

  const claimTicket = async (ticketId: number): Promise<boolean> => {
    const myId = auth.user?.id;
    if (myId === undefined) return false;
    return changeAssignee(ticketId, myId);
  };

  const submitComment = async (ticketId: number, body: string): Promise<boolean> => {
    error.value = null;
    try {
      const created = await addTicketComment(ticketId, body);
      if (selectedTicket.value?.id === ticketId) {
        selectedTicket.value = {
          ...selectedTicket.value,
          comments: [...selectedTicket.value.comments, created]
        };
      }
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to add the comment');
      return false;
    }
  };

  const submitAttachment = async (ticketId: number, file: File): Promise<boolean> => {
    error.value = null;
    try {
      const created = await uploadTicketAttachment(ticketId, file);
      if (selectedTicket.value?.id === ticketId) {
        selectedTicket.value = {
          ...selectedTicket.value,
          attachments: [...selectedTicket.value.attachments, created]
        };
      }
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to upload the attachment');
      return false;
    }
  };

  const removeAttachment = async (ticketId: number, attachmentId: number): Promise<boolean> => {
    error.value = null;
    try {
      await deleteTicketAttachment(ticketId, attachmentId);
      if (selectedTicket.value?.id === ticketId) {
        selectedTicket.value = {
          ...selectedTicket.value,
          attachments: selectedTicket.value.attachments.filter((entry) => entry.id !== attachmentId)
        };
      }
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to delete the attachment');
      return false;
    }
  };

  const downloadAttachment = async (ticketId: number, attachment: TicketAttachment): Promise<void> => {
    try {
      await downloadTicketAttachment(ticketId, attachment.id, attachment.fileName);
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to download the attachment');
    }
  };

  return {
    tickets,
    categories,
    selectedTicket,
    timeline,
    scope,
    statusFilter,
    priorityFilter,
    categoryFilter,
    loading,
    detailLoading,
    error,
    notice,
    visibleTickets,
    counts,
    hasTickets,
    loadTickets,
    loadCategories,
    setScope,
    loadTicketDetail,
    resetDetail,
    submitTicket,
    saveTicket,
    changeAssignee,
    claimTicket,
    submitComment,
    submitAttachment,
    removeAttachment,
    downloadAttachment
  };
});
