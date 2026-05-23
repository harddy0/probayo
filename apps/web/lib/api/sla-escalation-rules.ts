/**
 * SLA Escalation Rules API Module
 *
 * Feature-based API functions for SLA escalation rule operations.
 * Can be imported by any role (admin, IT staff, etc.).
 */

import { request } from "./client";
import type {
  EscalationRule,
  UpdateEscalationRuleRequest,
} from "../types/sla-escalation-rules";

/**
 * Fetch all escalation rules.
 */
export const fetchEscalationRules = async (): Promise<EscalationRule[]> => {
  return request<EscalationRule[]>("/sla-escalation-rules");
};

/**
 * Fetch a single escalation rule by ID.
 */
export const fetchEscalationRuleById = async (
  id: string,
): Promise<EscalationRule> => {
  return request<EscalationRule>(`/sla-escalation-rules/${id}`);
};

/**
 * Update an existing escalation rule (Admin only).
 */
export const updateEscalationRule = async (
  id: string,
  data: UpdateEscalationRuleRequest,
): Promise<EscalationRule> => {
  return request<EscalationRule>(`/sla-escalation-rules/${id}`, {
    method: "PATCH",
    body: data,
  });
};
