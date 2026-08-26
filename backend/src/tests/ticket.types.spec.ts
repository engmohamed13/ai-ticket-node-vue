import {
  CLOSED_TICKET_STATUSES,
  TICKET_CATEGORIES_PREDEFINED,
  TICKET_PRIORITIES,
  TICKET_STATUSES
} from '../tickets/types';

describe('TICKET_STATUSES', () => {
  it('has exactly the six workflow statuses from work item 5, in order', () => {
    expect(TICKET_STATUSES).toEqual(['New', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed']);
  });

  it('has no duplicate entries', () => {
    expect(new Set(TICKET_STATUSES).size).toBe(TICKET_STATUSES.length);
  });

  it('lists every closed status as a real status', () => {
    for (const status of CLOSED_TICKET_STATUSES) {
      expect(TICKET_STATUSES).toContain(status);
    }
  });
});

describe('TICKET_PRIORITIES', () => {
  it('has exactly four entries', () => {
    expect(TICKET_PRIORITIES).toEqual(['Low', 'Medium', 'High', 'Urgent']);
  });

  it('has no duplicate entries', () => {
    expect(new Set(TICKET_PRIORITIES).size).toBe(TICKET_PRIORITIES.length);
  });
});

describe('TICKET_CATEGORIES_PREDEFINED', () => {
  it('has exactly five entries', () => {
    expect(TICKET_CATEGORIES_PREDEFINED).toHaveLength(5);
  });

  it('has no duplicate entries', () => {
    expect(new Set(TICKET_CATEGORIES_PREDEFINED).size).toBe(TICKET_CATEGORIES_PREDEFINED.length);
  });
});
