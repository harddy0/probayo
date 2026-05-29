/**
 * Department Head Types
 *
 * Defines structures for department head operations:
 * - Ticket listing (paginated, view-only)
 * - Weekly summary reports
 * - Resolution metrics
 * - SLA breach reports
 */

import type { Ticket, PaginationMeta } from "./tickets";

// ── Re-export notification types ──
export type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationRecipient,
  NotificationTicketRef,
  UnreadCountResponse,
} from "./notifications";

// ── Weekly Summary ──

export type SlaBreachSummary = {
  total: number;
  acknowledged: number;
  resolution: number;
};

export type DepartmentHeadWeeklySummary = {
  rangeStart: string;
  rangeEnd: string;
  totalCreated: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  slaBreaches: SlaBreachSummary;
  averageResolutionMinutes: number | null;
};

// ── Resolution Metrics ──

export type DepartmentHeadResolutionPriority = {
  priority: "Critical" | "High" | "Medium" | "Low";
  resolvedCount: number;
  averageMinutes: number | null;
  medianMinutes: number | null;
  maxMinutes: number | null;
};

export type DepartmentHeadResolutionMetrics = {
  rangeStart: string;
  rangeEnd: string;
  resolvedCount: number;
  averageMinutes: number | null;
  medianMinutes: number | null;
  maxMinutes: number | null;
  byPriority: DepartmentHeadResolutionPriority[];
};

// ── SLA Breaches ──

export type DepartmentHeadSlaBreachItem = {
  id: string;
  title: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "Acknowledged" | "PendingUser" | "InProgress" | "Resolved" | "Closed";
  slaAckBreached: boolean;
  slaResolutionBreached: boolean;
  slaAckDeadline: string;
  slaResolutionDeadline: string;
  createdAt: string;
};

export type DepartmentHeadSlaBreaches = {
  rangeStart: string;
  rangeEnd: string;
  total: number;
  items: DepartmentHeadSlaBreachItem[];
};

// ── Ticket Response ──

export type DepartmentHeadTicketPage = {
  data: Ticket[];
  meta: PaginationMeta;
  links: {
    first?: string;
    previous?: string;
    next?: string;
    last?: string;
  };
};
