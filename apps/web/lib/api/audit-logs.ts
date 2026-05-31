/**
 * Audit Logs API Module
 *
 * API functions for fetching audit log entries.
 * Admin-only endpoint for tracking all system activity.
 */

import { request } from "./client";
import type { AuditLogEntry, AuditLogPaginatedResponse } from "../types/audit-logs";

/**
 * Fetch all audit log entries.
 *
 * Returns the full audit trail of system activity,
 * including who did what, when, and on which entity.
 *
 * The backend returns a paginated response wrapper ({ data, meta }).
 * We extract and return just the data array for convenience.
 *
 * @returns Array of audit log entries sorted by most recent first
 * @throws ApiError if request fails or user is not authorized
 */
export const fetchAuditLogs = async (): Promise<AuditLogEntry[]> => {
  const response = await request<AuditLogPaginatedResponse>("/audit-logs");
  return response.data;
};
