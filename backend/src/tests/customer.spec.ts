import fs from 'node:fs';
import path from 'node:path';

jest.mock('../db/prisma', () => ({
  prisma: {
    customer: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    customerNote: { findMany: jest.fn(), create: jest.fn() },
    customerAttachment: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    interaction: { findMany: jest.fn() }
  }
}));

import request from 'supertest';
import { prisma } from '../db/prisma';
import app from '../app';
import { bearer } from './authTestHelper';

const mockedFindMany = prisma.customer.findMany as jest.Mock;
const mockedFindUnique = prisma.customer.findUnique as jest.Mock;
const mockedCreate = prisma.customer.create as jest.Mock;
const mockedUpdate = prisma.customer.update as jest.Mock;
const mockedInteractionFindMany = prisma.interaction.findMany as jest.Mock;
const mockedNoteFindMany = prisma.customerNote.findMany as jest.Mock;
const mockedNoteCreate = prisma.customerNote.create as jest.Mock;
const mockedAttachmentFindMany = prisma.customerAttachment.findMany as jest.Mock;
const mockedAttachmentCreate = prisma.customerAttachment.create as jest.Mock;
const mockedAttachmentFindUnique = prisma.customerAttachment.findUnique as jest.Mock;
const mockedAttachmentDelete = prisma.customerAttachment.delete as jest.Mock;

const readOnlyBearer = () => bearer({ permissions: ['customers:read'] });

const sampleCustomer = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  phone: null,
  company: null,
  address: null,
  city: null,
  country: null,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('GET /api/customers', () => {
  it('returns 200 with list of customers', async () => {
    mockedFindMany.mockResolvedValue([sampleCustomer]);

    const res = await request(app).get('/api/customers').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 1, name: 'John', email: 'john@example.com' });
    expect(mockedFindMany).toHaveBeenCalledWith({ where: { status: undefined }, orderBy: { name: 'asc' } });
  });

  it('applies search and status filters', async () => {
    mockedFindMany.mockResolvedValue([sampleCustomer]);

    const res = await request(app).get('/api/customers?search=acme&status=ACTIVE').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: 'acme', mode: 'insensitive' } },
          { email: { contains: 'acme', mode: 'insensitive' } },
          { phone: { contains: 'acme', mode: 'insensitive' } },
          { company: { contains: 'acme', mode: 'insensitive' } }
        ]
      },
      orderBy: { name: 'asc' }
    });
  });
});

describe('GET /api/customers/:id', () => {
  it('returns 200 with a mocked customer', async () => {
    mockedFindUnique.mockResolvedValue(sampleCustomer);

    const res = await request(app).get('/api/customers/1').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, email: 'john@example.com' });
  });

  it('returns 404 when the customer does not exist', async () => {
    mockedFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/customers/999').set('Authorization', bearer());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/customers', () => {
  it('returns 201 on success', async () => {
    mockedFindUnique.mockResolvedValue(null);
    mockedCreate.mockResolvedValue(sampleCustomer);

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', bearer())
      .send({ name: 'John', email: 'john@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: 1, email: 'john@example.com' });
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/customers').set('Authorization', bearer()).send({ name: 'John' });

    expect(res.status).toBe(400);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('returns 409 when the email is already taken', async () => {
    mockedFindUnique.mockResolvedValue(sampleCustomer);

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', bearer())
      .send({ name: 'Jane', email: 'john@example.com' });

    expect(res.status).toBe(409);
  });

  it('returns 403 for a read-only token', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', readOnlyBearer())
      .send({ name: 'John', email: 'john@example.com' });

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/customers/:id', () => {
  it('returns 200 on success', async () => {
    mockedFindUnique.mockResolvedValue(sampleCustomer);
    mockedUpdate.mockResolvedValue({ ...sampleCustomer, name: 'Johnny' });

    const res = await request(app)
      .patch('/api/customers/1')
      .set('Authorization', bearer())
      .send({ name: 'Johnny' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Johnny' });
  });

  it('returns 404 when the customer does not exist', async () => {
    mockedFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/customers/999')
      .set('Authorization', bearer())
      .send({ name: 'Johnny' });

    expect(res.status).toBe(404);
  });

  it('returns 409 on a conflicting email change', async () => {
    mockedFindUnique.mockResolvedValueOnce(sampleCustomer).mockResolvedValueOnce({ ...sampleCustomer, id: 2 });

    const res = await request(app)
      .patch('/api/customers/1')
      .set('Authorization', bearer())
      .send({ email: 'taken@example.com' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/customers/:id/notes', () => {
  it('returns 200 with a list of notes', async () => {
    mockedFindUnique.mockResolvedValue(sampleCustomer);
    mockedNoteFindMany.mockResolvedValue([
      { id: 1, body: 'hi', customerId: 1, authorId: 1, author: { id: 1, name: 'Admin' }, createdAt: new Date() }
    ]);

    const res = await request(app).get('/api/customers/1/notes').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/customers/:id/notes', () => {
  it('returns 201 and attributes the note to the authenticated user', async () => {
    mockedFindUnique.mockResolvedValue(sampleCustomer);
    mockedNoteCreate.mockResolvedValue({
      id: 1,
      body: 'test note',
      customerId: 1,
      authorId: 1,
      author: { id: 1, name: 'Admin' },
      createdAt: new Date()
    });

    const res = await request(app)
      .post('/api/customers/1/notes')
      .set('Authorization', bearer())
      .send({ body: 'test note' });

    expect(res.status).toBe(201);
    expect(mockedNoteCreate).toHaveBeenCalledWith({
      data: { customerId: 1, authorId: 1, body: 'test note' },
      include: { author: { select: { id: true, name: true } } }
    });
  });

  it('returns 403 for a read-only token', async () => {
    const res = await request(app)
      .post('/api/customers/1/notes')
      .set('Authorization', readOnlyBearer())
      .send({ body: 'test note' });

    expect(res.status).toBe(403);
    expect(mockedNoteCreate).not.toHaveBeenCalled();
  });
});

describe('GET /api/customers/:id/attachments', () => {
  it('returns 200 and never exposes storagePath', async () => {
    mockedFindUnique.mockResolvedValue(sampleCustomer);
    mockedAttachmentFindMany.mockResolvedValue([
      {
        id: 1,
        fileName: 'note.txt',
        mimeType: 'text/plain',
        sizeBytes: 12,
        storagePath: '/tmp/uploads-test/customers/1/note.txt',
        customerId: 1,
        uploadedById: 1,
        createdAt: new Date()
      }
    ]);

    const res = await request(app).get('/api/customers/1/attachments').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data[0]).not.toHaveProperty('storagePath');
  });
});

describe('POST /api/customers/:id/attachments', () => {
  afterAll(() => {
    fs.rmSync(path.join(process.cwd(), 'uploads-test'), { recursive: true, force: true });
  });

  it('returns 201 and never exposes storagePath', async () => {
    mockedFindUnique.mockResolvedValue(sampleCustomer);
    mockedAttachmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 1, ...data, createdAt: new Date() })
    );

    const res = await request(app)
      .post('/api/customers/1/attachments')
      .set('Authorization', bearer())
      .attach('file', Buffer.from('test content'), 'note.txt');

    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty('storagePath');
    expect(res.body.data).toMatchObject({ fileName: 'note.txt', mimeType: 'text/plain' });
  });

  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app).post('/api/customers/1/attachments').set('Authorization', bearer());

    expect(res.status).toBe(400);
  });
});

describe('GET /api/customers/:id/attachments/:attachmentId/download', () => {
  const filePath = path.join(process.cwd(), 'uploads-test', 'customers', '1', 'download-fixture.txt');

  beforeAll(() => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'downloadable content');
  });

  afterAll(() => {
    fs.rmSync(path.join(process.cwd(), 'uploads-test'), { recursive: true, force: true });
  });

  it('streams the file back', async () => {
    mockedAttachmentFindUnique.mockResolvedValue({
      id: 1,
      fileName: 'download-fixture.txt',
      mimeType: 'text/plain',
      sizeBytes: 20,
      storagePath: filePath,
      customerId: 1,
      uploadedById: 1,
      createdAt: new Date()
    });

    const res = await request(app)
      .get('/api/customers/1/attachments/1/download')
      .set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('download-fixture.txt');
  });
});

describe('DELETE /api/customers/:id/attachments/:attachmentId', () => {
  it('returns 200 on success', async () => {
    mockedAttachmentFindUnique.mockResolvedValue({
      id: 1,
      fileName: 'note.txt',
      mimeType: 'text/plain',
      sizeBytes: 12,
      storagePath: path.join(process.cwd(), 'uploads-test', 'customers', '1', 'nonexistent.txt'),
      customerId: 1,
      uploadedById: 1,
      createdAt: new Date()
    });
    mockedAttachmentDelete.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/customers/1/attachments/1')
      .set('Authorization', bearer());

    expect(res.status).toBe(200);
  });

  it('returns 404 when the attachment belongs to a different customer', async () => {
    mockedAttachmentFindUnique.mockResolvedValue({
      id: 1,
      fileName: 'note.txt',
      mimeType: 'text/plain',
      sizeBytes: 12,
      storagePath: '/tmp/uploads-test/customers/2/note.txt',
      customerId: 2,
      uploadedById: 1,
      createdAt: new Date()
    });

    const res = await request(app)
      .delete('/api/customers/1/attachments/1')
      .set('Authorization', bearer());

    expect(res.status).toBe(404);
    expect(mockedAttachmentDelete).not.toHaveBeenCalled();
  });
});

describe('GET /api/customers/:id/timeline', () => {
  it('returns 200 with interactions when customer exists', async () => {
    const customer = { id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() };
    const mockInteractions = [
      { id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hi', externalRef: 'email-123', customerId: 1, ticketId: null, occurredAt: new Date(), createdAt: new Date() }
    ];
    mockedFindUnique.mockResolvedValue(customer);
    mockedInteractionFindMany.mockResolvedValue(mockInteractions);

    const res = await request(app).get('/api/customers/1/timeline').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 1, channel: 'EMAIL', direction: 'INBOUND', body: 'hi', customerId: 1 });
    expect(mockedFindUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockedInteractionFindMany).toHaveBeenCalledWith({ where: { customerId: 1 }, orderBy: { occurredAt: 'asc' } });
  });

  it('returns 404 when customer does not exist', async () => {
    mockedFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/customers/999/timeline').set('Authorization', bearer());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
