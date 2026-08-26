import { Prisma } from '../generated/prisma/client';
import { prisma } from '../db/prisma';
import { SLA_SELECT, isTicketOverdue } from '../tickets/sla';
import {
  CLOSED_TICKET_STATUSES,
  FEEDBACK_RATING_MAX,
  FEEDBACK_RATING_MIN,
  TICKET_PRIORITIES,
  TICKET_STATUSES
} from '../tickets/types';
import type { TicketPriority, TicketStatus } from '../tickets/types';

/**
 * Every dashboard panel accepts the same filter set, so "Reports can be filtered" means one
 * date range and one set of narrowing choices applied consistently across the KPIs.
 */
export interface DashboardFilter {
  startDate?: Date;
  endDate?: Date;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToUserId?: number;
}

export interface TicketsSummary {
  totalTickets: number;
  openTickets: number;
  pendingTickets: number;
  resolvedTickets: number;
  overdueTickets: number;
  unassignedTickets: number;
  byStatus: { status: TicketStatus; count: number }[];
  byPriority: { priority: TicketPriority; count: number }[];
}

export interface CustomerSatisfaction {
  averageRating: number | null;
  totalFeedback: number;
  ratingBreakdown: { rating: number; count: number }[];
}

export interface TicketTrendPoint {
  /** ISO week key, e.g. "2026-W35". Sorts lexicographically into chronological order. */
  week: string;
  created: number;
  resolved: number;
}

export interface AgentWorkloadRow {
  agentId: number;
  agentName: string;
  totalAssigned: number;
  open: number;
  pending: number;
  resolved: number;
  overdue: number;
}

/** "Open" on this dashboard means actively worked: everything before Pending. */
const OPEN_STATUSES: readonly TicketStatus[] = ['New', 'Open', 'In Progress'];

/**
 * The date range applies to when a ticket was *created*, which is what makes "tickets this
 * month" mean the same thing on every panel. An open-ended range is allowed on either side.
 */
const buildTicketWhere = (filter: DashboardFilter): Prisma.TicketWhereInput => ({
  ...(filter.status === undefined ? {} : { status: filter.status }),
  ...(filter.priority === undefined ? {} : { priority: filter.priority }),
  ...(filter.assignedToUserId === undefined ? {} : { assignedToUserId: filter.assignedToUserId }),
  ...(filter.startDate === undefined && filter.endDate === undefined
    ? {}
    : {
        createdAt: {
          ...(filter.startDate === undefined ? {} : { gte: filter.startDate }),
          ...(filter.endDate === undefined ? {} : { lte: filter.endDate })
        }
      })
});

/**
 * Overdue cannot be expressed as a Prisma `where` — it compares `createdAt + targetMinutes`
 * against now, per row — so the matching tickets are counted in application code. The select
 * is narrowed to the SLA columns so this stays cheap at mini-module scale.
 */
const countOverdue = async (where: Prisma.TicketWhereInput, now: Date): Promise<number> => {
  const candidates = await prisma.ticket.findMany({
    where: { ...where, status: { notIn: [...CLOSED_TICKET_STATUSES] } },
    select: SLA_SELECT
  });
  return candidates.filter((ticket) => isTicketOverdue(ticket, now)).length;
};

export const getTicketsSummary = async (
  filter: DashboardFilter = {},
  now: Date = new Date()
): Promise<TicketsSummary> => {
  const where = buildTicketWhere(filter);

  const [totalTickets, unassignedTickets, statusGroups, priorityGroups, overdueTickets] =
    await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { ...where, assignedToUserId: null } }),
      prisma.ticket.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ['priority'], where, _count: { _all: true } }),
      countOverdue(where, now)
    ]);

  const countFor = (groups: { _count: { _all: number } }[], key: string, field: string): number =>
    groups.find((group) => (group as unknown as Record<string, string>)[field] === key)?._count._all ?? 0;

  // Every status and priority is present, zero included: a distribution chart with a
  // disappearing category is harder to read than one with an empty bar.
  const byStatus = TICKET_STATUSES.map((status) => ({
    status,
    count: countFor(statusGroups, status, 'status')
  }));
  const byPriority = TICKET_PRIORITIES.map((priority) => ({
    priority,
    count: countFor(priorityGroups, priority, 'priority')
  }));

  const sumOf = (statuses: readonly TicketStatus[]): number =>
    byStatus.filter((entry) => statuses.includes(entry.status)).reduce((sum, e) => sum + e.count, 0);

  return {
    totalTickets,
    openTickets: sumOf(OPEN_STATUSES),
    pendingTickets: sumOf(['Pending']),
    resolvedTickets: sumOf(CLOSED_TICKET_STATUSES),
    overdueTickets,
    unassignedTickets,
    byStatus,
    byPriority
  };
};

export const getCustomerSatisfaction = async (
  filter: DashboardFilter = {}
): Promise<CustomerSatisfaction> => {
  // Feedback is filtered by when it was *left*, not when the ticket was opened — a satisfaction
  // score for "this month" means the ratings received this month.
  const where: Prisma.TicketFeedbackWhereInput =
    filter.startDate === undefined && filter.endDate === undefined
      ? {}
      : {
          createdAt: {
            ...(filter.startDate === undefined ? {} : { gte: filter.startDate }),
            ...(filter.endDate === undefined ? {} : { lte: filter.endDate })
          }
        };

  const groups = await prisma.ticketFeedback.groupBy({
    by: ['rating'],
    where,
    _count: { _all: true }
  });

  const ratingBreakdown = [];
  for (let rating = FEEDBACK_RATING_MIN; rating <= FEEDBACK_RATING_MAX; rating += 1) {
    ratingBreakdown.push({
      rating,
      count: groups.find((group) => group.rating === rating)?._count._all ?? 0
    });
  }

  const totalFeedback = ratingBreakdown.reduce((sum, entry) => sum + entry.count, 0);
  const weighted = ratingBreakdown.reduce((sum, entry) => sum + entry.rating * entry.count, 0);

  return {
    // `null`, not 0, when nobody has rated anything — a 0 would read as "everyone hated it".
    averageRating: totalFeedback === 0 ? null : Number((weighted / totalFeedback).toFixed(2)),
    totalFeedback,
    ratingBreakdown
  };
};

/** ISO-8601 week key. Padded so plain string sorting is chronological. */
export const isoWeekKey = (date: Date): string => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday of the current week decides the ISO year.
  const dayNumber = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

/**
 * Created-vs-resolved per week over the trailing `weeks` window. Every week in the window is
 * present, zero included, so the chart has no gaps where a quiet week was.
 */
export const getTicketTrends = async (
  weeks: number,
  filter: DashboardFilter = {},
  now: Date = new Date()
): Promise<TicketTrendPoint[]> => {
  const windowStart = new Date(now.getTime() - weeks * 7 * 86400000);
  const from = filter.startDate !== undefined && filter.startDate > windowStart ? filter.startDate : windowStart;

  const tickets = await prisma.ticket.findMany({
    where: {
      ...buildTicketWhere({ ...filter, startDate: undefined, endDate: undefined }),
      OR: [{ createdAt: { gte: from } }, { resolvedAt: { gte: from } }]
    },
    select: { createdAt: true, resolvedAt: true }
  });

  const buckets = new Map<string, { created: number; resolved: number }>();
  for (let index = weeks - 1; index >= 0; index -= 1) {
    buckets.set(isoWeekKey(new Date(now.getTime() - index * 7 * 86400000)), { created: 0, resolved: 0 });
  }

  for (const ticket of tickets) {
    const createdBucket = buckets.get(isoWeekKey(ticket.createdAt));
    if (createdBucket && ticket.createdAt >= from) createdBucket.created += 1;
    if (ticket.resolvedAt !== null) {
      const resolvedBucket = buckets.get(isoWeekKey(ticket.resolvedAt));
      if (resolvedBucket && ticket.resolvedAt >= from) resolvedBucket.resolved += 1;
    }
  }

  return [...buckets.entries()]
    .map(([week, counts]) => ({ week, ...counts }))
    .sort((a, b) => a.week.localeCompare(b.week));
};

/**
 * One row per staff user who currently holds at least one ticket, busiest first. Agents with
 * an empty queue are omitted: the panel answers "who is loaded", not "who exists".
 */
export const getAgentWorkload = async (
  filter: DashboardFilter = {},
  now: Date = new Date()
): Promise<AgentWorkloadRow[]> => {
  const where = buildTicketWhere(filter);

  const tickets = await prisma.ticket.findMany({
    where: { ...where, assignedToUserId: { not: null } },
    select: {
      assignedToUserId: true,
      assignedTo: { select: { id: true, name: true } },
      ...SLA_SELECT
    }
  });

  const rows = new Map<number, AgentWorkloadRow>();
  for (const ticket of tickets) {
    const agent = ticket.assignedTo;
    if (!agent) continue;

    const row =
      rows.get(agent.id) ??
      {
        agentId: agent.id,
        agentName: agent.name,
        totalAssigned: 0,
        open: 0,
        pending: 0,
        resolved: 0,
        overdue: 0
      };

    row.totalAssigned += 1;
    if (OPEN_STATUSES.includes(ticket.status as TicketStatus)) row.open += 1;
    if (ticket.status === 'Pending') row.pending += 1;
    if (CLOSED_TICKET_STATUSES.includes(ticket.status as TicketStatus)) row.resolved += 1;
    if (isTicketOverdue(ticket, now)) row.overdue += 1;

    rows.set(agent.id, row);
  }

  return [...rows.values()].sort(
    (a, b) => b.totalAssigned - a.totalAssigned || a.agentName.localeCompare(b.agentName)
  );
};
