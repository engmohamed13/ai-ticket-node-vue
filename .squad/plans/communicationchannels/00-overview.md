# communicationchannels — plan overview

Entry point for the **communicationchannels** feature. Stories execute in order by their `NN` prefix.

Work item [2 — Communication Channels](../../stories/communicationchannels/2/intake.md) is split into three sequential stories so each one is independently runnable and demoable. All three carry the same tracker id.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 04 | [04-story-data-model-channels-2.md](04-story-data-model-channels-2.md) | Communication data model, mock channel abstraction, and migration | 2 | Story 02 (projectsetup) |
| 05 | [05-story-communication-apis-2.md](05-story-communication-apis-2.md) | Backend APIs for customers, tickets, and interactions | 2 | Story 04 |
| 06 | [06-story-communication-timeline-ui-2.md](06-story-communication-timeline-ui-2.md) | Communication and unified timeline UI | 2 | Stories 04, 05; Story 03 (projectsetup) |

## Dependency notes

- **Strictly sequential.** Story 05 imports `backend/src/channels/registry.ts` and `backend/src/channels/types.ts` from Story 04, and queries the `Customer`/`Ticket`/`Interaction` tables Story 04 migrates. Story 06 consumes the exact endpoints Story 05 exposes.
- **No `Customer`, `Ticket`, `Agent`, or `User` domain model existed anywhere in the repository before this feature** — the schema previously contained only the bootstrap `SystemInfo` table (from `../projectsetup/02-story-database-prisma-1.md`). Story 04 introduces **minimal** `Customer` and `Ticket` models scoped only to what an interaction needs to associate against (name/email/phone; subject/status/customerId). Full ticket/customer domain modelling — agents, comments, priorities, ticket workflow, authentication — is explicitly out of scope for this feature and belongs to a separate future feature.
- **Shared contract:** the mock channel abstraction (`ChannelAdapter`, `CHANNELS`, `INTERACTION_DIRECTIONS` in `backend/src/channels/types.ts`, Story 04) is duplicated by hand as matching constants in `frontend/src/types/index.ts` (Story 06) — there is no shared package between `backend/` and `frontend/` in this repository, matching the existing `HealthPayload`/`DatabaseHealth` precedent from the projectsetup feature. Changing the channel list requires updating both sides.
- **"Mock" scope:** per the work item ("Use internal/mock channel implementations for demonstration without requiring external service integrations"), all five channel adapters (Email, WhatsApp, Live Chat, SMS, Web Forms) only generate a channel-prefixed reference id — none of them call a real external API. This is true for the whole feature, not just Story 04.
- **Out of scope across all three stories:** authentication, customer/ticket CRUD over HTTP (both are seeded via `backend/prisma/seed.ts` in Story 04, not created through the API), pagination, real-time timeline updates, and any real Email/WhatsApp/SMS/live-chat/web-form integration.
