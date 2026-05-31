/**
 * Audit Log Types
 *
 * Defines the structure for audit log entries returned by the backend.
 * Based on the backend's AuditLogResponseDto schema.
 */

export type AuditAction =
  | "Create"
  | "Update"
  | "Delete"
  | "View"
  | "Assign"
  | "Unassign"
  | "Comment"
  | "Login"
  | "Logout"
  | "Upload"
  | "Download";

export type AuditEntityType =
  | "Ticket"
  | "Comment"
  | "Attachment"
  | "User"
  | "Department"
  | "KnownIssue"
  | "SlaPolicy"
  | "EscalationRule"
  | "Asset"
  | "Category";

export type AuditActor = {
  id: string;
  fullName: string;
  email: string;
};

export type AuditLogEntry = {
  id: string;
  actor: AuditActor;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
};

export type AuditLogMeta = {
  itemsPerPage: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
};

export type AuditLogPaginatedResponse = {
  data: AuditLogEntry[];
  meta: AuditLogMeta;
};
