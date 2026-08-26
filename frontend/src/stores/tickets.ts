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
import { useNotificationsStore } from './notifications';
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
  const auth = useAuthStore();
  const notifications = useNotificationsStore();

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

  /** Previous poll result, keyed by id — the baseline the notification diff compares against. */
  const lastSeen = ref(new Map<number, { status: string; assignedToUserId: number | null }>());
  const lastSeenCommentCount = ref<number | null>(null);

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
   * Turns the difference between two poll results into notifications. Only fires for tickets
   * already seen once, so the first load of a queue never announces its whole backlog.
   */
  const notifyFromDiff = (incoming: Ticket[]): void => {
    const myId = auth.user?.id ?? null;
    const baseline = lastSeen.value;

    for (const ticket of incoming) {
      const previous = baseline.get(ticket.id);
      if (!previous) continue;

      if (previous.assignedToUserId !== ticket.assignedToUserId) {
        if (myId !== null && ticket.assignedToUserId === myId) {
          notifications.push('assignment', `Ticket #${ticket.id} was assigned to you`, ticket.id);
        } else if (myId !== null && previous.assignedToUserId === myId) {
          notifications.push('assignment', `Ticket #${ticket.id} was reassigned away from you`, ticket.id);
        }
      }

      if (previous.status !== ticket.status) {
        notifications.push('status', `Ticket #${ticket.id} moved to ${ticket.status}`, ticket.id);
      }
    }

    lastSeen.value = new Map(
      incoming.map((ticket) => [
        ticket.id,
        { status: ticket.status, assignedToUserId: ticket.assignedToUserId }
      ])
    );
  };

  const loadTickets = async (options: { silent?: boolean } = {}): Promise<void> => {
    if (!options.silent) loading.value = true;
    error.value = null;
    try {
      const incoming = await fetchTickets(scopeToFilter(scope.value));
      // A silent load is a background poll: that is the only case where a change is news.
      if (options.silent) notifyFromDiff(incoming);
      else
        lastSeen.value = new Map(
          incoming.map((ticket) => [
            ticket.id,
            { status: ticket.status, assignedToUserId: ticket.assignedToUserId }
          ])
        );
      tickets.value = incoming;
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

      if (options.silent && lastSeenCommentCount.value !== null) {
        const added = ticket.comments.length - lastSeenCommentCount.value;
        if (added > 0) {
          notifications.push(
            'comment',
            added === 1
              ? `New comment on ticket #${ticket.id}`
              : `${added} new comments on ticket #${ticket.id}`,
            ticket.id
          );
        }
      }

      selectedTicket.value = ticket;
      timeline.value = ticketTimeline;
      lastSeenCommentCount.value = ticket.comments.length;
    } catch (cause) {
      if (!options.silent) selectedTicket.value = null;
      error.value = toErrorMessage(cause, 'Unable to load the ticket');
    } finally {
      detailLoading.value = false;
    }
  };

  /** Drops the detail-poll baseline so navigating between tickets cannot mis-attribute comments. */
  const resetDetail = (): void => {
    selectedTicket.value = null;
    timeline.value = [];
    lastSeenCommentCount.value = null;
  };

  const submitTicket = async (payload: CreateTicketPayload): Promise<Ticket | null> => {
    error.value = null;
    notice.value = null;
    try {
      const created = await createTicket(payload);
      tickets.value = [created, ...tickets.value];
      lastSeen.value.set(created.id, {
        status: created.status,
        assignedToUserId: created.assignedToUserId
      });
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
    lastSeen.value.set(updated.id, {
      status: updated.status,
      assignedToUserId: updated.assignedToUserId
    });
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
        lastSeenCommentCount.value = selectedTicket.value.comments.length;
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
