import type { NotificationType } from '../types';

/**
 * One decorative SVG path per notification type, shared by the toast stack and the
 * notification centre so the same event always looks the same in both places.
 * Purely decorative — every consumer renders these `aria-hidden`.
 */
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  ticket_assigned:
    'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM19 8v6M22 11h-6',
  ticket_status_changed: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  ticket_comment: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  ticket_overdue: 'M12 8v5M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  feedback_received:
    'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z'
};

/** Short human label for the type chip in the notification centre. */
export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  ticket_assigned: 'Assignment',
  ticket_status_changed: 'Status',
  ticket_comment: 'Comment',
  ticket_overdue: 'Overdue',
  feedback_received: 'Feedback'
};
