import { describe, it, expect } from 'vitest';
import {
  formatMinutes,
  isTicketOverdue,
  minutesSinceCreated,
  resolutionSlaState,
  responseSlaState
} from '../services/ticketSla';
import type { Ticket } from '../types';

const CREATED = '2026-08-26T10:00:00.000Z';
const createdMs = new Date(CREATED).getTime();
const minutes = (n: number) => createdMs + n * 60 * 1000;

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  subject: 'Test',
  status: 'Open',
  priority: 'Medium',
  customerId: 1,
  categoryId: null,
  category: null,
  assignedToUserId: null,
  assignedTo: null,
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 480,
  respondedAt: null,
  resolvedAt: null,
  createdAt: CREATED,
  updatedAt: CREATED,
  ...overrides
});

describe('responseSlaState', () => {
  it('is due while inside the target and unanswered', () => {
    expect(responseSlaState(ticket(), minutes(10))).toBe('due');
  });

  it('is overdue once the target passes with no response', () => {
    expect(responseSlaState(ticket(), minutes(31))).toBe('overdue');
  });

  it('is met when the response landed inside the target', () => {
    expect(responseSlaState(ticket({ respondedAt: new Date(minutes(20)).toISOString() }), minutes(500))).toBe(
      'met'
    );
  });

  it('is overdue when the response landed after the target, however late we look', () => {
    expect(responseSlaState(ticket({ respondedAt: new Date(minutes(45)).toISOString() }), minutes(50))).toBe(
      'overdue'
    );
  });

  it('is none when no target is set', () => {
    expect(responseSlaState(ticket({ responseTimeMinutes: null }), minutes(9999))).toBe('none');
  });
});

describe('resolutionSlaState', () => {
  it('is met when resolved inside the target', () => {
    expect(
      resolutionSlaState(ticket({ resolvedAt: new Date(minutes(300)).toISOString() }), minutes(600))
    ).toBe('met');
  });

  it('is overdue when still unresolved past the target', () => {
    expect(resolutionSlaState(ticket(), minutes(481))).toBe('overdue');
  });
});

describe('isTicketOverdue', () => {
  it('flags an unanswered ticket past its response target', () => {
    expect(isTicketOverdue(ticket(), minutes(31))).toBe(true);
  });

  it('does not flag an answered ticket that is still inside its resolution target', () => {
    expect(
      isTicketOverdue(ticket({ respondedAt: new Date(minutes(10)).toISOString() }), minutes(100))
    ).toBe(false);
  });

  it('flags an answered ticket past its resolution target', () => {
    expect(
      isTicketOverdue(ticket({ respondedAt: new Date(minutes(10)).toISOString() }), minutes(500))
    ).toBe(true);
  });

  it('never flags a Resolved ticket, even one answered late', () => {
    const late = ticket({
      status: 'Resolved',
      respondedAt: new Date(minutes(90)).toISOString(),
      resolvedAt: new Date(minutes(900)).toISOString()
    });
    expect(isTicketOverdue(late, minutes(1000))).toBe(false);
  });

  it('never flags a Closed ticket', () => {
    expect(isTicketOverdue(ticket({ status: 'Closed' }), minutes(9999))).toBe(false);
  });
});

describe('formatMinutes', () => {
  it('renders sub-hour values as minutes', () => {
    expect(formatMinutes(45)).toBe('45m');
  });

  it('renders whole hours without a minute part', () => {
    expect(formatMinutes(480)).toBe('8h');
  });

  it('renders mixed values as hours and minutes', () => {
    expect(formatMinutes(510)).toBe('8h 30m');
  });
});

describe('minutesSinceCreated', () => {
  it('measures from ticket creation', () => {
    expect(minutesSinceCreated(ticket(), new Date(minutes(90)).toISOString())).toBe(90);
  });

  it('never returns a negative figure', () => {
    expect(minutesSinceCreated(ticket(), new Date(minutes(-10)).toISOString())).toBe(0);
  });
});
