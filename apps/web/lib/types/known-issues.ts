/**
 * Known Issue Types
 *
 * Feature-based types for known issue management.
 * Extracted from the ticket module for admin CRUD operations.
 */

export type KnownIssueStatus = "Active" | "Resolved";

export type KnownIssue = {
  id: string;
  title: string;
  description: string;
  createdByUserId: string;
  status: KnownIssueStatus;
  resolvedAt?: string | null;
  createdAt: string;
  deletedAt?: string | null;
};

export type CreateKnownIssueRequest = {
  title: string;
  description: string;
  status?: KnownIssueStatus;
};

export type UpdateKnownIssueRequest = {
  title?: string;
  description?: string;
  status?: KnownIssueStatus;
};

export type UpdateKnownIssueStatusRequest = {
  status: KnownIssueStatus;
};

export type BulkAttachKnownIssueRequest = {
  ticketIds: string[];
  knownIssueId: string;
};

export type CreateAndAttachKnownIssueRequest = {
  title: string;
  description: string;
  status?: KnownIssueStatus;
  ticketIds: string[];
};
