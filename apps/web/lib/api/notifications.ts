/**
 * Notifications API Module
 *
 * Feature-based API functions for notification operations.
 * Can be imported by any role (IT staff, admin, etc.).
 */

import { request } from "./client";
import type { Notification, UnreadCountResponse } from "../types/notifications";

/**
 * Fetch all notifications for the current user.
 */
export const fetchNotifications = async (): Promise<Notification[]> => {
  return request<Notification[]>("/notifications");
};

/**
 * Get the count of unread notifications for the current user.
 */
export const fetchUnreadCount = async (): Promise<number> => {
  const data = await request<UnreadCountResponse>("/notifications/unread-count");
  return data.count;
};

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = async (id: string): Promise<void> => {
  await request<void>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
};

/**
 * Mark all notifications as read for the current user.
 */
export const markAllNotificationsRead = async (): Promise<void> => {
  await request<void>("/notifications/read-all", {
    method: "PATCH",
  });
};
