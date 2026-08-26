# customermanagement — plan overview

Entry point for the **customermanagement** feature. Stories execute in order by their `NN` prefix.

Work item [4 — Customer Management](../../stories/customermanagement/4/intake.md) is split into three sequential stories — data model, APIs, UI — following the same shape as `communicationchannels` (04/05/06) and `authenticationandusermanagement` (07/08/09). All three carry the same tracker id.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 10 | [10-story-customer-data-model-4.md](10-story-customer-data-model-4.md) | Customer profile data model: contact fields, status, notes, and attachments | 4 | Story 04 (communicationchannels), Story 07 (authenticationandusermanagement) |
| 11 | [11-story-customer-apis-4.md](11-story-customer-apis-4.md) | Customer CRUD, search/filtering, notes, and attachment APIs | 4 | Story 10, Story 05 (communicationchannels), Story 08 (authenticationandusermanagement) |
| 12 | [12-story-customer-management-ui-4.md](12-story-customer-management-ui-4.md) | Customer list, profile, notes/attachments, and create/edit forms | 4 | Story 11, Story 09 (authenticationandusermanagement), Story 06 (communicationchannels) |

## Dependency notes

- **Strictly sequential**, same reasoning as the other two features: Story 11 extends the `customer.controller.ts`/`customer.service.ts`/`customer.routes.ts` files and the `customer.spec.ts` suite that Story 05 (communicationchannels) originally created, and depends on the `CustomerNote`/`CustomerAttachment` tables and `customers:manage` permission Story 10 adds. Story 12 consumes the exact endpoints and DTO shapes Story 11 exposes, and reuses the auth/routing/store scaffolding from Story 09 (authenticationandusermanagement).
- **Extends, does not replace, the minimal Story 04 `Customer` model.** `backend/prisma/schema.prisma`'s original `Customer` (Story 04) was deliberately scoped to "what interactions need" (`name`, `email`, `phone`). Story 10 is the "full customer profile management" work that model's own doc comment explicitly deferred — it adds contact/status fields and two new related tables, and does not touch `Ticket` or `Interaction`.
- **New permission: `customers:manage`.** `backend/src/auth/permissions.ts` already had `customers:read` (Story 07) with no management counterpart, unlike every other resource (`users:read`/`manage`, `roles:read`/`manage`, `orgunits:read`/`manage`). Story 10 adds `customers:manage` and grants it to `CRM_MANAGER`, `SUPPORT_SUPERVISOR`, and `SUPPORT_AGENT` — not `REPORTING_USER` (stays read-only) and not `CUSTOMER` (which holds no `customers:read` at all, a pre-existing Story 07/08 decision this feature does not change).
- **First file-upload capability in the project.** No `multer` (or any upload library) existed before Story 10. Attachments are stored on local disk under `UPLOAD_DIR` (default `backend/uploads/`), with only metadata (`fileName`, `mimeType`, `sizeBytes`, `storagePath`) in the database; `storagePath` is never serialized to the frontend. This is a deliberate mini-module simplification — no cloud/object storage, no MIME allow-list, no virus scanning — documented as a known limitation in Story 10 and Story 11's `## Edge Cases`.
- **Ticket and interaction history are not re-implemented.** The intake's "Customer ticket history" and "Customer interaction history" criteria are served entirely by endpoints that already exist from `communicationchannels` Story 05 (`GET /api/tickets?customerId=`, `GET /api/customers/:id/timeline`) — Story 11 adds no new history endpoint, and Story 12's customer-detail screen just calls both.
- **`CUSTOMER`-role users cannot use any of this feature's endpoints.** Confirmed at `backend/src/auth/roles.ts:59` (Story 07): the `CUSTOMER` role holds neither `customers:read` nor `customers:manage`. This is unchanged by this feature — Story 11 explicitly does not add per-record ownership scoping (`backend/src/auth/scope.ts`) to the customer endpoints, since `requirePermission` alone already blocks every customer-scoped token before a handler runs.
- **Out of scope across all three stories:** deleting a customer (the `Restrict` FK behavior on `CustomerNote`/`CustomerAttachment` means no delete endpoint is offered), editing or deleting a note once posted, attachment previews/thumbnails, MIME-type allow-listing, virus scanning, and a customer-role user viewing their own profile (the pre-existing permission gap noted above).
