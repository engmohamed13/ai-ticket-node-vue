import fs from 'node:fs';
import path from 'node:path';

jest.mock('../db/prisma', () => ({
  prisma: {
    ticket: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    ticketCategory: { findMany: jest.fn(), findUnique: jest.fn() },
    ticketComment: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    ticketAttachment: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    customer: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    interaction: { findMany: jest.fn() }
  }
}));

import request from 'supertest';
import { prisma } from '../db/prisma';
import app from '../app';
import { bearer } from './authTestHelper';

const mockedTicketFindMany = prisma.ticket.findMany as jest.Mock;
const mockedTicketFindUnique = prisma.ticket.findUnique as jest.Mock;
const mockedTicketCreate = prisma.ticket.create as jest.Mock;
const mockedTicketUpdate = prisma.ticket.update as jest.Mock;
const mockedCategoryFindMany = prisma.ticketCategory.findMany as jest.Mock;
const mockedCategoryFindUnique = prisma.ticketCategory.findUnique as jest.Mock;
const mockedCommentFindMany = prisma.ticketComment.findMany as jest.Mock;
const mockedCommentCreate = prisma.ticketComment.create as jest.Mock;
const mockedAttachmentFindMany = prisma.ticketAttachment.findMany as jest.Mock;
const mockedAttachmentFindUnique = prisma.ticketAttachment.findUnique as jest.Mock;
const mockedAttachmentCreate = prisma.ticketAttachment.create as jest.Mock;
const mockedAttachmentDelete = prisma.ticketAttachment.delete as jest.Mock;
const mockedCustomerFindUnique = prisma.customer.findUnique as jest.Mock;
const mockedUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockedInteractionFindMany = prisma.interaction.findMany as jest.Mock;

const readOnlyBearer = () => bearer({ permissions: ['tickets:read'] });

const sampleTicket = {
  id: 1,
  subject: 'Test',
  status: 'Open',
  priority: 'Medium',
  customerId: 1,
  categoryId: null,
  assignedToUserId: null,
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 480,
  respondedAt: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const activeAgent = { id: 7, name: 'Agent', isActive: true, role: { key: 'SUPPORT_AGENT' } };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/tickets', () => {
  it('returns 200 with all tickets', async () => {
    mockedTicketFindMany.mockResolvedValue([sampleTicket]);

    const res = await request(app).get('/api/tickets').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 1, subject: 'Test', status: 'Open', customerId: 1 });
    expect(mockedTicketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { createdAt: 'desc' } })
    );
  });

  it('filters by customerId when provided', async () => {
    mockedTicketFindMany.mockResolvedValue([sampleTicket]);

    const res = await request(app).get('/api/tickets?customerId=1').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(mockedTicketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ customerId: 1 }) })
    );
  });

  it('filters by status and priority', async () => {
    mockedTicketFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/tickets?status=Pending&priority=Urgent')
      .set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(mockedTicketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'Pending', priority: 'Urgent' }) })
    );
  });

  it('rejects a status outside TICKET_STATUSES with 400', async () => {
    const res = await request(app).get('/api/tickets?status=Nonsense').set('Authorization', bearer());

    expect(res.status).toBe(400);
    expect(mockedTicketFindMany).not.toHaveBeenCalled();
  });

  it('resolves assignedToMe against the caller own user id', async () => {
    mockedTicketFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/tickets?assignedToMe=true')
      .set('Authorization', bearer({ userId: 42 }));

    expect(res.status).toBe(200);
    expect(mockedTicketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ assignedToUserId: 42 }) })
    );
  });

  it('filters to unassigned tickets', async () => {
    mockedTicketFindMany.mockResolvedValue([]);

    const res = await request(app).get('/api/tickets?unassigned=true').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(mockedTicketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ assignedToUserId: null }) })
    );
  });

  it('rejects combining assignedToMe with assignedToUserId', async () => {
    const res = await request(app)
      .get('/api/tickets?assignedToMe=true&assignedToUserId=3')
      .set('Authorization', bearer());

    expect(res.status).toBe(400);
  });

  it('forces a customer-scoped token onto its own customerId', async () => {
    mockedTicketFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/tickets?customerId=999')
      .set('Authorization', bearer({ roleKey: 'CUSTOMER', customerId: 5, permissions: ['tickets:read'] }));

    expect(res.status).toBe(200);
    expect(mockedTicketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ customerId: 5 }) })
    );
  });
});

describe('GET /api/tickets/categories', () => {
  it('returns 200 with the category list', async () => {
    mockedCategoryFindMany.mockResolvedValue([{ id: 1, name: 'Billing', color: '#f59e0b', createdAt: new Date() }]);

    const res = await request(app).get('/api/tickets/categories').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ id: 1, name: 'Billing' });
    // The literal route must win over /:id — a 400 here would mean "categories" was
    // parsed as a ticket id.
    expect(mockedTicketFindUnique).not.toHaveBeenCalled();
  });
});

describe('GET /api/tickets/:id', () => {
  it('returns 200 with ticket when found', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, comments: [], attachments: [] });

    const res = await request(app).get('/api/tickets/1').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, subject: 'Test', status: 'Open', customerId: 1 });
  });

  it('returns 404 when ticket not found', async () => {
    mockedTicketFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/tickets/999').set('Authorization', bearer());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('withholds internal comments and attachments from a customer-scoped token', async () => {
    // The DB layer is mocked, so it hands back a ticket that still carries the internal
    // lists — the service must drop them for a CUSTOMER-role caller regardless.
    mockedTicketFindUnique.mockResolvedValue({
      ...sampleTicket,
      customerId: 1,
      comments: [{ id: 1, body: 'internal only', authorId: 1 }],
      attachments: [{ id: 1, fileName: 'internal.txt' }]
    });

    const res = await request(app)
      .get('/api/tickets/1')
      .set('Authorization', bearer({ roleKey: 'CUSTOMER', customerId: 1, permissions: ['tickets:read'] }));

    expect(res.status).toBe(200);
    expect(res.body.data.comments).toEqual([]);
    expect(res.body.data.attachments).toEqual([]);
  });

  it('still returns internal comments to a staff token', async () => {
    mockedTicketFindUnique.mockResolvedValue({
      ...sampleTicket,
      comments: [{ id: 1, body: 'internal only', authorId: 1 }],
      attachments: []
    });

    const res = await request(app).get('/api/tickets/1').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data.comments).toHaveLength(1);
  });

  it('returns 403 when a customer-scoped token asks for another customer ticket', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, customerId: 1, comments: [], attachments: [] });

    const res = await request(app)
      .get('/api/tickets/1')
      .set('Authorization', bearer({ roleKey: 'CUSTOMER', customerId: 2, permissions: ['tickets:read'] }));

    expect(res.status).toBe(403);
  });
});

describe('GET /api/tickets/:id/timeline', () => {
  it('returns 200 with interactions when ticket exists', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, comments: [], attachments: [] });
    mockedInteractionFindMany.mockResolvedValue([
      {
        id: 1,
        channel: 'EMAIL',
        direction: 'INBOUND',
        subject: null,
        body: 'hi',
        externalRef: 'email-123',
        customerId: 1,
        ticketId: 1,
        occurredAt: new Date(),
        createdAt: new Date()
      }
    ]);

    const res = await request(app).get('/api/tickets/1/timeline').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 1, channel: 'EMAIL', direction: 'INBOUND', ticketId: 1 });
    expect(mockedInteractionFindMany).toHaveBeenCalledWith({
      where: { ticketId: 1 },
      orderBy: { occurredAt: 'asc' }
    });
  });

  it('returns 404 when ticket not found', async () => {
    mockedTicketFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/tickets/999/timeline').set('Authorization', bearer());

    expect(res.status).toBe(404);
  });
});

describe('POST /api/tickets', () => {
  it('creates a ticket with status New and the default SLA targets', async () => {
    mockedCustomerFindUnique.mockResolvedValue({ id: 1, name: 'Demo' });
    mockedTicketCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 9, ...data, createdAt: new Date(), updatedAt: new Date() })
    );

    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', bearer())
      .send({ subject: 'Printer offline', customerId: 1, priority: 'High' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      subject: 'Printer offline',
      status: 'New',
      priority: 'High',
      responseTimeMinutes: 30,
      resolutionTimeMinutes: 480
    });
  });

  it('returns 403 without tickets:manage', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', readOnlyBearer())
      .send({ subject: 'Printer offline', customerId: 1 });

    expect(res.status).toBe(403);
    expect(mockedTicketCreate).not.toHaveBeenCalled();
  });

  it('returns 404 when the customer does not exist', async () => {
    mockedCustomerFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', bearer())
      .send({ subject: 'Printer offline', customerId: 404 });

    expect(res.status).toBe(404);
  });

  it('returns 400 on an empty subject', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', bearer())
      .send({ subject: '', customerId: 1 });

    expect(res.status).toBe(400);
  });

  it('rejects an unknown field', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', bearer())
      .send({ subject: 'Printer offline', customerId: 1, sttatus: 'Open' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tickets/:id', () => {
  it('stamps respondedAt the first time the status leaves New', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, status: 'New', respondedAt: null });
    mockedTicketUpdate.mockResolvedValue({ ...sampleTicket, status: 'Open' });

    const res = await request(app)
      .patch('/api/tickets/1')
      .set('Authorization', bearer())
      .send({ status: 'Open' });

    expect(res.status).toBe(200);
    const { data } = mockedTicketUpdate.mock.calls[0][0];
    expect(data.status).toBe('Open');
    expect(data.respondedAt).toBeInstanceOf(Date);
    expect(data.resolvedAt).toBeUndefined();
  });

  it('does not overwrite an existing respondedAt', async () => {
    const alreadyResponded = new Date('2026-01-01T00:00:00.000Z');
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, respondedAt: alreadyResponded });
    mockedTicketUpdate.mockResolvedValue(sampleTicket);

    await request(app)
      .patch('/api/tickets/1')
      .set('Authorization', bearer())
      .send({ status: 'In Progress' });

    expect(mockedTicketUpdate.mock.calls[0][0].data.respondedAt).toBeUndefined();
  });

  it('stamps resolvedAt when the ticket reaches Resolved', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, respondedAt: new Date(), resolvedAt: null });
    mockedTicketUpdate.mockResolvedValue({ ...sampleTicket, status: 'Resolved' });

    const res = await request(app)
      .patch('/api/tickets/1')
      .set('Authorization', bearer())
      .send({ status: 'Resolved' });

    expect(res.status).toBe(200);
    expect(mockedTicketUpdate.mock.calls[0][0].data.resolvedAt).toBeInstanceOf(Date);
  });

  it('does not clear resolvedAt when a resolved ticket is reopened', async () => {
    const resolvedAt = new Date('2026-02-02T00:00:00.000Z');
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, respondedAt: new Date(), resolvedAt });
    mockedTicketUpdate.mockResolvedValue(sampleTicket);

    await request(app).patch('/api/tickets/1').set('Authorization', bearer()).send({ status: 'Open' });

    expect(mockedTicketUpdate.mock.calls[0][0].data).not.toHaveProperty('resolvedAt');
  });

  it('returns 404 when the ticket does not exist', async () => {
    mockedTicketFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/tickets/999')
      .set('Authorization', bearer())
      .send({ status: 'Open' });

    expect(res.status).toBe(404);
  });

  it('returns 404 when the category does not exist', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedCategoryFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/tickets/1')
      .set('Authorization', bearer())
      .send({ categoryId: 77 });

    expect(res.status).toBe(404);
    expect(mockedTicketUpdate).not.toHaveBeenCalled();
  });

  it('clears the category when categoryId is null', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedTicketUpdate.mockResolvedValue(sampleTicket);

    const res = await request(app)
      .patch('/api/tickets/1')
      .set('Authorization', bearer())
      .send({ categoryId: null });

    expect(res.status).toBe(200);
    expect(mockedTicketUpdate.mock.calls[0][0].data.categoryId).toBeNull();
    expect(mockedCategoryFindUnique).not.toHaveBeenCalled();
  });

  it('returns 400 on an invalid status', async () => {
    const res = await request(app)
      .patch('/api/tickets/1')
      .set('Authorization', bearer())
      .send({ status: 'Escalated' });

    expect(res.status).toBe(400);
  });

  it('returns 400 on an empty body', async () => {
    const res = await request(app).patch('/api/tickets/1').set('Authorization', bearer()).send({});

    expect(res.status).toBe(400);
  });

  it('returns 403 without tickets:manage', async () => {
    const res = await request(app)
      .patch('/api/tickets/1')
      .set('Authorization', readOnlyBearer())
      .send({ status: 'Open' });

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/tickets/:id/assign', () => {
  it('assigns the ticket to an active staff user', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedUserFindUnique.mockResolvedValue(activeAgent);
    mockedTicketUpdate.mockResolvedValue({ ...sampleTicket, assignedToUserId: 7 });

    const res = await request(app)
      .patch('/api/tickets/1/assign')
      .set('Authorization', bearer())
      .send({ assignedToUserId: 7 });

    expect(res.status).toBe(200);
    expect(mockedTicketUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { assignedToUserId: 7 } })
    );
  });

  it('unassigns when assignedToUserId is null', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedTicketUpdate.mockResolvedValue({ ...sampleTicket, assignedToUserId: null });

    const res = await request(app)
      .patch('/api/tickets/1/assign')
      .set('Authorization', bearer())
      .send({ assignedToUserId: null });

    expect(res.status).toBe(200);
    expect(mockedUserFindUnique).not.toHaveBeenCalled();
    expect(mockedTicketUpdate.mock.calls[0][0].data).toEqual({ assignedToUserId: null });
  });

  it('returns 404 when the assignee does not exist', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedUserFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/tickets/1/assign')
      .set('Authorization', bearer())
      .send({ assignedToUserId: 404 });

    expect(res.status).toBe(404);
    expect(mockedTicketUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when the assignee is deactivated', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedUserFindUnique.mockResolvedValue({ ...activeAgent, isActive: false });

    const res = await request(app)
      .patch('/api/tickets/1/assign')
      .set('Authorization', bearer())
      .send({ assignedToUserId: 7 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the assignee is a customer account', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedUserFindUnique.mockResolvedValue({ ...activeAgent, role: { key: 'CUSTOMER' } });

    const res = await request(app)
      .patch('/api/tickets/1/assign')
      .set('Authorization', bearer())
      .send({ assignedToUserId: 7 });

    expect(res.status).toBe(400);
  });

  it('returns 403 without tickets:manage', async () => {
    const res = await request(app)
      .patch('/api/tickets/1/assign')
      .set('Authorization', readOnlyBearer())
      .send({ assignedToUserId: 7 });

    expect(res.status).toBe(403);
  });
});

describe('ticket comments', () => {
  it('lists comments oldest first', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedCommentFindMany.mockResolvedValue([
      { id: 1, body: 'first', ticketId: 1, authorId: 1, author: { id: 1, name: 'Agent' }, createdAt: new Date() }
    ]);

    const res = await request(app).get('/api/tickets/1/comments').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(mockedCommentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ticketId: 1 }, orderBy: { createdAt: 'asc' } })
    );
  });

  it('adds a comment attributed to the caller', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, respondedAt: new Date() });
    mockedCommentCreate.mockResolvedValue({
      id: 1,
      body: 'Looking into it',
      ticketId: 1,
      authorId: 42,
      author: { id: 42, name: 'Agent' },
      createdAt: new Date()
    });

    const res = await request(app)
      .post('/api/tickets/1/comments')
      .set('Authorization', bearer({ userId: 42 }))
      .send({ body: 'Looking into it' });

    expect(res.status).toBe(201);
    expect(mockedCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ticketId: 1, authorId: 42, body: 'Looking into it' } })
    );
  });

  it('stamps respondedAt on the first comment', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, respondedAt: null });
    const createdAt = new Date();
    mockedCommentCreate.mockResolvedValue({
      id: 1,
      body: 'First reply',
      ticketId: 1,
      authorId: 1,
      author: { id: 1, name: 'Agent' },
      createdAt
    });
    mockedTicketUpdate.mockResolvedValue(sampleTicket);

    const res = await request(app)
      .post('/api/tickets/1/comments')
      .set('Authorization', bearer())
      .send({ body: 'First reply' });

    expect(res.status).toBe(201);
    expect(mockedTicketUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { respondedAt: createdAt } });
  });

  it('does not touch the ticket when respondedAt is already set', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...sampleTicket, respondedAt: new Date() });
    mockedCommentCreate.mockResolvedValue({
      id: 2,
      body: 'Another reply',
      ticketId: 1,
      authorId: 1,
      author: { id: 1, name: 'Agent' },
      createdAt: new Date()
    });

    await request(app)
      .post('/api/tickets/1/comments')
      .set('Authorization', bearer())
      .send({ body: 'Another reply' });

    expect(mockedTicketUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 on an empty comment body', async () => {
    const res = await request(app)
      .post('/api/tickets/1/comments')
      .set('Authorization', bearer())
      .send({ body: '   ' });

    expect(res.status).toBe(400);
  });

  it('returns 403 for a read-only token — comments are internal', async () => {
    const res = await request(app).get('/api/tickets/1/comments').set('Authorization', readOnlyBearer());

    expect(res.status).toBe(403);
  });
});

describe('ticket attachments', () => {
  afterAll(() => {
    fs.rmSync(path.join(process.cwd(), 'uploads-test'), { recursive: true, force: true });
  });

  it('lists attachments without storagePath', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedAttachmentFindMany.mockResolvedValue([
      {
        id: 1,
        fileName: 'log.txt',
        mimeType: 'text/plain',
        sizeBytes: 12,
        storagePath: '/disk/log.txt',
        ticketId: 1,
        uploadedById: 1,
        uploadedBy: { id: 1, name: 'Agent' },
        createdAt: new Date()
      }
    ]);

    const res = await request(app).get('/api/tickets/1/attachments').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data[0]).not.toHaveProperty('storagePath');
    expect(res.body.data[0]).toMatchObject({ fileName: 'log.txt' });
  });

  it('returns 201 on upload and never exposes storagePath', async () => {
    mockedTicketFindUnique.mockResolvedValue(sampleTicket);
    mockedAttachmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 1, ...data, uploadedBy: { id: 1, name: 'Agent' }, createdAt: new Date() })
    );

    const res = await request(app)
      .post('/api/tickets/1/attachments')
      .set('Authorization', bearer())
      .attach('file', Buffer.from('log content'), 'log.txt');

    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty('storagePath');
    expect(res.body.data).toMatchObject({ fileName: 'log.txt', mimeType: 'text/plain' });
  });

  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app).post('/api/tickets/1/attachments').set('Authorization', bearer());

    expect(res.status).toBe(400);
  });

  it('returns 403 listing attachments without tickets:manage — they are internal', async () => {
    const res = await request(app).get('/api/tickets/1/attachments').set('Authorization', readOnlyBearer());

    expect(res.status).toBe(403);
    expect(mockedAttachmentFindMany).not.toHaveBeenCalled();
  });

  it('returns 403 downloading an attachment without tickets:manage', async () => {
    const res = await request(app)
      .get('/api/tickets/1/attachments/1/download')
      .set('Authorization', readOnlyBearer());

    expect(res.status).toBe(403);
    expect(mockedAttachmentFindUnique).not.toHaveBeenCalled();
  });

  it('returns 403 without tickets:manage on upload', async () => {
    const res = await request(app)
      .post('/api/tickets/1/attachments')
      .set('Authorization', readOnlyBearer())
      .attach('file', Buffer.from('log content'), 'log.txt');

    expect(res.status).toBe(403);
    expect(mockedAttachmentCreate).not.toHaveBeenCalled();
  });

  it('returns 404 downloading an attachment that belongs to another ticket', async () => {
    mockedAttachmentFindUnique.mockResolvedValue({
      id: 1,
      fileName: 'log.txt',
      storagePath: '/disk/log.txt',
      ticketId: 2,
      uploadedById: 1,
      createdAt: new Date()
    });

    const res = await request(app)
      .get('/api/tickets/1/attachments/1/download')
      .set('Authorization', bearer());

    expect(res.status).toBe(404);
  });

  it('deletes an attachment', async () => {
    mockedAttachmentFindUnique.mockResolvedValue({
      id: 1,
      fileName: 'log.txt',
      storagePath: path.join(process.cwd(), 'uploads-test', 'tickets', '1', 'gone.txt'),
      ticketId: 1,
      uploadedById: 1,
      createdAt: new Date()
    });
    mockedAttachmentDelete.mockResolvedValue({});

    const res = await request(app).delete('/api/tickets/1/attachments/1').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(mockedAttachmentDelete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
