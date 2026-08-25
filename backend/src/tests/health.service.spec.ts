import { getApiHealth } from '../services/health.service';

describe('getApiHealth', () => {
  it('omits nodeVersion when not verbose', () => {
    const health = getApiHealth(false);

    expect(health).not.toHaveProperty('nodeVersion');
    expect(health).not.toHaveProperty('memoryRssBytes');
  });

  it('includes nodeVersion and memoryRssBytes when verbose', () => {
    const health = getApiHealth(true);

    expect(health).toHaveProperty('nodeVersion');
    expect(health).toHaveProperty('memoryRssBytes');
    expect(typeof (health as { nodeVersion: string }).nodeVersion).toBe('string');
  });

  it('produces a valid ISO timestamp', () => {
    const health = getApiHealth(false);

    expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
  });
});
