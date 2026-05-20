/**
 * Known Issues API Module
 *
 * Feature-based API functions for known issue CRUD operations.
 * Can be imported by any role (admin, IT staff, etc.).
 */

import { request } from "./client";
import type {
  BulkAttachKnownIssueRequest,
  CreateAndAttachKnownIssueRequest,
  CreateKnownIssueRequest,
  KnownIssue,
  UpdateKnownIssueRequest,
  UpdateKnownIssueStatusRequest,
} from "../types/known-issues";

/**
 * Fetch all known issues (Admin).
 */
export const fetchKnownIssues = async (): Promise<KnownIssue[]> => {
  return request<KnownIssue[]>("/known-issues");
};

/**
 * Fetch a single known issue by ID.
 */
export const fetchKnownIssueById = async (id: string): Promise<KnownIssue> => {
  return request<KnownIssue>(`/known-issues/${id}`);
};

/**
 * Fetch only active (unresolved) known issues — used in ticket creation.
 */
export const fetchActiveKnownIssues = async (): Promise<KnownIssue[]> => {
  return request<KnownIssue[]>("/known-issues/active");
};

/**
 * Create a new known issue (Admin only).
 */
export const createKnownIssue = async (
  data: CreateKnownIssueRequest,
): Promise<KnownIssue> => {
  return request<KnownIssue>("/known-issues", {
    method: "POST",
    body: data,
  });
};

/**
 * Update an existing known issue (Admin only).
 */
export const updateKnownIssue = async (
  id: string,
  data: UpdateKnownIssueRequest,
): Promise<KnownIssue> => {
  return request<KnownIssue>(`/known-issues/${id}`, {
    method: "PATCH",
    body: data,
  });
};

/**
 * Delete a known issue (Admin only).
 */
export const deleteKnownIssue = async (id: string): Promise<void> => {
  await request<void>(`/known-issues/${id}`, {
    method: "DELETE",
  });
};

/**
 * Update a known issue's status (Admin only).
 * Uses PATCH since the API has no dedicated resolve endpoint.
 */
export const updateKnownIssueStatus = async (
  id: string,
  data: UpdateKnownIssueStatusRequest,
): Promise<KnownIssue> => {
  return request<KnownIssue>(`/known-issues/${id}`, {
    method: "PATCH",
    body: data,
  });
};

/**
 * Create a known issue and attach it to multiple tickets in one request.
 */
export const createAndAttachKnownIssue = async (
  data: CreateAndAttachKnownIssueRequest,
): Promise<KnownIssue> => {
  return request<KnownIssue>("/known-issues/create-and-attach", {
    method: "POST",
    body: data,
  });
};

/**
 * Bulk-attach an existing known issue to multiple tickets.
 */
export const bulkAttachKnownIssue = async (
  data: BulkAttachKnownIssueRequest,
): Promise<void> => {
  await request<void>("/tickets/bulk-attach-issue", {
    method: "POST",
    body: data,
  });
};
