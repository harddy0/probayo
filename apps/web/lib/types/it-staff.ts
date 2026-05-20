/**
 * IT Staff Types
 *
 * Defines structures for IT staff operations:
 * - Dashboard statistics
 * - Ticket queue views and filters
 */

// ── Re-export notification types from the feature-based module ──
export type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationRecipient,
  NotificationTicketRef,
  UnreadCountResponse,
} from "./notifications";

// ── Dashboard Stats ──

export type ItStaffDashboardStats = {
  totalOpen: number;
  unassigned: number;
  myActive: number;
  slaBreached: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
};

// ── Ticket Queue Views ──

export type ItStaffTicketView = "unassigned" | "my-tickets" | "all";
