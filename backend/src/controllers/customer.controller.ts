import { Request, Response } from 'express';
import { assertCustomerScope } from '../auth/scope';
import { getAuth } from '../middleware/auth.middleware';
import {
  addCustomerAttachment,
  addCustomerNote,
  createCustomer,
  deleteCustomerAttachment,
  getCustomerAttachmentOrThrow,
  getCustomerById,
  getCustomerTimeline,
  listCustomerAttachments,
  listCustomerNotes,
  listCustomers,
  updateCustomer
} from '../services/customer.service';
import { ok } from '../utils/apiResponse';

export const listCustomersHandler = async (req: Request, res: Response): Promise<void> => {
  const { search, status } = req.query as unknown as { search?: string; status?: string };
  const customers = await listCustomers({ search, status: status as never });
  res.json(ok(customers));
};

export const getCustomerHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await getCustomerById(id)));
};

export const createCustomerHandler = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(ok(await createCustomer(req.body), 'Customer created'));
};

export const updateCustomerHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await updateCustomer(id, req.body), 'Customer updated'));
};

export const getCustomerTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  assertCustomerScope(getAuth(req), id);
  const timeline = await getCustomerTimeline(id);
  res.json(ok(timeline));
};

export const listCustomerNotesHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await listCustomerNotes(id)));
};

export const addCustomerNoteHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { body } = req.body as { body: string };
  const auth = getAuth(req);
  res.status(201).json(ok(await addCustomerNote(id, auth.userId, body), 'Note added'));
};

export const listCustomerAttachmentsHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await listCustomerAttachments(id)));
};

export const createCustomerAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const auth = getAuth(req);
  // uploadCustomerAttachment (the middleware ahead of this handler) already rejects a
  // missing req.file with a 400, so req.file! is safe here.
  const attachment = await addCustomerAttachment(id, auth.userId, req.file!);
  res.status(201).json(ok(attachment, 'Attachment uploaded'));
};

export const downloadCustomerAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, attachmentId } = req.params as unknown as { id: number; attachmentId: number };
  const attachment = await getCustomerAttachmentOrThrow(id, attachmentId);
  res.download(attachment.storagePath, attachment.fileName);
};

export const deleteCustomerAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, attachmentId } = req.params as unknown as { id: number; attachmentId: number };
  await deleteCustomerAttachment(id, attachmentId);
  res.json(ok(null, 'Attachment deleted'));
};
