# ticketmanagementagentworkflow — plan overview

Entry point for the **ticketmanagementagentworkflow** feature. Stories execute in order by their `NN` prefix.

Work item [5 — Ticket Management & Agent Workflow](../../stories/ticketmanagementagentworkflow/5/intake.md) is split into three sequential stories — data model, APIs, and UI — following the same shape as `customermanagement` (10/11/12). All three carry the same tracker id.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 13 | [13-story-ticket-data-model-5.md](13-story-ticket-data-model-5.md) | Ticket data model: categories, priority, SLA, assignment, and comments | 5 | Story 12 (customermanagement), Story 05 (communicationchannels) |
| 14 | [14-story-ticket-management-apis-5.md](14-story-ticket-management-apis-5.md) | Ticket CRUD, assignment, status/priority updates, comments, and attachments APIs | 5 | Story 13, Story 08 (authenticationandusermanagement) |
| 15 | [15-story-agent-dashboard-and-notifications-ui-5.md](15-story-agent-dashboard-and-notifications-ui-5.md) | Agent dashboard, ticket filtering, in-app notifications, and communication timeline UI | 5 | Story 14, Story 09 (authenticationandusermanagement) |

## Dependency notes

- **Strictly sequential**, same reasoning as `customermanagement`: Story 14 extends `backend/src/routes/ticket.routes.ts` (from Story 05) and modifies `backend/src/services/ticket.service.ts` and `backend/src/controllers/ticket.controller.ts` to add CRUD operations and enforce the new `tickets:manage` permission. Story 15 consumes the exact endpoints and DTO shapes Story 14 exposes, and reuses the Vue/store/auth scaffolding from Story 09 (authenticationandusermanagement).
- **Ticket workflow state machine.** The work item defines six mutually exclusive statuses: `New`, `Open`, `In Progress`, `Pending`, `Resolved`, `Closed`. Story 14's endpoints enforce status transitions via Zod validation (`z.enum(TICKET_STATUSES)`); there is no state machine enforcement (e.g., no restriction on moving from `Closed` back to `New`). This is a deliberate simplification for the mini-module — production systems would enforce stricter transitions.
- **SLA fields are reference values, not automated.** Story 13 adds `responseTimeMinutes`, `resolutionTimeMinutes`, `respondedAt`, and `resolvedAt` to the schema. Story 14 updates `respondedAt` when an agent first responds (adds a comment or changes status from `New`), and `resolvedAt` when status reaches `Resolved` or `Closed`. Neither field has a background job that marks tickets overdue — Story 15's dashboard UI computes overdue client-side, acceptable for this mini-module.
- **Ticket categories are predefined, not customer-specific.** `TicketCategory` has a global list seeded by Story 13 (e.g., "Technical Support", "Billing"). Story 14 provides a read-only `/api/ticket-categories` endpoint for the UI dropdown; there is no admin endpoint to create new categories in this feature (deferred).
- **Comments and attachments are agent-only (internal).** `TicketComment` and `TicketAttachment` are never shown to a `CUSTOMER`-role user, even when fetching their own tickets. This is enforced by permission checks (`requirePermission('tickets:manage')` for comment/attachment endpoints), not by query filtering.
- **New permission: `tickets:manage`.** Story 13 adds this permission to `CRM_MANAGER`, `SUPPORT_SUPERVISOR`, and `SUPPORT_AGENT` only. `CUSTOMER`-role users hold `'tickets:read'` only (can view tickets assigned to their own customer id, see [../authenticationandusermanagement/00-overview.md](../authenticationandusermanagement/00-overview.md) — customer scoping is enforced in Story 14's API layer via `assertCustomerScope`), and `REPORTING_USER` holds `'tickets:read'` read-only, matching existing conventions.
- **Out of scope across all three stories:** automatic ticket creation from customer requests (no email integration or form submission logic), ticket deletion (the `Restrict` FK behavior on `TicketComment`/`TicketAttachment` means no delete endpoint is offered), soft-delete or archiving of categories, editing or deleting a comment once posted, editing or deleting an attachment, MIME-type allow-listing for attachments, virus scanning, attachment previews/thumbnails, bulk ticket operations, advanced reporting, and customer-facing SLA or overdue escalation alerts.

