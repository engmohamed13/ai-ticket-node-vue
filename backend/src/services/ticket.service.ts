import { unlink } from 'node:fs/promises';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../db/prisma';
import {
  CLOSED_TICKET_STATUSES,
  DEFAULT_RESOLUTION_TIME_MINUTES,
  DEFAULT_RESPONSE_TIME_MINUTES
} from '../tickets/types';
import type { TicketPriority, TicketStatus } from '../tickets/types';
import { AppError } from '../utils/AppError';

export interface ListTicketsFilter {
  customerId?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToUserId?: number;
  categoryId?: number;
  /** `true` = only unassigned tickets. Cannot be combined with `assignedToUserId`. */
  unassigned?: boolean;
}

export interface CreateTicketInput {
  subject: string;
  customerId: number;
  categoryId?: number;
  priority?: TicketPriority;
  assignedToUserId?: number;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
}

export interface UpdateTicketInput {
  subject?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: number | null;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

/** The staff fields safe to embed in a ticket payload — never `passwordHash`. */
const userSummarySelect = { id: true, name: true, email: true } as const;

/** Everything a ticket list row needs: enough for the dashboard without the heavy relations. */
const ticketListInclude = {
  category: true,
  assignedTo: { select: userSummarySelect }
} as const;

/** The full ticket detail payload. `storagePath` is deliberately absent from the
 * attachment selection — the local disk location never leaves the server. */
const ticketDetailInclude = {
  category: true,
  assignedTo: { select: userSummarySelect },
  customer: { select: { id: true, name: true, email: true } },
  comments: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' }
  },
  attachments: {
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      ticketId: true,
      uploadedById: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'asc' }
  }
} as const satisfies Prisma.TicketInclude;

/** The same payload minus the internal work log. What a CUSTOMER-role token is allowed to
 * see of its own ticket: comments and attachments are agent-only. */
const ticketPublicInclude = {
  category: true,
  assignedTo: { select: userSummarySelect },
  customer: { select: { id: true, name: true, email: true } }
} as const satisfies Prisma.TicketInclude;

const buildTicketWhere = (filter: ListTicketsFilter): Prisma.TicketWhereInput => ({
  customerId: filter.customerId,
  status: filter.status,
  priority: filter.priority,
  categoryId: filter.categoryId,
  // `unassigned` and `assignedToUserId` are mutually exclusive at the route layer, so at
  // most one of these two branches ever contributes a clause.
  ...(filter.unassigned ? { assignedToUserId: null } : {}),
  ...(filter.assignedToUserId === undefined ? {} : { assignedToUserId: filter.assignedToUserId })
});

export const listTickets = (filter: ListTicketsFilter = {}) =>
  prisma.ticket.findMany({
    where: buildTicketWhere(filter),
    include: ticketListInclude,
    orderBy: { createdAt: 'desc' }
  });

/** Cheap existence + ownership check. Used by every write path that only needs to know the
 * ticket is real, without paying for the full detail include. */
export const getTicketRowOrThrow = async (id: number) => {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new AppError(404, `Ticket ${id} not found`);
  return ticket;
};

/**
 * `includeInternal: false` omits the agent-only comment and attachment lists — the shape a
 * CUSTOMER-role caller gets for its own ticket. Both keys are still returned, empty, so the
 * response shape stays stable for the frontend's TicketDetail type.
 */
export const getTicketById = async (id: number, options: { includeInternal?: boolean } = {}) => {
  const includeInternal = options.includeInternal ?? true;
  if (!includeInternal) {
    const publicTicket = await prisma.ticket.findUnique({ where: { id }, include: ticketPublicInclude });
    if (!publicTicket) throw new AppError(404, `Ticket ${id} not found`);
    return { ...publicTicket, comments: [], attachments: [] };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id }, include: ticketDetailInclude });
  if (!ticket) throw new AppError(404, `Ticket ${id} not found`);
  return ticket;
};

export const getTicketTimeline = async (ticketId: number) => {
  await getTicketRowOrThrow(ticketId);
  return prisma.interaction.findMany({ where: { ticketId }, orderBy: { occurredAt: 'asc' } });
};

const assertCategoryExists = async (categoryId: number): Promise<void> => {
  const category = await prisma.ticketCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError(404, `Ticket category ${categoryId} not found`);
};

/** An agent may only be assigned a ticket if they are an active staff user. A CUSTOMER-role
 * user is never a valid assignee — they are the person the ticket is *about*. */
const assertAssignableUser = async (userId: number): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) throw new AppError(404, `User ${userId} not found`);
  if (!user.isActive) throw new AppError(400, `User ${userId} is deactivated and cannot be assigned tickets`);
  if (user.role.key === 'CUSTOMER') {
    throw new AppError(400, `User ${userId} is a customer account and cannot be assigned tickets`);
  }
};

export const createTicket = async (input: CreateTicketInput) => {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new AppError(404, `Customer ${input.customerId} not found`);

  if (input.categoryId !== undefined) await assertCategoryExists(input.categoryId);
  if (input.assignedToUserId !== undefined) await assertAssignableUser(input.assignedToUserId);

  return prisma.ticket.create({
    data: {
      subject: input.subject,
      status: 'New',
      priority: input.priority ?? 'Medium',
      customerId: input.customerId,
      categoryId: input.categoryId ?? null,
      assignedToUserId: input.assignedToUserId ?? null,
      responseTimeMinutes: input.responseTimeMinutes ?? DEFAULT_RESPONSE_TIME_MINUTES,
      resolutionTimeMinutes: input.resolutionTimeMinutes ?? DEFAULT_RESOLUTION_TIME_MINUTES
    },
    include: ticketListInclude
  });
};

/**
 * The SLA clock. `respondedAt` is stamped the first time an agent does anything that counts
 * as a response — moving the ticket off `New`, or leaving a comment. `resolvedAt` is stamped
 * the first time the ticket reaches a closed status.
 *
 * Both are write-once: reopening a resolved ticket does **not** clear either timestamp, so
 * the original response/resolution times stay auditable. Story 13's edge cases documents this.
 */
const slaStamps = (
  current: { respondedAt: Date | null; resolvedAt: Date | null },
  nextStatus: TicketStatus | undefined,
  countsAsResponse: boolean,
  now: Date
): Prisma.TicketUncheckedUpdateInput => {
  const stamps: Prisma.TicketUncheckedUpdateInput = {};
  const responded = countsAsResponse || (nextStatus !== undefined && nextStatus !== 'New');
  if (responded && current.respondedAt === null) stamps.respondedAt = now;
  if (
    nextStatus !== undefined &&
    CLOSED_TICKET_STATUSES.includes(nextStatus) &&
    current.resolvedAt === null
  ) {
    stamps.resolvedAt = now;
  }
  return stamps;
};

export const updateTicket = async (id: number, input: UpdateTicketInput) => {
  const current = await getTicketRowOrThrow(id);
  if (input.categoryId !== undefined && input.categoryId !== null) {
    await assertCategoryExists(input.categoryId);
  }

  return prisma.ticket.update({
    where: { id },
    data: {
      ...(input.subject === undefined ? {} : { subject: input.subject }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.priority === undefined ? {} : { priority: input.priority }),
      ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
      ...(input.responseTimeMinutes === undefined ? {} : { responseTimeMinutes: input.responseTimeMinutes }),
      ...(input.resolutionTimeMinutes === undefined
        ? {}
        : { resolutionTimeMinutes: input.resolutionTimeMinutes }),
      ...slaStamps(current, input.status, false, new Date())
    },
    include: ticketListInclude
  });
};

/** `assignedToUserId: null` unassigns the ticket — that is a reassignment, not a validation error. */
export const assignTicket = async (id: number, assignedToUserId: number | null) => {
  await getTicketRowOrThrow(id);
  if (assignedToUserId !== null) await assertAssignableUser(assignedToUserId);

  return prisma.ticket.update({
    where: { id },
    data: { assignedToUserId },
    include: ticketListInclude
  });
};

const commentInclude = { author: { select: { id: true, name: true } } } as const;

export const listTicketComments = async (ticketId: number) => {
  await getTicketRowOrThrow(ticketId);
  return prisma.ticketComment.findMany({
    where: { ticketId },
    include: commentInclude,
    orderBy: { createdAt: 'asc' }
  });
};

export const addTicketComment = async (ticketId: number, authorId: number, body: string) => {
  const current = await getTicketRowOrThrow(ticketId);

  const comment = await prisma.ticketComment.create({
    data: { ticketId, authorId, body },
    include: commentInclude
  });

  // A comment is the other way an agent "responds" — stamp the SLA clock if this is the first one.
  const stamps = slaStamps(current, undefined, true, comment.createdAt);
  if (Object.keys(stamps).length > 0) {
    await prisma.ticket.update({ where: { id: ticketId }, data: stamps });
  }

  return comment;
};

/** Never expose the local disk path to a client. */
const toAttachmentDto = <T extends { storagePath: string }>(attachment: T): Omit<T, 'storagePath'> => {
  const { storagePath: _storagePath, ...dto } = attachment;
  return dto;
};

export const listTicketAttachments = async (ticketId: number) => {
  await getTicketRowOrThrow(ticketId);
  const attachments = await prisma.ticketAttachment.findMany({
    where: { ticketId },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' }
  });
  return attachments.map(toAttachmentDto);
};

export const addTicketAttachment = async (ticketId: number, uploadedById: number, file: UploadedFile) => {
  await getTicketRowOrThrow(ticketId);
  const attachment = await prisma.ticketAttachment.create({
    data: {
      ticketId,
      uploadedById,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: file.path
    },
    include: { uploadedBy: { select: { id: true, name: true } } }
  });
  return toAttachmentDto(attachment);
};

/** Internal — includes `storagePath`, unlike the list/create DTOs above. Used by the
 * download handler, which needs the real disk location. */
export const getTicketAttachmentOrThrow = async (ticketId: number, attachmentId: number) => {
  const attachment = await prisma.ticketAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.ticketId !== ticketId) {
    throw new AppError(404, `Attachment ${attachmentId} not found for ticket ${ticketId}`);
  }
  return attachment;
};

export const deleteTicketAttachment = async (ticketId: number, attachmentId: number): Promise<void> => {
  const attachment = await getTicketAttachmentOrThrow(ticketId, attachmentId);
  await prisma.ticketAttachment.delete({ where: { id: attachmentId } });
  // Best-effort, matching customer.service.ts: the database row is the source of truth, so a
  // file already gone from disk must not fail the request.
  await unlink(attachment.storagePath).catch(() => undefined);
};

export const listTicketCategories = () => prisma.ticketCategory.findMany({ orderBy: { name: 'asc' } });
