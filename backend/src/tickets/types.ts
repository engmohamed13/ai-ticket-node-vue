/**
 * The six ticket workflow statuses from work item 5. Declared here as an `as const` tuple —
 * the single source of truth for the API layer's `z.enum(TICKET_STATUSES)` validation and,
 * hand-copied, for the frontend's status dropdown. Same convention as CHANNELS in
 * `src/channels/types.ts` and CUSTOMER_STATUSES in `src/customers/types.ts`.
 *
 * No state machine is enforced: any status may follow any other. See the feature overview
 * for why (mini-module simplification).
 */
export const TICKET_STATUSES = ['New', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Statuses that count a ticket as finished — used to stamp `resolvedAt` and to filter the dashboard. */
export const CLOSED_TICKET_STATUSES: readonly TicketStatus[] = ['Resolved', 'Closed'];

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Seeded category names. Categories live in the `ticket_categories` table at runtime;
 * this tuple is only the seed's input, not a validation source. */
export const TICKET_CATEGORIES_PREDEFINED = [
  'Technical Support',
  'Billing',
  'Feature Request',
  'Bug Report',
  'General Inquiry'
] as const;
export type TicketCategoryPredefined = (typeof TICKET_CATEGORIES_PREDEFINED)[number];

/** Default SLA targets applied when a ticket is created without explicit values. */
export const DEFAULT_RESPONSE_TIME_MINUTES = 30;
export const DEFAULT_RESOLUTION_TIME_MINUTES = 480;
