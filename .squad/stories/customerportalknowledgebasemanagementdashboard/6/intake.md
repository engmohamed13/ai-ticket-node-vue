> **Fetched from azure:** [6](https://dev.azure.com/mohamedhagag191/AMZSQUADCRM/_workitems/edit/6)  
> *Fetched 2026-08-26T19:17:11.927Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** Customer Portal, Knowledge Base & Management Dashboard  
**Type:** User Story  
**Status:** New  
**Assignee:** mohamedhagag191

### Description

User Story 

As a customer and CRM manager, I want to access customer support services and management information so that customers can follow their requests while managers can monitor the support operation. 

Details: 

Customer Portal 

Customer login.

View own tickets.

Track ticket status.

View ticket history.

Submit feedback.

 Knowledge Base 

FAQs.

Knowledge articles.

Search.

Categories.

 Notifications 

In-app notification center.

Ticket assignment notification.

Status change notification.

New comment notification.

SLA/overdue notification.

 Management Dashboard 

Total Tickets.

Open Tickets.

Resolved Tickets.

Pending Tickets.

Overdue Tickets.

Tickets by Status.

Tickets by Priority.

Agent workload.

Customer satisfaction.

 Administration 

Basic user/role management.

Basic system settings.

Audit log for important actions.

 Demo: 

 

Customer Login
      ↓
View / Track Ticket
      ↓
Knowledge Base
      ↓
Submit Feedback
      ↓
Agent Updates Ticket
      ↓
Notification
      ↓
Manager Dashboard
      ↓
View KPIs & Reports

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customerportalknowledgebasemanagementdashboard/6/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customerportalknowledgebasemanagementdashboard`

## Tracker (metadata only)

- **Tracker type:** `azure`
- **Work item id:** `6` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User Story`
- **Status:** `New`
- **Assignee:** `mohamedhagag191`
- **Labels:** ``

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
Customer Portal, Knowledge Base & Management Dashboard
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
User Story 

As a customer and CRM manager, I want to access customer support services and management information so that customers can follow their requests while managers can monitor the support operation. 

Details: 

Customer Portal 

Customer login.

View own tickets.

Track ticket status.

View ticket history.

Submit feedback.

 Knowledge Base 

FAQs.

Knowledge articles.

Search.

Categories.

 Notifications 

In-app notification center.

Ticket assignment notification.

Status change notification.

New comment notification.

SLA/overdue notification.

 Management Dashboard 

Total Tickets.

Open Tickets.

Resolved Tickets.

Pending Tickets.

Overdue Tickets.

Tickets by Status.

Tickets by Priority.

Agent workload.

Customer satisfaction.

 Administration 

Basic user/role management.

Basic system settings.

Audit log for important actions.

 Demo: 

 

Customer Login
      ↓
View / Track Ticket
      ↓
Knowledge Base
      ↓
Submit Feedback
      ↓
Agent Updates Ticket
      ↓
Notification
      ↓
Manager Dashboard
      ↓
View KPIs & Reports
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
Acceptance Criteria: 

Customer can login and view their tickets.

Customer can track ticket status.

Customer can submit feedback.

Knowledge Base can be searched.

Important ticket events generate in-app notifications.

Management dashboard displays basic KPIs.

Reports can be filtered.

Basic administration and audit logging are available.

Complete CRM flow works end-to-end.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |
| *(e.g. `attachments/flow.png`)* | *(e.g. UX flow)* |

*(Add rows per file. If none, write "None.")*

---

## Dependencies

- **Blocked by / related ids:** (tracker ids only; optional short note)
- **Depends on code areas or other stories:**

## Extra notes (optional)

- Anything not captured above (e.g. chat context) — keep short.

## Technical hints (optional)

- APIs, screens, services already discussed. Repos/roots: `.`. Primary language: `typescript`.

## Out of scope

- What this story explicitly does **not** cover:
