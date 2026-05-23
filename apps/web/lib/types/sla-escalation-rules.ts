/**
 * SLA Escalation Rules Types
 *
 * Feature-based types for SLA escalation rule management.
 * Based on the backend EscalationRuleResponseDto and UpdateEscalationRuleDto.
 */

export type EscalationPriority = "Critical" | "High" | "Medium" | "Low";

export type SlaEscalationType = "Acknowledgement" | "Resolution";

export type NotifyRole = "Admin" | "DepartmentHead";

export type EscalationRule = {
  id: string;
  priorityLevel: EscalationPriority;
  slaType: SlaEscalationType;
  escalationLevel: number;
  triggerAfterMinutes: number;
  notifyRole: NotifyRole;
};

export type UpdateEscalationRuleRequest = {
  priorityLevel?: EscalationPriority;
  slaType?: SlaEscalationType;
  escalationLevel?: number;
  triggerAfterMinutes?: number;
  notifyRole?: NotifyRole;
};
