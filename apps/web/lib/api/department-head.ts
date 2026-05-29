/**
 * Department Head API Module
 *
 * Department Head–specific operations:
 * - View tickets within their department (paginated)
 * - View ticket details
 * - Reports: weekly summary, resolution metrics, SLA breaches
 */

import { request } from "./client";
import type { Ticket } from "../types/tickets";
import type {
  DepartmentHeadTicketPage,
  DepartmentHeadWeeklySummary,
  DepartmentHeadResolutionMetrics,
  DepartmentHeadSlaBreaches,
} from "../types/department-head";

// ── Re-export notification API ──
export {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationSeen,
  markNotificationsSeen,
} from "./notifications";

// ── Tickets ──

/**
 * Fetch tickets for the department head's department (paginated).
 *
 * Supports filtering by status, priority, category, assigned user, date range,
 * search, and sorting.
 */
export const fetchDepartmentHeadTickets = async (
  filters?: {
    status?: string;
    priority?: string;
    categoryId?: string;
    assignedToUserId?: string;
    search?: string;
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
    sortBy?: string[];
  },
): Promise<DepartmentHeadTicketPage> => {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.assignedToUserId) params.set("assignedToUserId", filters.assignedToUserId);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.fromDate) params.set("fromDate", filters.fromDate);
  if (filters?.toDate) params.set("toDate", filters.toDate);
  if (filters?.sortBy && filters.sortBy.length > 0) {
    filters.sortBy.forEach((s) => params.append("sortBy", s));
  }

  const query = params.toString();
  return request<DepartmentHeadTicketPage>(
    `/department-head/tickets${query ? `?${query}` : ""}`,
  );
};

/**
 * Fetch a single ticket by ID for the department head.
 */
export const fetchDepartmentHeadTicketById = async (
  id: string,
): Promise<Ticket> => {
  return request<Ticket>(`/department-head/tickets/${id}`);
};

// ── Reports ──

/**
 * Get the weekly summary report for the department head's department.
 */
export const fetchDepartmentHeadWeeklySummary = async (
  filters?: {
    fromDate?: string;
    toDate?: string;
  },
): Promise<DepartmentHeadWeeklySummary> => {
  const params = new URLSearchParams();
  if (filters?.fromDate) params.set("fromDate", filters.fromDate);
  if (filters?.toDate) params.set("toDate", filters.toDate);
  const query = params.toString();
  return request<DepartmentHeadWeeklySummary>(
    `/department-head/reports/weekly-summary${query ? `?${query}` : ""}`,
  );
};

/**
 * Get resolution metrics for the department head's department.
 */
export const fetchDepartmentHeadResolutionMetrics = async (
  filters?: {
    fromDate?: string;
    toDate?: string;
  },
): Promise<DepartmentHeadResolutionMetrics> => {
  const params = new URLSearchParams();
  if (filters?.fromDate) params.set("fromDate", filters.fromDate);
  if (filters?.toDate) params.set("toDate", filters.toDate);
  const query = params.toString();
  return request<DepartmentHeadResolutionMetrics>(
    `/department-head/reports/resolution-metrics${query ? `?${query}` : ""}`,
  );
};

/**
 * Get SLA breaches for the department head's department.
 */
export const fetchDepartmentHeadSlaBreaches = async (
  filters?: {
    fromDate?: string;
    toDate?: string;
  },
): Promise<DepartmentHeadSlaBreaches> => {
  const params = new URLSearchParams();
  if (filters?.fromDate) params.set("fromDate", filters.fromDate);
  if (filters?.toDate) params.set("toDate", filters.toDate);
  const query = params.toString();
  return request<DepartmentHeadSlaBreaches>(
    `/department-head/reports/sla-breaches${query ? `?${query}` : ""}`,
  );
};
