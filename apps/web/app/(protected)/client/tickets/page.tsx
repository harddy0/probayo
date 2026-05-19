"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  FileUp,
  Loader,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Ticket as TicketIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import TicketCreateModal from "@/components/tickets/ticket-create-modal";
import { fetchAllAssets } from "@/lib/api/assets";
import { getAuthSession, isApiError } from "@/lib/api/client";
import {
  addTicketComment,
  deleteAttachment,
  downloadAttachment,
  fetchActiveKnownIssues,
  fetchAttachmentJobStatus,
  fetchTicketById,
  fetchTicketCategories,
  fetchTickets,
  uploadCommentAttachment,
  uploadTicketAttachment,
} from "@/lib/api/tickets";
import type { Asset } from "@/lib/types/assets";
import type {
  KnownIssue,
  Ticket as TicketRecord,
  TicketAttachment,
  TicketCategory,
  TicketListFilters,
  TicketPriority,
  TicketStatus,
} from "@/lib/types/tickets";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
];
const ACCEPTED_FILE_TYPES = ALLOWED_MIME_TYPES.join(",");
const UPLOAD_POLL_INTERVAL_MS = 1500;
const UPLOAD_MAX_ATTEMPTS = 40;

const statusLabels: Record<TicketStatus, string> = {
  Open: "Open",
  Acknowledged: "Acknowledged",
  PendingUser: "Pending user",
  InProgress: "In progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

const priorityLabels: Record<TicketPriority, string> = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Critical: "Critical",
};

const statusStyles: Record<TicketStatus, string> = {
  Open: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  Acknowledged: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  PendingUser: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  InProgress: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  Resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  Closed: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
};

const priorityStyles: Record<TicketPriority, string> = {
  Critical: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  High: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

type UploadStatus = "uploading" | "processing" | "completed" | "failed";

type UploadItem = {
  id: string;
  fileName: string;
  status: UploadStatus;
  scope: "ticket" | "comment";
  error?: string;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatFileSize = (bytes?: number | null) => {
  if (bytes === null || bytes === undefined) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  const formatted =
    value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[index]}`;
};

const formatUserName = (
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null,
) => {
  if (!user) return "—";
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email || "—";
};

const validateFile = (file: File) => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is larger than 10MB.";
  }
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return "File type is not supported.";
  }
  return null;
};

const sleep = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const pollAttachmentJob = async (jobId: string) => {
  for (let attempt = 0; attempt < UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    const status = await fetchAttachmentJobStatus(jobId);

    if (status.state === "completed") {
      return status;
    }

    if (status.state === "failed") {
      throw new Error(status.failedReason || "Upload failed.");
    }

    await sleep(UPLOAD_POLL_INTERVAL_MS);
  }

  throw new Error("Upload timed out.");
};

export default function ClientTicketsPage() {
  const { push } = useToast();
  const session = getAuthSession();
  const currentUserId = session?.identity?.userId ?? null;

  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [filters, setFilters] = useState<TicketListFilters>({});
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [knownIssues, setKnownIssues] = useState<KnownIssue[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentFiles, setCommentFiles] = useState<FileList | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);

  const ticketFileInputRef = useRef<HTMLInputElement | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement | null>(null);

  const assetsForUser = useMemo(() => {
    if (!currentUserId) {
      return assets;
    }
    return assets.filter((asset) => asset.assignedToUserId === currentUserId);
  }, [assets, currentUserId]);

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchTickets(filters);
      setTickets(data);
      setSelectedTicketId((current) => {
        if (!data.length) return null;
        if (current && data.some((ticket) => ticket.id === current)) {
          return current;
        }
        const firstTicket = data[0];
        return firstTicket ? firstTicket.id : null;
      });
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load tickets.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadTicketDetail = useCallback(async (ticketId: string) => {
    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const detail = await fetchTicketById(ticketId);
      setSelectedTicket(detail);
    } catch (err) {
      setDetailError(isApiError(err) ? err.message : "Failed to load ticket.");
      setSelectedTicket(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    setReferenceError(null);

    try {
      const [categoryData, assetData, issueData] = await Promise.all([
        fetchTicketCategories(),
        fetchAllAssets(),
        fetchActiveKnownIssues(),
      ]);
      setCategories(categoryData);
      setAssets(assetData);
      setKnownIssues(issueData);
    } catch (err) {
      setReferenceError(
        isApiError(err) ? err.message : "Failed to load ticket references.",
      );
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }
    void loadTicketDetail(selectedTicketId);
  }, [selectedTicketId, loadTicketDetail]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  const ticketAttachments = useMemo(() => {
    if (!selectedTicket?.attachments) return [];
    return selectedTicket.attachments.filter(
      (attachment) => !attachment.commentId,
    );
  }, [selectedTicket]);

  const handleRefresh = async () => {
    await loadTickets();
    if (selectedTicketId) {
      await loadTicketDetail(selectedTicketId);
    }
  };

  const handleTicketCreated = (ticket: TicketRecord) => {
    setTickets((current) => [ticket, ...current]);
    setSelectedTicketId(ticket.id);
    setSelectedTicket(ticket);
    void loadTicketDetail(ticket.id);
  };

  const updateUploadItem = (id: string, update: Partial<UploadItem>) => {
    setUploadQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  };

  const removeUploadItem = (id: string) => {
    setUploadQueue((current) => current.filter((item) => item.id !== id));
  };

  const uploadFiles = async (
    files: FileList,
    scope: "ticket" | "comment",
    uploader: (file: File) => Promise<{ jobId: string }>,
  ) => {
    const tasks = Array.from(files).map(async (file) => {
      const validationError = validateFile(file);
      if (validationError) {
        push({
          title: "Upload blocked",
          description: `${file.name}: ${validationError}`,
          variant: "error",
        });
        return;
      }

      const uploadId = `${scope}-${Date.now()}-${file.name}`;
      setUploadQueue((current) => [
        ...current,
        { id: uploadId, fileName: file.name, status: "uploading", scope },
      ]);

      try {
        const { jobId } = await uploader(file);
        updateUploadItem(uploadId, { status: "processing" });
        await pollAttachmentJob(jobId);
        updateUploadItem(uploadId, { status: "completed" });
        window.setTimeout(() => removeUploadItem(uploadId), 2400);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        updateUploadItem(uploadId, { status: "failed", error: message });
      }
    });

    await Promise.all(tasks);
  };

  const handleTicketFilesChange = async (files: FileList | null) => {
    if (!files || !selectedTicket) return;

    await uploadFiles(files, "ticket", (file) =>
      uploadTicketAttachment(selectedTicket.id, file),
    );

    await loadTicketDetail(selectedTicket.id);
    await loadTickets();

    if (ticketFileInputRef.current) {
      ticketFileInputRef.current.value = "";
    }
  };

  const handleCommentSubmit = async () => {
    if (!selectedTicket) return;
    const body = commentBody.trim();

    if (!body) {
      setCommentError("Comment is required.");
      return;
    }

    setIsCommentSubmitting(true);
    setCommentError(null);

    try {
      const created = await addTicketComment(selectedTicket.id, { body });

      if (commentFiles && commentFiles.length > 0) {
        await uploadFiles(commentFiles, "comment", (file) =>
          uploadCommentAttachment(created.id, file),
        );
      }

      setCommentBody("");
      setCommentFiles(null);
      if (commentFileInputRef.current) {
        commentFileInputRef.current.value = "";
      }

      await loadTicketDetail(selectedTicket.id);
      await loadTickets();
      push({
        title: "Comment added",
        description: "Your update was shared on the ticket.",
        variant: "success",
      });
    } catch (err) {
      setCommentError(isApiError(err) ? err.message : "Failed to add comment.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleDownloadAttachment = async (attachment: TicketAttachment) => {
    try {
      const { blob, fileName } = await downloadAttachment(attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || attachment.fileName || "attachment";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      push({
        title: "Download failed",
        description: isApiError(err)
          ? err.message
          : "Unable to download the attachment.",
        variant: "error",
      });
    }
  };

  const handleDeleteAttachment = async (attachment: TicketAttachment) => {
    if (!selectedTicket) return;
    if (!confirm("Delete this attachment?")) return;

    try {
      await deleteAttachment(attachment.id);
      push({
        title: "Attachment deleted",
        description: "The file was removed successfully.",
        variant: "success",
      });
      await loadTicketDetail(selectedTicket.id);
      await loadTickets();
    } catch (err) {
      push({
        title: "Delete failed",
        description: isApiError(err)
          ? err.message
          : "Unable to delete the attachment.",
        variant: "error",
      });
    }
  };

  const ticketListEmpty = !isLoading && tickets.length === 0;

  return (
    <section className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
            Tickets
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Service requests
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Track IT support tickets, attach files, and add updates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-11 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
            onClick={handleRefresh}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button className="h-11" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New ticket
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-rose-400" />
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      ) : null}

      {referenceError ? (
        <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-amber-300" />
          <p className="text-sm text-amber-200">{referenceError}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_360px)_minmax(0,_1fr)]">
        <div className="space-y-4">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Refine your ticket list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={filters.status ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value
                        ? (event.target.value as TicketStatus)
                        : undefined,
                    }))
                  }
                  className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-zinc-50 outline-none transition hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                >
                  <option value="">All statuses</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <select
                  value={filters.priority ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      priority: event.target.value
                        ? (event.target.value as TicketPriority)
                        : undefined,
                    }))
                  }
                  className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-zinc-50 outline-none transition hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                >
                  <option value="">All priorities</option>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">My tickets</CardTitle>
                <CardDescription>
                  {tickets.length} active records
                </CardDescription>
              </div>
              <TicketIcon className="h-5 w-5 text-zinc-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader className="h-4 w-4 animate-spin" />
                  Loading tickets...
                </div>
              ) : ticketListEmpty ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                  No tickets yet. Create your first request.
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const isActive = ticket.id === selectedTicketId;
                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition",
                          isActive
                            ? "border-white/30 bg-white/10"
                            : "border-white/10 bg-white/5 hover:border-white/20",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {ticket.title}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {ticket.category?.name || "Uncategorized"} ·{" "}
                              {formatDateTime(ticket.createdAt)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                              statusStyles[ticket.status],
                            )}
                          >
                            {statusLabels[ticket.status]}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] uppercase",
                              priorityStyles[ticket.priority],
                            )}
                          >
                            {priorityLabels[ticket.priority]}
                          </span>
                          <span>
                            {ticket._count?.comments ?? 0} comments ·{" "}
                            {ticket._count?.attachments ?? 0} files
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {isDetailLoading ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex items-center gap-2 py-8 text-sm text-zinc-400">
                <Loader className="h-4 w-4 animate-spin" />
                Loading ticket details...
              </CardContent>
            </Card>
          ) : detailError ? (
            <Card className="border-rose-500/20 bg-rose-500/10">
              <CardContent className="flex items-center gap-2 py-6 text-sm text-rose-200">
                <AlertCircle className="h-4 w-4" />
                {detailError}
              </CardContent>
            </Card>
          ) : !selectedTicket ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="py-10 text-center text-sm text-zinc-400">
                Select a ticket to see details.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-2xl">
                        {selectedTicket.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Ticket ID: {selectedTicket.id}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide",
                          statusStyles[selectedTicket.status],
                        )}
                      >
                        {statusLabels[selectedTicket.status]}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide",
                          priorityStyles[selectedTicket.priority],
                        )}
                      >
                        {priorityLabels[selectedTicket.priority]}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-zinc-200 whitespace-pre-line">
                      {selectedTicket.description}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailItem
                      label="Category"
                      value={selectedTicket.category?.name || "—"}
                    />
                    <DetailItem
                      label="Asset"
                      value={selectedTicket.asset?.deviceType || "—"}
                    />
                    <DetailItem
                      label="Assigned to"
                      value={formatUserName(selectedTicket.assignedToUser)}
                    />
                    <DetailItem
                      label="Created"
                      value={formatDateTime(selectedTicket.createdAt)}
                    />
                    <DetailItem
                      label="Updated"
                      value={formatDateTime(selectedTicket.updatedAt)}
                    />
                    <DetailItem
                      label="Acknowledged"
                      value={formatDateTime(selectedTicket.acknowledgedAt)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-zinc-400" />
                    <div>
                      <CardTitle className="text-lg">Attachments</CardTitle>
                      <CardDescription>
                        Add files to help IT understand the issue.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-attachments">Upload files</Label>
                    <input
                      id="ticket-attachments"
                      ref={ticketFileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_FILE_TYPES}
                      onChange={(event) =>
                        void handleTicketFilesChange(event.target.files)
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-white/20"
                    />
                    <p className="text-xs text-zinc-500">
                      Max 10MB per file. Images, PDF, docs, spreadsheets, text,
                      and archives supported.
                    </p>
                  </div>

                  {ticketAttachments.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                      No attachments yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ticketAttachments.map((attachment) => (
                        <AttachmentRow
                          key={attachment.id}
                          attachment={attachment}
                          onDownload={handleDownloadAttachment}
                          onDelete={handleDeleteAttachment}
                          canDelete={
                            attachment.uploadedByUserId === currentUserId
                          }
                        />
                      ))}
                    </div>
                  )}

                  {uploadQueue.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                        Uploads
                      </p>
                      {uploadQueue.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300"
                        >
                          <span className="truncate">{item.fileName}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] uppercase",
                              item.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-200"
                                : item.status === "failed"
                                  ? "bg-rose-500/10 text-rose-200"
                                  : "bg-white/10 text-zinc-200",
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-zinc-400" />
                    <div>
                      <CardTitle className="text-lg">Comments</CardTitle>
                      <CardDescription>
                        Share updates or respond to IT questions.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {selectedTicket.comments &&
                  selectedTicket.comments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedTicket.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{formatUserName(comment.authorUser)}</span>
                            <span>{formatDateTime(comment.createdAt)}</span>
                          </div>
                          <p className="mt-2 text-sm text-zinc-200 whitespace-pre-line">
                            {comment.body}
                          </p>

                          {comment.attachments &&
                          comment.attachments.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {comment.attachments.map((attachment) => (
                                <AttachmentRow
                                  key={attachment.id}
                                  attachment={attachment}
                                  onDownload={handleDownloadAttachment}
                                  onDelete={handleDeleteAttachment}
                                  canDelete={
                                    attachment.uploadedByUserId ===
                                    currentUserId
                                  }
                                  compact
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                      No comments yet.
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Add a comment</Label>
                    <Textarea
                      value={commentBody}
                      onChange={(event) => setCommentBody(event.target.value)}
                      placeholder="Share an update, question, or clarification"
                      rows={4}
                    />
                    <input
                      ref={commentFileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_FILE_TYPES}
                      onChange={(event) => setCommentFiles(event.target.files)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-white/20"
                    />
                    {commentError ? (
                      <p className="text-sm text-rose-400">{commentError}</p>
                    ) : null}
                    <Button
                      className="h-11"
                      onClick={() => void handleCommentSubmit()}
                      disabled={isCommentSubmitting}
                    >
                      {isCommentSubmitting ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileUp className="mr-2 h-4 w-4" />
                      )}
                      Add comment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {selectedTicket.statusHistory &&
              selectedTicket.statusHistory.length > 0 ? (
                <Card className="border-white/10 bg-white/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Status history</CardTitle>
                    <CardDescription>Recent status changes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedTicket.statusHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-400"
                        >
                          <div>
                            <p className="text-sm text-zinc-200">
                              {entry.fromStatus
                                ? statusLabels[entry.fromStatus]
                                : "New"}{" "}
                              → {statusLabels[entry.toStatus]}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatUserName(entry.changedByUser)}
                            </p>
                          </div>
                          <span>{formatDateTime(entry.changedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>

      <TicketCreateModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleTicketCreated}
        categories={categories}
        assets={assetsForUser}
        knownIssues={knownIssues}
      />
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm text-zinc-100">{value}</p>
    </div>
  );
}

function AttachmentRow({
  attachment,
  onDownload,
  onDelete,
  canDelete,
  compact,
}: {
  attachment: TicketAttachment;
  onDownload: (attachment: TicketAttachment) => void;
  onDelete: (attachment: TicketAttachment) => void;
  canDelete: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3",
        compact && "px-3 py-2",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-100">{attachment.fileName}</p>
        <p className="text-xs text-zinc-500">
          {formatFileSize(attachment.fileSizeBytes)} ·{" "}
          {formatDateTime(attachment.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDownload(attachment)}
          className="rounded-full border border-white/10 p-2 text-zinc-300 transition hover:border-white/30 hover:text-white"
        >
          <Download className="h-4 w-4" />
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(attachment)}
            className="rounded-full border border-rose-500/30 p-2 text-rose-300 transition hover:border-rose-400/60 hover:text-rose-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
