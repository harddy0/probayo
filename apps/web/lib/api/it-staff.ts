/**
 * IT Staff API Module
 *
 * IT-specific operations built on top of the existing ticket API:
 * - Enhanced ticket querying (unassigned filter)
 * - Dashboard statistics
 * - Convenience helpers for claiming/acknowledging tickets
 */

import {
  fetchTickets,
  unassignTicket,
  updateTicket,
} from "./tickets";
import type { Ticket } from "../types/tickets";
import type {
  ItStaffDashboardStats,
  ItStaffTicketView,
} from "../types/it-staff";
import type { TicketPriority, TicketStatus } from "../types/tickets";

// ── Re-export notification API from the feature-based module ──
export {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationSeen,
  markNotificationsSeen,
} from "./notifications";

// ── Ticket Queue (IT Staff View) ──

/**
 * Fetch tickets for the IT staff queue with view-specific filters.
 *
 * - `"unassigned"`: tickets not yet claimed by any IT staff member
 * - `"my-tickets"`: tickets assigned to the current user
 * - `"all"`: no assignment filter (all visible tickets)
 *
 * Optional status/priority filters narrow results further.
 */
export const fetchItStaffTickets = async (
  view: ItStaffTicketView = "all",
  userId?: string,
  filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
  },
): Promise<Ticket[]> => {
  if (view === "unassigned") {
    // Use the unassigned flag to filter for tickets with no assignee
    return fetchTickets({
      unassigned: true,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.priority ? { priority: filters.priority } : {}),
    });
  }

  if (view === "my-tickets" && userId) {
    return fetchTickets({
      assignedToUserId: userId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.priority ? { priority: filters.priority } : {}),
    });
  }

  return fetchTickets({
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.priority ? { priority: filters.priority } : {}),
  });
};

// ── Ticket Actions ──

/**
 * Accept/claim a ticket — assigns the ticket to the specified IT staff member
 * and sets status to "Acknowledged" in a single API call.
 * Uses the `accept` flag which forces self-assignment + acknowledgement.
 */
export const acceptTicket = async (
  ticketId: string,
  _userId: string,
): Promise<Ticket> => {
  return updateTicket(ticketId, { accept: true });
};

/**
 * Claim a ticket and immediately set its status to "Acknowledged".
 * Uses the `accept` flag which forces self-assignment + acknowledgement.
 */
export const claimAndAcknowledge = async (
  ticketId: string,
  _userId: string,
): Promise<Ticket> => {
  return updateTicket(ticketId, { accept: true });
};

/**
 * Release a ticket — removes the current assignment.
 */
export const releaseTicket = async (ticketId: string): Promise<Ticket> => {
  return unassignTicket(ticketId);
};

// ── Dashboard Stats ──

/**
 * Compute dashboard statistics from all tickets.
 *
 * Fetches tickets and aggregates them into counts by status, priority,
 * assignment, and SLA breach status.
 */
export const fetchItStaffDashboardStats = async (
  userId: string,
): Promise<ItStaffDashboardStats> => {
  const allTickets = await fetchTickets();

  const stats: ItStaffDashboardStats = {
    totalOpen: 0,
    unassigned: 0,
    myActive: 0,
    slaBreached: 0,
    byStatus: {},
    byPriority: {},
  };

  for (const ticket of allTickets) {
    // Count by status
    stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] ?? 0) + 1;

    // Count by priority
    stats.byPriority[ticket.priority] =
      (stats.byPriority[ticket.priority] ?? 0) + 1;

    // Open or in-progress tickets
    if (
      ticket.status === "Open" ||
      ticket.status === "Acknowledged" ||
      ticket.status === "InProgress"
    ) {
      stats.totalOpen++;
    }

    // Unassigned
    if (!ticket.assignedToUserId) {
      stats.unassigned++;
    }

    // My active tickets
    if (
      ticket.assignedToUserId === userId &&
      ticket.status !== "Resolved" &&
      ticket.status !== "Closed"
    ) {
      stats.myActive++;
    }

    // SLA breaches
    if (ticket.slaAckBreached || ticket.slaResolutionBreached) {
      stats.slaBreached++;
    }
  }

  return stats;
};
