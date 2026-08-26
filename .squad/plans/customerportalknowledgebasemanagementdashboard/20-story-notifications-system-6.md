# Story 20 — In-App Notifications: backend & frontend (Story: 6)

## Prerequisites

- Story 16 completed: [16-story-customer-portal-data-model-6.md](16-story-customer-portal-data-model-6.md). Feedback system is live.
- Story 15 completed: [../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md](../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md). Ticket management system with assignment, status changes, and comments is live.
- Story 09 completed: [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md). Auth and permissions are in place.

---

## Story Goal

Build an in-app notification system that alerts agents and customers to important events: ticket assignment, status changes, new comments, SLA overdue warnings, and customer feedback submission. Notifications are in-app only (no email); agents polling the dashboard automatically receive updates.

Outcomes:

1. New `Notification` model capturing event type, target user, message, is-read flag, related-entity links (ticket ID, feedback ID).
2. Backend emits notifications when: ticket assigned, ticket status changes, comment added, ticket overdue (client-side computation for now), customer submits feedback.
3. New `GET /api/notifications` (list unread/all for current user), `PATCH /api/notifications/:id/read` (mark as read), `DELETE /api/notifications/:id` (dismiss).
4. Frontend polls `/api/notifications` every 5 seconds when dashboard/ticket detail is open; displays a toast/banner for each new notification.
5. Notification center modal shows all notifications with read/unread filtering and the ability to navigate to related tickets/customers.

**Not in scope:** real-time WebSocket notifications, email/SMS fallback, notification preferences/settings, notification scheduling, bulk notification operations, and retries on delivery failure.

---

## Context — Read These Files First

1. [../ticketmanagementagentworkflow/14-story-ticket-management-apis-5.md](../ticketmanagementagentworkflow/14-story-ticket-management-apis-5.md) — ticket assignment and status change endpoints emit notifications (this story implements that).
2. `backend/prisma/schema.prisma` — review `Ticket`, `TicketComment`, `User` models; this story adds a `Notification` model.
3. `backend/src/services/ticket.service.ts` — where ticket mutations happen; task 1 updates mutation functions to emit notifications.
4. `frontend/src/stores/` — Pinia stores for polling and managing notification state.
5. `frontend/src/components/` — existing modals, toast/banner patterns for displaying notifications.

---

## Implementation Tasks

### Backend

**1 — Add Notification model to Prisma**

**File: `backend/prisma/schema.prisma`**

Add after existing models:

```prisma
/// In-app notification for a user (event, message, related entity, read status).
/// Emitted when: ticket assigned, status changed, comment added, customer feedback submitted.
/// Not persisted after dismissal (can be deleted); no email fallback in this mini-module.
model Notification {
  id          Int       @id @default(autoincrement())
  userId      Int       // recipient
  type        String    // "ticket_assigned", "ticket_status_changed", "ticket_comment", "ticket_overdue", "feedback_received"
  title       String
  message     String
  isRead      Boolean   @default(false)
  relatedTicketId Int?
  relatedCustomerId Int?
  relatedFeedbackId Int?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  ticket      Ticket?   @relation(fields: [relatedTicketId], references: [id])
  customer    Customer? @relation(fields: [relatedCustomerId], references: [id])
  feedback    TicketFeedback? @relation(fields: [relatedFeedbackId], references: [id])

  @@index([userId])
  @@index([isRead])
  @@map("notifications")
}
```

Add relations to `User`, `Ticket`, `Customer`, `TicketFeedback` models.

**2 — Create notification service**

**Create file: `backend/src/services/notification.service.ts`**

```ts
import { prisma } from '../db/prisma';
import type { Notification } from '@prisma/client';

export interface NotificationDto {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedTicketId: number | null;
  relatedCustomerId: number | null;
  createdAt: string;
}

export const createNotification = async (
  userId: number,
  type: string,
  title: string,
  message: string,
  relatedTicketId?: number,
  relatedCustomerId?: number,
  relatedFeedbackId?: number
): Promise<NotificationDto> => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      relatedTicketId,
      relatedCustomerId,
      relatedFeedbackId
    }
  });
  return toNotificationDto(notification);
};

export const getNotifications = async (userId: number, unreadOnly: boolean = false): Promise<NotificationDto[]> => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { isRead: false } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  return notifications.map(toNotificationDto);
};

export const markNotificationAsRead = async (id: number, userId: number): Promise<NotificationDto> => {
  const notification = await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
  return toNotificationDto(notification);
};

export const deleteNotification = async (id: number): Promise<void> => {
  await prisma.notification.delete({ where: { id } });
};

const toNotificationDto = (n: any): NotificationDto => ({
  id: n.id,
  type: n.type,
  title: n.title,
  message: n.message,
  isRead: n.isRead,
  relatedTicketId: n.relatedTicketId,
  relatedCustomerId: n.relatedCustomerId,
  createdAt: n.createdAt.toISOString()
});
```

**3 — Add notification controller**

**Create file: `backend/src/controllers/notification.controller.ts`**

```ts
import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import * as notificationService from '../services/notification.service';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const userId = (req.user as any).id;
  const unreadOnly = req.query.unreadOnly === 'true';
  const notifications = await notificationService.getNotifications(userId, unreadOnly);
  res.json({ data: notifications });
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = (req.user as any).id;
  const notification = await notificationService.markNotificationAsRead(Number(id), userId);
  res.json({ data: notification });
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await notificationService.deleteNotification(Number(id));
  res.json({ message: 'Notification deleted' });
};
```

**4 — Add notification routes**

**Create file: `backend/src/routes/notification.routes.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

router.get('/notifications', authenticate, notificationController.getNotifications);
router.patch('/notifications/:id/read', authenticate, notificationController.markAsRead);
router.delete('/notifications/:id', authenticate, notificationController.deleteNotification);

export default router;
```

**5 — Update ticket service to emit notifications**

**File: `backend/src/services/ticket.service.ts`**

Modify `updateTicketStatus`, `assignTicket`, `addTicketComment` functions to call `notificationService.createNotification` after mutation:

```ts
// After updating ticket status
await notificationService.createNotification(
  ticket.assignedToUserId,
  'ticket_status_changed',
  `Ticket #${ticket.id} status changed`,
  `"${ticket.subject}" is now ${newStatus}`,
  ticket.id
);

// After assigning ticket
await notificationService.createNotification(
  assignToUserId,
  'ticket_assigned',
  `Ticket assigned to you`,
  `Ticket #${ticket.id}: "${ticket.subject}"`,
  ticket.id
);

// After adding comment
await notificationService.createNotification(
  ticket.assignedToUserId,
  'ticket_comment',
  `New comment on ticket #${ticket.id}`,
  `${comment.author.name}: ${comment.body.substring(0, 100)}...`,
  ticket.id
);
```

**6 — Update feedback service to emit notifications**

**File: `backend/src/services/feedback.service.ts`**

After creating feedback:

```ts
await notificationService.createNotification(
  // Send to the agent who was assigned the ticket
  ticket.assignedToUserId,
  'feedback_received',
  `Feedback received for ticket #${ticket.id}`,
  `${ticket.customer.name} left ${feedback.rating}-star feedback: "${feedback.comment?.substring(0, 50)}..."`,
  ticket.id,
  ticket.customerId,
  feedback.id
);
```

### Frontend

**7 — Add notification types**

**File: `frontend/src/types/index.ts`**

```ts
export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedTicketId: number | null;
  relatedCustomerId: number | null;
  createdAt: string;
}
```

**8 — Create notification service**

**File: `frontend/src/services/notifications.service.ts`**

```ts
import api from './api';
import type { ApiResponse, Notification } from '../types';

export const fetchNotifications = async (unreadOnly: boolean = false): Promise<Notification[]> => {
  const response = await api.get<ApiResponse<Notification[]>>('/notifications', {
    params: { unreadOnly }
  });
  return response.data.data ?? [];
};

export const markNotificationAsRead = async (id: number): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const deleteNotification = async (id: number): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};
```

**9 — Create notification store**

**File: `frontend/src/stores/notifications.ts`**

```ts
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { fetchNotifications, markNotificationAsRead, deleteNotification } from '../services/notifications.service';
import type { Notification } from '../types';

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([]);
  const isPolling = ref(false);
  let pollInterval: number | null = null;

  const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length);
  const unreadNotifications = computed(() => notifications.value.filter(n => !n.isRead));

  const startPolling = async () => {
    if (isPolling.value) return;
    isPolling.value = true;

    // Initial load
    notifications.value = await fetchNotifications();

    // Poll every 5 seconds
    pollInterval = window.setInterval(async () => {
      const fresh = await fetchNotifications();
      // Show toast for new notifications
      const newOnes = fresh.filter(f => !notifications.value.find(n => n.id === f.id) && !f.isRead);
      newOnes.forEach(n => {
        console.log(`New notification: ${n.title}`); // TODO: show toast
      });
      notifications.value = fresh;
    }, 5000);
  };

  const stopPolling = () => {
    if (pollInterval) clearInterval(pollInterval);
    isPolling.value = false;
    pollInterval = null;
  };

  const markAsRead = async (id: number) => {
    await markNotificationAsRead(id);
    const notif = notifications.value.find(n => n.id === id);
    if (notif) notif.isRead = true;
  };

  const dismiss = async (id: number) => {
    await deleteNotification(id);
    notifications.value = notifications.value.filter(n => n.id !== id);
  };

  return {
    notifications,
    isPolling,
    unreadCount,
    unreadNotifications,
    startPolling,
    stopPolling,
    markAsRead,
    dismiss
  };
});
```

**10 — Add notification center component**

**File: `frontend/src/components/NotificationCenter.vue`**

A modal/drawer showing all notifications with read/unread filtering, ability to navigate to related tickets.

**11 — Integrate polling into views**

In `AgentDashboardView.vue`, `TicketDetailView.vue`, call `store.startPolling()` on mount and `store.stopPolling()` on unmount.

### Database

**12 — Migration**

```bash
npx prisma migrate dev --name add_notifications
```

---

## Edge Cases & Failure Modes

- **Polling fails (network error).** The interval continues; the next poll retries. No exponential backoff is implemented (simple retry for mini-module).
- **Notification for a deleted ticket.** The `relatedTicketId` points to a non-existent ticket. The frontend link will 404; acceptable for mini-module.
- **Two rapid status changes.** Two notifications are emitted (one per change). Both appear in the notification center.
- **User is deleted but has unread notifications.** The `onDelete: Cascade` relationship deletes associated notifications.

---

## Test Plan

1. Service/controller tests: create, fetch, mark-read, delete notifications.
2. Store tests: polling, unread count calculation, dismiss.
3. Integration: ticket assignment/status change emits notification; customer feedback emits notification.

---

## Verification Steps

**Backend:** `npm test` includes notification specs; `npm run build` exits 0.

**Frontend:** `npm test` includes notification specs; `npm run build` exits 0.

**Dev smoke test:**
1. Log in as an agent; open the agent dashboard.
2. As a customer (or via API), submit feedback on a resolved ticket.
3. Confirm the agent sees a "Feedback received" notification in the notification center.
4. Click "Mark as read"; confirm the notification badge updates.
5. Open a ticket and change its status; confirm a notification is emitted to the assigned agent.

---

## Done Criteria

- [ ] `Notification` Prisma model created with type, title, message, isRead, relatedEntity fields.
- [ ] Backend emits notifications on: ticket assigned, status changed, comment added, feedback received.
- [ ] `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `DELETE /api/notifications/:id` endpoints work.
- [ ] Frontend polls every 5 seconds when dashboard/detail is open.
- [ ] Notification center displays unread count and list.
- [ ] All tests pass; `npm run build` and `npm run typecheck` exit 0 (both).
- [ ] Smoke test confirms notifications are created and displayed correctly.
