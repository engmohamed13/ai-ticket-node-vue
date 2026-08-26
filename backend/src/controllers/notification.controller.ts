import { Request, Response } from 'express';
import { getAuth } from '../middleware/auth.middleware';
import {
  countUnread,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/notification.service';
import { ok } from '../utils/apiResponse';

export const listNotificationsHandler = async (req: Request, res: Response): Promise<void> => {
  const { unreadOnly } = req.query as unknown as { unreadOnly?: boolean };
  const auth = getAuth(req);
  // Sequential, not Promise.all: `listNotifications` is what materialises overdue notifications,
  // so counting in parallel with it can miss a row that the very same request just wrote.
  const items = await listNotifications(auth.userId, { unreadOnly });
  const unreadCount = await countUnread(auth.userId);
  res.json(ok({ items, unreadCount }));
};

export const markNotificationReadHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const notification = await markNotificationRead(id, getAuth(req).userId);
  res.json(ok(notification, 'Notification marked as read'));
};

export const markAllNotificationsReadHandler = async (req: Request, res: Response): Promise<void> => {
  const updated = await markAllNotificationsRead(getAuth(req).userId);
  res.json(ok({ updated }, 'All notifications marked as read'));
};

export const deleteNotificationHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  await deleteNotification(id, getAuth(req).userId);
  res.json(ok(null, 'Notification dismissed'));
};
