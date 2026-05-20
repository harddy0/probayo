/**
 * SLA Policies API Module
 *
 * Feature-based API functions for SLA policy CRUD operations.
 * Can be imported by any role (admin, IT staff, etc.).
 */

import { request } from "./client";
import type {
  CreateSlaPolicyRequest,
  SlaPolicy,
  SlaPolicyPriority,
  UpdateSlaPolicyRequest,
} from "../types/sla-policies";

/**
 * Fetch all SLA policies.
 */
export const fetchSlaPolicies = async (): Promise<SlaPolicy[]> => {
  return request<SlaPolicy[]>("/sla-policies");
};

/**
 * Fetch a single SLA policy by ID.
 */
export const fetchSlaPolicyById = async (id: string): Promise<SlaPolicy> => {
  return request<SlaPolicy>(`/sla-policies/${id}`);
};

/**
 * Fetch an SLA policy by priority level.
 */
export const fetchSlaPolicyByPriority = async (
  priority: SlaPolicyPriority,
): Promise<SlaPolicy> => {
  return request<SlaPolicy>(`/sla-policies/priority/${priority}`);
};

/**
 * Create a new SLA policy (Admin only).
 */
export const createSlaPolicy = async (
  data: CreateSlaPolicyRequest,
): Promise<SlaPolicy> => {
  return request<SlaPolicy>("/sla-policies", {
    method: "POST",
    body: data,
  });
};

/**
 * Update an existing SLA policy (Admin only).
 */
export const updateSlaPolicy = async (
  id: string,
  data: UpdateSlaPolicyRequest,
): Promise<SlaPolicy> => {
  return request<SlaPolicy>(`/sla-policies/${id}`, {
    method: "PATCH",
    body: data,
  });
};

/**
 * Delete an SLA policy (Admin only).
 */
export const deleteSlaPolicy = async (id: string): Promise<void> => {
  await request<void>(`/sla-policies/${id}`, {
    method: "DELETE",
  });
};
