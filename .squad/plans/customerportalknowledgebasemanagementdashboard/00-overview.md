# customerportalknowledgebasemanagementdashboard — plan overview

Entry point for the **customerportalknowledgebasemanagementdashboard** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 16 | [16-story-customer-portal-data-model-6.md](16-story-customer-portal-data-model-6.md) | Customer Portal: feedback data model & APIs | 6 | Story 15 (Ticket Management) |
| 17 | [17-story-customer-portal-ui-6.md](17-story-customer-portal-ui-6.md) | Customer Portal UI: self-service dashboard | 6 | Story 16 |
| 18 | [18-story-knowledge-base-data-model-6.md](18-story-knowledge-base-data-model-6.md) | Knowledge Base: data model & APIs | 6 | Story 15 |
| 19 | [19-story-knowledge-base-ui-6.md](19-story-knowledge-base-ui-6.md) | Knowledge Base UI: articles, FAQs, search | 6 | Story 18 |
| 20 | [20-story-notifications-system-6.md](20-story-notifications-system-6.md) | In-App Notifications: backend & frontend | 6 | Story 15, 16 |
| 21 | [21-story-management-dashboard-6.md](21-story-management-dashboard-6.md) | Management Dashboard: KPIs, charts, filtering | 6 | Story 20 |

## Dependency notes

All stories depend on Story 15 (ticket management system) being complete for the ticket/customer data they present. Stories 16 and 18 are independent data models and can be built in parallel. Story 17 (customer portal UI) depends on Story 16 (feedback APIs). Story 19 (KB UI) depends on Story 18 (KB APIs). Story 20 (notifications) integrates with Stories 15–16. Story 21 (dashboard) displays aggregated data from Stories 15–16–20.

The feature integrates with existing auth (Story 09), customer data (Stories 10–12), and ticket system (Stories 13–15), but introduces no changes to those modules — all new tables, APIs, and permissions are scoped to this feature alone.
