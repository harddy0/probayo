/**
 * Ticket Types
 *
 * Defines the structure for ticketing data, responses, and API payloads.
 */

import type { Asset } from "./assets";

// ── Re-exports from feature-based modules ──
import type {
  TicketCategory,
  TicketCategoryCreateRequest,
  TicketCategoryUpdateRequest,
} from "./ticket-categories";
export type {
  TicketCategory,
  TicketCategoryCreateRequest,
  TicketCategoryUpdateRequest,
};

import type {
  KnownIssueStatus,
  KnownIssue,
  BulkAttachKnownIssueRequest,
} from "./known-issues";
export type {
  KnownIssueStatus,
  KnownIssue,
  BulkAttachKnownIssueRequest,
};

export type TicketPriority = "Critical" | "High" | "Medium" | "Low";

export type TicketStatus =
  | "Open"
  | "Acknowledged"
  | "PendingUser"
  | "InProgress"
  | "Resolved"
  | "Closed";

export type TicketUserSummary = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type TicketDepartment = {
  id: string;
  name: string;
  headUserId?: string | null;
};

export type TicketStatusHistory = {
  id: string;
  ticketId: string;
  changedByUserId: string;
  fromStatus?: TicketStatus | null;
  toStatus: TicketStatus;
  changedAt: string;
  changedByUser?: TicketUserSummary;
};

export type TicketAttachment = {
  id: string;
  ticketId: string;
  commentId?: string | null;
  uploadedByUserId: string;
  fileUrlOrPath: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number | null;
  createdAt: string;
  uploadedByUser?: TicketUserSummary;
};

export type TicketComment = {
  id: string;
  ticketId: string;
  authorUserId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  authorUser?: TicketUserSummary;
  attachments?: TicketAttachment[];
};

export type TicketCounts = {
  comments: number;
  attachments: number;
};

export type Ticket = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  assetId?: string | null;
  filedByUserId: string;
  departmentId: string;
  assignedToUserId?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  knownIssueId?: string | null;
  slaAckDeadline: string;
  slaResolutionDeadline: string;
  slaPausedAt?: string | null;
  totalPausedMinutes?: number;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  slaAckBreached?: boolean;
  slaResolutionBreached?: boolean;
  createdAt: string;
  updatedAt: string;
  filedByUser?: TicketUserSummary;
  assignedToUser?: TicketUserSummary | null;
  department?: TicketDepartment;
  category?: TicketCategory;
  asset?: Asset | null;
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  statusHistory?: TicketStatusHistory[];
  _count?: TicketCounts;
};

export type TicketListFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToUserId?: string;
  departmentId?: string;
  categoryId?: string;
  /** Filter for tickets that have no assignee (unclaimed) */
  unassigned?: boolean;
  /** Filter tickets attached to a specific known issue */
  knownIssueId?: string;
};

export type TicketListResponse = Ticket[];

export type CreateTicketRequest = {
  title: string;
  description: string;
  categoryId: string;
  assetId?: string | null;
  priority?: TicketPriority;
  knownIssueId?: string | null;
};

export type UpdateTicketRequest = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedToUserId?: string | null;
  categoryId?: string;
  departmentId?: string;
  knownIssueId?: string | null;
  /** IT staff only: acknowledge + self-assign in one action */
  accept?: boolean;
  /** Create a known issue and attach it to this ticket. Mutually exclusive with knownIssueId. */
  createKnownIssue?: {
    title: string;
    description: string;
    status?: KnownIssueStatus;
  };
};

export type TicketCommentCreateRequest = {
  body: string;
  isInternal?: boolean;
};

export type TicketCommentUpdateRequest = {
  body: string;
};

export type AttachmentUploadResponse = {
  jobId: string;
};

export type AttachmentJobState =
  | "completed"
  | "failed"
  | "active"
  | "waiting"
  | "delayed"
  | "paused"
  | "waiting-children"
  | "unknown";

export type AttachmentJobStatus = {
  id?: string;
  state: AttachmentJobState;
  progress?: number | Record<string, unknown>;
  result?: unknown;
  failedReason?: string | null;
};
