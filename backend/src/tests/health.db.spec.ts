jest.mock('../db/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    systemInfo: { findUnique: jest.fn() }
  },
  disconnectPrisma: jest.fn().mockResolvedValue(undefined)
}));

import { prisma } from '../db/prisma';
import { getDatabaseHealth } from '../services/health.service';

const mockedQueryRaw = prisma.$queryRaw as unknown as jest.Mock;
const mockedFindUnique = prisma.systemInfo.findUnique as jest.Mock;

describe('getDatabaseHealth', () => {
  it('reports up with a numeric latency and schema version', async () => {
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedFindUnique.mockResolvedValue({ value: '1' });

    const health = await getDatabaseHealth();

    expect(health.status).toBe('up');
    expect(typeof health.latencyMs).toBe('number');
    expect(health.schemaVersion).toBe('1');
    expect(health.error).toBeNull();
  });

  it('reports down when the connection fails, and resolves rather than throwing', async () => {
    mockedQueryRaw.mockRejectedValue(new Error('P1001'));

    const health = await getDatabaseHealth();

    expect(health.status).toBe('down');
    expect(health.latencyMs).toBeNull();
    expect(health.error).toContain('P1001');
  });

  it('reports down when the database is reachable but unmigrated', async () => {
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedFindUnique.mockRejectedValue(new Error('P2021: table does not exist'));

    const health = await getDatabaseHealth();

    expect(health.status).toBe('down');
  });
});
