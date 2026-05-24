/**
 * Tickets API Module
 *
 * Handles ticketing operations, comments, attachments, categories, and known issues.
 */

import { request, requestFormData, requestRaw } from "./client";
import type {
  AttachmentJobStatus,
  AttachmentUploadResponse,
  CreateTicketRequest,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketCommentCreateRequest,
  TicketCommentUpdateRequest,
  TicketListFilters,
  TicketListResponse,
  UpdateTicketRequest,
} from "../types/tickets";

// ── Re-exports from feature-based modules ──
export {
  fetchTicketCategories,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory,
} from "./ticket-categories";

export {
  fetchKnownIssues,
  fetchActiveKnownIssues,
  createKnownIssue,
  updateKnownIssue,
  deleteKnownIssue,
  bulkAttachKnownIssue,
  createAndAttachKnownIssue,
} from "./known-issues";

export type AttachmentDownload = {
  blob: Blob;
  fileName?: string;
  contentType?: string | null;
};

const buildTicketQuery = (filters?: TicketListFilters) => {
  if (!filters) {
    return "";
  }

  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.priority) {
    params.set("priority", filters.priority);
  }
  if (filters.assignedToUserId) {
    params.set("assignedToUserId", filters.assignedToUserId);
  }
  if (filters.departmentId) {
    params.set("departmentId", filters.departmentId);
  }
  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }
  if (filters.unassigned) {
    params.set("assignedToUserId", "");
  }
  if (filters.knownIssueId) {
    params.set("knownIssueId", filters.knownIssueId);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};

const buildFileFormData = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
};

const parseFileName = (
  contentDisposition: string | null,
): string | undefined => {
  if (!contentDisposition) {
    return undefined;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = /filename=([^;]+)/i.exec(contentDisposition);
  return plainMatch?.[1]?.trim();
};

export const fetchTickets = async (
  filters?: TicketListFilters,
): Promise<TicketListResponse> => {
  const query = buildTicketQuery(filters);
  return request<TicketListResponse>(`/tickets${query}`);
};

export const fetchTicketById = async (id: string): Promise<Ticket> => {
  return request<Ticket>(`/tickets/${id}`);
};

export const createTicket = async (
  data: CreateTicketRequest,
): Promise<Ticket> => {
  return request<Ticket>("/tickets", {
    method: "POST",
    body: data,
  });
};

export const updateTicket = async (
  id: string,
  data: UpdateTicketRequest,
): Promise<Ticket> => {
  return request<Ticket>(`/tickets/${id}`, {
    method: "PATCH",
    body: data,
  });
};

/**
 * Fetch all tickets attached to a specific known issue.
 */
export const fetchTicketsByKnownIssue = async (
  knownIssueId: string,
): Promise<TicketListResponse> => {
  return fetchTickets({ knownIssueId });
};

/**
 * Resolve all tickets attached to a known issue by setting their status to "Resolved".
 */
export const resolveTicketsUnderKnownIssue = async (
  knownIssueId: string,
): Promise<Ticket[]> => {
  const tickets = await fetchTicketsByKnownIssue(knownIssueId);
  const updated: Ticket[] = [];
  for (const ticket of tickets) {
    if (ticket.status !== "Resolved" && ticket.status !== "Closed") {
      const result = await updateTicket(ticket.id, { status: "Resolved" });
      updated.push(result);
    } else {
      updated.push(ticket);
    }
  }
  return updated;
};

export const deleteTicket = async (id: string): Promise<void> => {
  await request<void>(`/tickets/${id}`, {
    method: "DELETE",
  });
};

export const assignTicket = async (
  id: string,
  userId: string,
): Promise<Ticket> => {
  return request<Ticket>(`/tickets/${id}/assign/${userId}`, {
    method: "POST",
  });
};

export const unassignTicket = async (id: string): Promise<Ticket> => {
  return request<Ticket>(`/tickets/${id}/unassign`, {
    method: "POST",
  });
};

export const addTicketComment = async (
  ticketId: string,
  data: TicketCommentCreateRequest,
): Promise<TicketComment> => {
  return request<TicketComment>(`/tickets/${ticketId}/comments`, {
    method: "POST",
    body: data,
  });
};

export const fetchTicketComments = async (
  ticketId: string,
): Promise<TicketComment[]> => {
  return request<TicketComment[]>(`/tickets/${ticketId}/comments`);
};

export const updateTicketComment = async (
  commentId: string,
  data: TicketCommentUpdateRequest,
): Promise<TicketComment> => {
  return request<TicketComment>(`/comments/${commentId}`, {
    method: "PATCH",
    body: data,
  });
};

export const deleteTicketComment = async (commentId: string): Promise<void> => {
  await request<void>(`/comments/${commentId}`, {
    method: "DELETE",
  });
};

export const uploadTicketAttachment = async (
  ticketId: string,
  file: File,
): Promise<AttachmentUploadResponse> => {
  return requestFormData<AttachmentUploadResponse>(
    `/attachments/tickets/${ticketId}`,
    {
      method: "POST",
      body: buildFileFormData(file),
    },
  );
};

export const uploadCommentAttachment = async (
  commentId: string,
  file: File,
): Promise<AttachmentUploadResponse> => {
  return requestFormData<AttachmentUploadResponse>(
    `/attachments/comments/${commentId}`,
    {
      method: "POST",
      body: buildFileFormData(file),
    },
  );
};

export const fetchAttachmentJobStatus = async (
  jobId: string,
): Promise<AttachmentJobStatus> => {
  return request<AttachmentJobStatus>(`/attachments/jobs/${jobId}/status`);
};

export const fetchTicketAttachments = async (
  ticketId: string,
): Promise<TicketAttachment[]> => {
  return request<TicketAttachment[]>(`/attachments/tickets/${ticketId}`);
};

export const fetchCommentAttachments = async (
  commentId: string,
): Promise<TicketAttachment[]> => {
  return request<TicketAttachment[]>(`/attachments/comments/${commentId}`);
};

export const downloadAttachment = async (
  attachmentId: string,
): Promise<AttachmentDownload> => {
  const response = await requestRaw(`/attachments/${attachmentId}/download`, {
    method: "GET",
  });

  return {
    blob: await response.blob(),
    fileName: parseFileName(response.headers.get("content-disposition")),
    contentType: response.headers.get("content-type"),
  };
};

export const deleteAttachment = async (attachmentId: string): Promise<void> => {
  await request<void>(`/attachments/${attachmentId}`, {
    method: "DELETE",
  });
};
