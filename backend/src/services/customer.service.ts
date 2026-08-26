import { unlink } from 'node:fs/promises';
import { Prisma } from '../generated/prisma/client';
import type { CustomerStatus } from '../customers/types';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export interface ListCustomersFilter {
  search?: string;
  status?: CustomerStatus;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: CustomerStatus;
}

export type UpdateCustomerInput = Partial<CustomerInput>;

const buildCustomerWhere = (filter: ListCustomersFilter): Prisma.CustomerWhereInput => ({
  status: filter.status,
  ...(filter.search
    ? {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { email: { contains: filter.search, mode: 'insensitive' } },
          { phone: { contains: filter.search, mode: 'insensitive' } },
          { company: { contains: filter.search, mode: 'insensitive' } }
        ]
      }
    : {})
});

export const listCustomers = (filter: ListCustomersFilter = {}) =>
  prisma.customer.findMany({ where: buildCustomerWhere(filter), orderBy: { name: 'asc' } });

export const getCustomerById = async (id: number) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new AppError(404, `Customer ${id} not found`);
  return customer;
};

const assertEmailAvailable = async (email: string, excludeId?: number): Promise<void> => {
  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing && existing.id !== excludeId) {
    throw new AppError(409, `A customer with email ${email} already exists`);
  }
};

export const createCustomer = async (input: CustomerInput) => {
  await assertEmailAvailable(input.email);
  return prisma.customer.create({ data: { ...input, status: input.status ?? 'ACTIVE' } });
};

export const updateCustomer = async (id: number, input: UpdateCustomerInput) => {
  await getCustomerById(id);
  if (input.email !== undefined) {
    await assertEmailAvailable(input.email, id);
  }
  return prisma.customer.update({ where: { id }, data: input });
};

export const getCustomerTimeline = async (customerId: number) => {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError(404, `Customer ${customerId} not found`);
  return prisma.interaction.findMany({ where: { customerId }, orderBy: { occurredAt: 'asc' } });
};

const noteInclude = { author: { select: { id: true, name: true } } } as const;

export const listCustomerNotes = async (customerId: number) => {
  await getCustomerById(customerId);
  return prisma.customerNote.findMany({
    where: { customerId },
    include: noteInclude,
    orderBy: { createdAt: 'desc' }
  });
};

export const addCustomerNote = async (customerId: number, authorId: number, body: string) => {
  await getCustomerById(customerId);
  return prisma.customerNote.create({
    data: { customerId, authorId, body },
    include: noteInclude
  });
};

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

/** Never expose the local disk path to a client. */
const toAttachmentDto = <T extends { storagePath: string }>(attachment: T): Omit<T, 'storagePath'> => {
  const { storagePath: _storagePath, ...dto } = attachment;
  return dto;
};

export const listCustomerAttachments = async (customerId: number) => {
  await getCustomerById(customerId);
  const attachments = await prisma.customerAttachment.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' }
  });
  return attachments.map(toAttachmentDto);
};

export const addCustomerAttachment = async (customerId: number, uploadedById: number, file: UploadedFile) => {
  await getCustomerById(customerId);
  const attachment = await prisma.customerAttachment.create({
    data: {
      customerId,
      uploadedById,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: file.path
    }
  });
  return toAttachmentDto(attachment);
};

/** Internal — includes `storagePath`, unlike the list/create DTOs above. Used by the
 * download and delete handlers, which need the real disk location. */
export const getCustomerAttachmentOrThrow = async (customerId: number, attachmentId: number) => {
  const attachment = await prisma.customerAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.customerId !== customerId) {
    throw new AppError(404, `Attachment ${attachmentId} not found for customer ${customerId}`);
  }
  return attachment;
};

export const deleteCustomerAttachment = async (customerId: number, attachmentId: number): Promise<void> => {
  const attachment = await getCustomerAttachmentOrThrow(customerId, attachmentId);
  await prisma.customerAttachment.delete({ where: { id: attachmentId } });
  // Best-effort: the database row is the source of truth. If the file is already
  // missing (manual cleanup, a prior partial failure) this must not fail the request.
  await unlink(attachment.storagePath).catch(() => undefined);
};
