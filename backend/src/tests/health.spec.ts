jest.mock('../db/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    systemInfo: { findUnique: jest.fn() }
  },
  disconnectPrisma: jest.fn().mockResolvedValue(undefined)
}));

import request from 'supertest';
import { prisma } from '../db/prisma';
import app from '../app';

const mockedQueryRaw = prisma.$queryRaw as unknown as jest.Mock;
const mockedFindUnique = prisma.systemInfo.findUnique as jest.Mock;

const givenDatabaseUp = (): void => {
  mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
  mockedFindUnique.mockResolvedValue({ value: '1' });
};

const givenDatabaseDown = (): void => {
  mockedQueryRaw.mockRejectedValue(new Error('P1001'));
};

describe('GET /api/health', () => {
  it('returns 200 with status ok when the database is up', async () => {
    givenDatabaseUp();

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.api.status).toBe('ok');
    expect(res.body.data.api.environment).toBe('test');
    expect(res.body.data.database.status).toBe('up');
  });

  it('returns 503 with status degraded when the database is down', async () => {
    givenDatabaseDown();

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.database.status).toBe('down');
  });

  it('returns verbose api fields when verbose=true', async () => {
    givenDatabaseUp();

    const res = await request(app).get('/api/health?verbose=true');

    expect(res.status).toBe(200);
    expect(typeof res.body.data.api.nodeVersion).toBe('string');
    expect(res.body.data.api.nodeVersion.length).toBeGreaterThan(0);
  });

  it('rejects unknown query parameters', async () => {
    const res = await request(app).get('/api/health?verbse=true');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });
});

describe('GET /api/health/db', () => {
  it('returns 200 when the database is up', async () => {
    givenDatabaseUp();

    const res = await request(app).get('/api/health/db');

    expect(res.status).toBe(200);
    expect(res.body.data.database.status).toBe('up');
  });

  it('returns 503 when the database is down', async () => {
    givenDatabaseDown();

    const res = await request(app).get('/api/health/db');

    expect(res.status).toBe(503);
    expect(res.body.data.database.status).toBe('down');
  });
});

describe('GET /api/unknown', () => {
  it('returns 404 in the error envelope', async () => {
    const res = await request(app).get('/api/unknown');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/docs.json', () => {
  it('returns the OpenAPI document', async () => {
    const res = await request(app).get('/api/docs.json');

    expect(res.status).toBe(200);
    expect(res.body.info.title).toBe('CustomerSupportCRM API');
  });
});
