/**
 * The five in-app notification events from work item 6. Declared here as an `as const` tuple —
 * the single source of truth for the API layer and, hand-copied, for the frontend's icon map.
 * Same convention as CHANNELS in `src/channels/types.ts` and TICKET_STATUSES in
 * `src/tickets/types.ts`.
 */
export const NOTIFICATION_TYPES = [
  'ticket_assigned',
  'ticket_status_changed',
  'ticket_comment',
  'ticket_overdue',
  'feedback_received'
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** How many notifications a single list read returns, newest first. */
export const NOTIFICATION_PAGE_SIZE = 50;
