/**
 * SLA Policy Types
 *
 * Feature-based types for SLA (Service Level Agreement) policy management.
 */

export type SlaPolicyPriority = "critical" | "high" | "medium" | "low";

export type SlaPolicy = {
  id: string;
  priorityLevel: SlaPolicyPriority;
  acknowledgementMinutes: number;
  resolutionMinutes: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateSlaPolicyRequest = {
  priorityLevel: SlaPolicyPriority;
  acknowledgementMinutes: number;
  resolutionMinutes: number;
};

export type UpdateSlaPolicyRequest = {
  acknowledgementMinutes?: number;
  resolutionMinutes?: number;
};
