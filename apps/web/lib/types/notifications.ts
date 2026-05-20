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
  firstName?: string;
  lastName?: string;
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
  subject: string;
  body: string;
  sentAt: string | null;
  createdAt: string;
  readAt?: string | null;
};

export type UnreadCountResponse = {
  count: number;
};
