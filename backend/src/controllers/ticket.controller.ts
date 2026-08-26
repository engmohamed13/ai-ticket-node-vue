import { Request, Response } from 'express';
import { assertCustomerScope, isCustomerScoped, scopedCustomerId } from '../auth/scope';
import { getAuth } from '../middleware/auth.middleware';
import {
  addTicketAttachment,
  addTicketComment,
  assignTicket,
  createTicket,
  deleteTicketAttachment,
  getTicketAttachmentOrThrow,
  getTicketById,
  getTicketRowOrThrow,
  getTicketTimeline,
  listTicketAttachments,
  listTicketCategories,
  listTicketComments,
  listTickets,
  updateTicket
} from '../services/ticket.service';
import type { ListTicketsFilter } from '../services/ticket.service';
import { ok } from '../utils/apiResponse';

export const listTicketsHandler = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListTicketsFilter & { assignedToMe?: boolean };
  const auth = getAuth(req);
  // A customer-scoped token ignores the customerId query param entirely — it can only ever
  // see its own tickets, whatever it asks for.
  const scoped = scopedCustomerId(auth);
  const tickets = await listTickets({
    customerId: scoped ?? query.customerId,
    status: query.status,
    priority: query.priority,
    categoryId: query.categoryId,
    unassigned: query.unassigned,
    // `assignedToMe=true` is the dashboard's "My Tickets" tab — resolved server-side from the
    // token so the frontend never has to know its own user id.
    assignedToUserId: query.assignedToMe ? auth.userId : query.assignedToUserId
  });
  res.json(ok(tickets));
};

export const getTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const auth = getAuth(req);
  // Comments and attachments are the agents' internal work log. A CUSTOMER-role token holds
  // `tickets:read`, so it reaches this handler for its own ticket — it must not be served
  // those two lists at all.
  const ticket = await getTicketById(id, { includeInternal: !isCustomerScoped(auth) });
  assertCustomerScope(auth, ticket.customerId);
  res.json(ok(ticket));
};

export const getTicketTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  // Only the owning customerId is needed to authorise this, so skip the detail include.
  const ticket = await getTicketRowOrThrow(id);
  assertCustomerScope(getAuth(req), ticket.customerId);
  const timeline = await getTicketTimeline(id);
  res.json(ok(timeline));
};

export const createTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  // Defence in depth: role permissions are editable at runtime (PUT /api/roles/:id/permissions),
  // so a CUSTOMER-role token could in principle hold `tickets:manage`. If it does, it may still
  // only ever open a ticket against its own customer record.
  const scoped = scopedCustomerId(auth);
  const ticket = await createTicket({ ...req.body, customerId: scoped ?? req.body.customerId });
  res.status(201).json(ok(ticket, 'Ticket created'));
};

export const updateTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await updateTicket(id, req.body), 'Ticket updated'));
};

export const assignTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { assignedToUserId } = req.body as { assignedToUserId: number | null };
  const ticket = await assignTicket(id, assignedToUserId);
  res.json(ok(ticket, assignedToUserId === null ? 'Ticket unassigned' : 'Ticket assigned'));
};

export const listTicketCommentsHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await listTicketComments(id)));
};

export const addTicketCommentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { body } = req.body as { body: string };
  const auth = getAuth(req);
  res.status(201).json(ok(await addTicketComment(id, auth.userId, body), 'Comment added'));
};

export const listTicketAttachmentsHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await listTicketAttachments(id)));
};

export const createTicketAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const auth = getAuth(req);
  // uploadTicketAttachment (the middleware ahead of this handler) already rejects a missing
  // req.file with a 400, so req.file! is safe here.
  const attachment = await addTicketAttachment(id, auth.userId, req.file!);
  res.status(201).json(ok(attachment, 'Attachment uploaded'));
};

export const downloadTicketAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, attachmentId } = req.params as unknown as { id: number; attachmentId: number };
  const attachment = await getTicketAttachmentOrThrow(id, attachmentId);
  res.download(attachment.storagePath, attachment.fileName);
};

export const deleteTicketAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, attachmentId } = req.params as unknown as { id: number; attachmentId: number };
  await deleteTicketAttachment(id, attachmentId);
  res.json(ok(null, 'Attachment deleted'));
};

export const listTicketCategoriesHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(await listTicketCategories()));
};
