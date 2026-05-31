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
  const data = await request<UnreadCountResponse>(
    "/notifications/unread-count",
  );
  return data.count;
};

/**
 * Mark a single notification as read.
 */
export const markNotificationSeen = async (
  id: string,
): Promise<Notification> => {
  return request<Notification>(`/notifications/${id}/seen`, {
    method: "PUT",
  });
};

/**
 * Mark multiple notifications as seen for the current user.
 */
export const markNotificationsSeen = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  await Promise.all(ids.map((id) => markNotificationSeen(id)));
};

/**
 * Mark ALL notifications as seen for the current user in a single request.
 *
 * Uses the backend bulk endpoint instead of marking notifications one-by-one.
 */
export const markAllNotificationsSeen = async (): Promise<void> => {
  await request<void>("/notifications/read-all", {
    method: "PUT",
  });
};
