export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface ApiHealth {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface DatabaseHealth {
  status: 'up' | 'down';
  latencyMs: number | null;
  schemaVersion: string | null;
  error: string | null;
}

export interface HealthPayload {
  status: 'ok' | 'degraded';
  api: ApiHealth;
  database: DatabaseHealth;
}

export const CHANNELS = ['EMAIL', 'WHATSAPP', 'LIVE_CHAT', 'SMS', 'WEB_FORM'] as const;
export type Channel = (typeof CHANNELS)[number];

export const INTERACTION_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type InteractionDirection = (typeof INTERACTION_DIRECTIONS)[number];

export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE', 'PROSPECT', 'ARCHIVED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: CustomerStatus;
}

export interface CustomerNote {
  id: number;
  body: string;
  customerId: number;
  authorId: number;
  author: { id: number; name: string };
  createdAt: string;
}

export interface CustomerAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  customerId: number;
  uploadedById: number;
  createdAt: string;
}

/**
 * Hand-copied from `backend/src/tickets/types.ts` — there is no shared package between
 * `backend/` and `frontend/`, the same relationship CHANNELS and CUSTOMER_STATUSES already
 * have. `src/tests/ticketContract.spec.ts` guards the copy against a one-sided edit.
 */
export const TICKET_STATUSES = ['New', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const CLOSED_TICKET_STATUSES: readonly TicketStatus[] = ['Resolved', 'Closed'];

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface TicketCategory {
  id: number;
  name: string;
  color: string | null;
  createdAt: string;
}

/** The staff summary the API embeds on a ticket — never the full user record. */
export interface TicketAssignee {
  id: number;
  name: string;
  email: string;
}

export interface TicketComment {
  id: number;
  body: string;
  ticketId: number;
  authorId: number;
  author: { id: number; name: string };
  createdAt: string;
}

export interface TicketAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  ticketId: number;
  uploadedById: number;
  uploadedBy?: { id: number; name: string };
  createdAt: string;
}

export interface Ticket {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerId: number;
  categoryId: number | null;
  category: TicketCategory | null;
  assignedToUserId: number | null;
  assignedTo: TicketAssignee | null;
  responseTimeMinutes: number | null;
  resolutionTimeMinutes: number | null;
  respondedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /api/tickets/:id` additionally embeds the customer and both relation lists. */
export interface TicketDetail extends Ticket {
  customer: { id: number; name: string; email: string };
  comments: TicketComment[];
  attachments: TicketAttachment[];
}

export interface CreateTicketPayload {
  subject: string;
  customerId: number;
  categoryId?: number;
  priority?: TicketPriority;
  assignedToUserId?: number;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
}

export interface UpdateTicketPayload {
  subject?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: number | null;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
}

/**
 * The satisfaction rating a customer leaves once a ticket is Resolved or Closed (Story 16).
 * One per ticket; never edited once submitted.
 */
export interface TicketFeedback {
  id: number;
  rating: number;
  comment: string | null;
  ticketId: number;
  customerId: number;
  createdAt: string;
  updatedAt: string;
}

export const FEEDBACK_RATING_MIN = 1;
export const FEEDBACK_RATING_MAX = 5;

export interface SubmitFeedbackPayload {
  rating: number;
  comment?: string;
}

/** A `Ticket` as the customer portal list returns it: category embedded, feedback summarised. */
export interface PortalTicket extends Ticket {
  feedback: { id: number; rating: number; createdAt: string } | null;
}

export interface CustomerPortalSummary {
  totalTickets: number;
  openTickets: number;
  pendingTickets: number;
  resolvedTickets: number;
  awaitingFeedback: number;
}

export interface Interaction {
  id: number;
  channel: Channel;
  direction: InteractionDirection;
  subject: string | null;
  body: string;
  externalRef: string;
  customerId: number;
  ticketId: number | null;
  occurredAt: string;
  createdAt: string;
}

export interface CreateInteractionPayload {
  channel: Channel;
  direction: InteractionDirection;
  customerId: number;
  ticketId?: number;
  subject?: string;
  body: string;
}

/** Management dashboard payloads, hand-copied from the backend DTOs (Story 21). */
export interface TicketsSummary {
  totalTickets: number;
  openTickets: number;
  pendingTickets: number;
  resolvedTickets: number;
  overdueTickets: number;
  unassignedTickets: number;
  byStatus: { status: TicketStatus; count: number }[];
  byPriority: { priority: TicketPriority; count: number }[];
}

export interface CustomerSatisfaction {
  /** `null`, not 0, when nothing has been rated yet. */
  averageRating: number | null;
  totalFeedback: number;
  ratingBreakdown: { rating: number; count: number }[];
}

export interface TicketTrendPoint {
  /** ISO week key, e.g. "2026-W35". */
  week: string;
  created: number;
  resolved: number;
}

export interface AgentWorkloadRow {
  agentId: number;
  agentName: string;
  totalAssigned: number;
  open: number;
  pending: number;
  resolved: number;
  overdue: number;
}

/**
 * In-app notification vocabulary, hand-copied from `backend/src/notifications/types.ts` —
 * there is no shared package between `backend/` and `frontend/`, the same relationship
 * TICKET_STATUSES already has. `src/tests/notificationContract.spec.ts` guards the copy.
 */
export const NOTIFICATION_TYPES = [
  'ticket_assigned',
  'ticket_status_changed',
  'ticket_comment',
  'ticket_overdue',
  'feedback_received'
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface AppNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedTicketId: number | null;
  relatedCustomerId: number | null;
  relatedFeedbackId: number | null;
  createdAt: string;
}

export interface NotificationInbox {
  items: AppNotification[];
  unreadCount: number;
}

/** Knowledge base vocabulary, hand-copied from the backend DTOs (Story 18). */
export interface KbCategory {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface KbArticleAuthor {
  id: number;
  name: string;
}

/** A search-result row. The markdown `body` is deliberately absent — only the detail read has it. */
export interface KbArticleSummary {
  id: number;
  title: string;
  summary: string | null;
  categoryId: number;
  category: KbCategory;
  isPublished: boolean;
  viewCount: number;
  authorId: number;
  author: KbArticleAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface KbArticle extends KbArticleSummary {
  body: string;
}

export interface CreateKbArticlePayload {
  title: string;
  body: string;
  categoryId: number;
  summary?: string;
  isPublished?: boolean;
}

export interface UpdateKbArticlePayload {
  title?: string;
  body?: string;
  categoryId?: number;
  summary?: string | null;
  isPublished?: boolean;
}

export const PERMISSIONS = [
  'users:read',
  'users:manage',
  'roles:read',
  'roles:manage',
  'orgunits:read',
  'orgunits:manage',
  'customers:read',
  'customers:manage',
  'tickets:read',
  'tickets:manage',
  'interactions:read',
  'interactions:create',
  'interactions:associate',
  'feedback:read',
  'feedback:write',
  'kb:read',
  'kb:manage',
  'reports:read'
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  'SYSTEM_ADMINISTRATOR',
  'CRM_MANAGER',
  'SUPPORT_SUPERVISOR',
  'SUPPORT_AGENT',
  'CUSTOMER',
  'REPORTING_USER'
] as const;
export type RoleKey = (typeof ROLES)[number];

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  roleKey: RoleKey;
  roleName: string;
  permissions: Permission[];
  customerId: number | null;
  department: { id: number; name: string } | null;
  branch: { id: number; name: string; code: string } | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  roleId: number;
  departmentId?: number;
  branchId?: number;
  customerId?: number;
}

export interface Role {
  id: number;
  key: RoleKey;
  name: string;
  description: string | null;
  permissions: Permission[];
}

export interface PermissionRecord {
  id: number;
  key: Permission;
  description: string;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  createdAt: string;
}

export interface Department {
  id: number;
  name: string;
  branchId: number;
  createdAt: string;
}
