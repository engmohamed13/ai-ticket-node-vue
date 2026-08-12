import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
let token = '';
let testTicketId = 0;

beforeAll(async () => {
  // Clean database
  await prisma.comment.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.user.deleteMany({});

  // Seed test user
  const passwordHash = await bcrypt.hash('Password123!', 10);
  await prisma.user.create({
    data: {
      id: 9999,
      name: 'Test Admin',
      email: 'testadmin@example.com',
      passwordHash
    }
  });
});

afterAll(async () => {
  // Clean database
  await prisma.comment.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.$disconnect();
});

describe('Auth API Tests', () => {
  it('should fail login with invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'testadmin@example.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should successfully login and return JWT token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'testadmin@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    token = res.body.data.token;
  });
});

describe('Ticket API Tests', () => {
  it('should create a ticket with valid credentials and input', async () => {
    const res = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Main Test Ticket',
        description: 'This is the main test ticket description',
        priority: 'Medium'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('Open');
    testTicketId = res.body.data.id;
  });

  it('should fail ticket creation if title is missing', async () => {
    const res = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        priority: 'Medium'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should fail ticket creation if priority value is invalid', async () => {
    const res = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Invalid Priority Ticket',
        priority: 'SuperHigh'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid priority');
  });

  it('should allow transitioning ticket from Open to In Progress', async () => {
    const res = await request(app)
      .patch(`/tickets/${testTicketId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('In Progress');
  });

  it('should allow transitioning ticket from In Progress to Closed', async () => {
    const res = await request(app)
      .patch(`/tickets/${testTicketId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Closed' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Closed');
  });

  it('should reject transitioning ticket back from Closed to Open', async () => {
    const res = await request(app)
      .patch(`/tickets/${testTicketId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Open' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid status transition');
  });
});

describe('Search API Tests', () => {
  let matchedTicketId = 0;

  beforeAll(async () => {
    // Create extra tickets for search tests
    const ticket1 = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Target Search Ticket',
        description: 'Specific unique keyword target',
        priority: 'High'
      });
    matchedTicketId = ticket1.body.data.id;

    await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Unrelated Ticket',
        description: 'Other random description text',
        priority: 'Low'
      });
  });

  it('should search tickets by title', async () => {
    const res = await request(app)
      .get('/tickets?search=Target')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should return only target search ticket
    const match = res.body.data.find((t: any) => t.id === matchedTicketId);
    expect(match).toBeDefined();
    const other = res.body.data.find((t: any) => t.title === 'Unrelated Ticket');
    expect(other).toBeUndefined();
  });

  it('should search tickets by description', async () => {
    const res = await request(app)
      .get('/tickets?search=unique')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const match = res.body.data.find((t: any) => t.id === matchedTicketId);
    expect(match).toBeDefined();
    const other = res.body.data.find((t: any) => t.title === 'Unrelated Ticket');
    expect(other).toBeUndefined();
  });
});

describe('Comments API Cascade Delete Tests', () => {
  let cascadeTicketId = 0;

  beforeAll(async () => {
    const res = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Cascade Delete Ticket',
        priority: 'Low'
      });
    cascadeTicketId = res.body.data.id;

    // Create comment
    await request(app)
      .post(`/tickets/${cascadeTicketId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Cascade testing comment' });
  });

  it('should delete the ticket and cascade delete comments', async () => {
    // Verify comment exists first
    let comments = await prisma.comment.findMany({
      where: { ticketId: cascadeTicketId }
    });
    expect(comments.length).toBe(1);

    // Delete ticket
    const res = await request(app)
      .delete(`/tickets/${cascadeTicketId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify comment is cascade deleted
    comments = await prisma.comment.findMany({
      where: { ticketId: cascadeTicketId }
    });
    expect(comments.length).toBe(0);
  });
});
