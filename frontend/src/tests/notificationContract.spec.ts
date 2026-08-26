import { describe, it, expect } from 'vitest';
import { NOTIFICATION_TYPES } from '../types';

/**
 * Guards the hand-copied notification vocabulary against a one-sided edit. There is no shared
 * package between `backend/` and `frontend/`, so `backend/src/notifications/types.ts` and
 * `frontend/src/types/index.ts` have to change together — this suite fails loudly if only one
 * side moves. Same role `ticketContract.spec.ts` plays for the ticket vocabulary.
 */
describe('notification contract (must mirror backend/src/notifications/types.ts)', () => {
  it('NOTIFICATION_TYPES has exactly the five events, in backend order', () => {
    expect(NOTIFICATION_TYPES).toHaveLength(5);
    expect([...NOTIFICATION_TYPES]).toEqual([
      'ticket_assigned',
      'ticket_status_changed',
      'ticket_comment',
      'ticket_overdue',
      'feedback_received'
    ]);
  });
});
