import { describe, it, expect } from 'vitest';
import { CLOSED_TICKET_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES } from '../types';

/**
 * Guards the hand-copied ticket vocabulary against a one-sided edit. There is no shared
 * package between `backend/` and `frontend/`, so `backend/src/tickets/types.ts` and
 * `frontend/src/types/index.ts` have to be changed together — this suite fails loudly if
 * only one side moves. Same role `authContract.spec.ts` plays for PERMISSIONS / ROLES.
 */
describe('ticket contract (must mirror backend/src/tickets/types.ts)', () => {
  it('TICKET_STATUSES has exactly the six workflow statuses, in backend order', () => {
    expect(TICKET_STATUSES).toHaveLength(6);
    expect([...TICKET_STATUSES]).toEqual(['New', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed']);
  });

  it('TICKET_PRIORITIES has exactly four entries, in backend order', () => {
    expect(TICKET_PRIORITIES).toHaveLength(4);
    expect([...TICKET_PRIORITIES]).toEqual(['Low', 'Medium', 'High', 'Urgent']);
  });

  it('CLOSED_TICKET_STATUSES matches the backend set used to stamp resolvedAt', () => {
    expect([...CLOSED_TICKET_STATUSES]).toEqual(['Resolved', 'Closed']);
  });

  it('every closed status is a real status', () => {
    for (const status of CLOSED_TICKET_STATUSES) {
      expect(TICKET_STATUSES).toContain(status);
    }
  });
});
