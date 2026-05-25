/**
 * Notification Types
 *
 * Defines the structure for notification data across all roles
 * (IT staff, admin, etc.).
 */

export type NotificationType =
  | "TicketCreated"
  | "StatusChanged"
  | "Escalation"
  | "KnownIssueResolved"
  | "Assignment"
  | "SlaBreach"
  | "CommentAdded";

export type NotificationChannel = "Email" | "InApp";

export type NotificationRecipient = {
  id: string;
  email: string;
  fullName?: string;
};

export type NotificationTicketRef = {
  id: string;
  title: string;
};

export type Notification = {
  id: string;
  recipient: NotificationRecipient;
  ticket: NotificationTicketRef | null;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string | null;
  body: string;
  isSeen: boolean;
  sentAt: string | null;
  createdAt: string;
};

export type UnreadCountResponse = {
  count: number;
};
