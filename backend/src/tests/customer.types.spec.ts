import { CUSTOMER_STATUSES } from '../customers/types';

describe('CUSTOMER_STATUSES', () => {
  it('has exactly four entries', () => {
    expect(CUSTOMER_STATUSES).toEqual(['ACTIVE', 'INACTIVE', 'PROSPECT', 'ARCHIVED']);
  });

  it('has no duplicate entries', () => {
    expect(new Set(CUSTOMER_STATUSES).size).toBe(CUSTOMER_STATUSES.length);
  });
});
