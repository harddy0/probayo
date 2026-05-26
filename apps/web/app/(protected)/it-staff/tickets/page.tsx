"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Download,
  FileUp,
  Inbox,
  Loader,
  LogOut,
  RefreshCw,
  Search,
  TicketCheck,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { getAuthSession, isApiError } from "@/lib/api/client";
import {
  addTicketComment,
  deleteAttachment,
  downloadAttachment,
  fetchAttachmentJobStatus,
  fetchTicketById,
  fetchTicketsByKnownIssue,
  resolveTicketsUnderKnownIssue,
  updateTicket,
  uploadCommentAttachment,
  uploadTicketAttachment,
} from "@/lib/api/tickets";
import {
  bulkAttachKnownIssue,
  fetchActiveKnownIssues,
  fetchKnownIssues,
} from "@/lib/api/known-issues";
import {
  claimAndAcknowledge,
  fetchItStaffTickets,
  releaseTicket,
} from "@/lib/api/it-staff";
import type {
  Ticket as TicketRecord,
  TicketAttachment,
  TicketPriority,
  TicketStatus,
} from "@/lib/types/tickets";
import type { KnownIssue } from "@/lib/types/known-issues";
import type { ItStaffTicketView } from "@/lib/types/it-staff";
import StatusPipeline from "@/components/it-staff/status-pipeline";
import BatchAttachModal from "@/components/it-staff/batch-attach-modal";
import { cn } from "@/lib/utils";

// ── Constants ──

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "application/zip", "application/x-zip-compressed",
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
  Closed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

const priorityStyles: Record<TicketPriority, string> = {
  Critical: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  High: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

const STATUS_ORDER = ["Open", "Acknowledged", "PendingUser", "InProgress", "Resolved", "Closed"] as const;

const PROG_COLORS = [
  "bg-emerald-500/50",
  "bg-sky-500/50",
  "bg-amber-500/50",
  "bg-indigo-500/50",
  "bg-emerald-500/50",
  "bg-emerald-500/50",
] as const;

const getNextStatus = (current: TicketStatus): TicketStatus | null => {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1] as TicketStatus;
};



type UploadStatus = "uploading" | "processing" | "completed" | "failed";

type UploadItem = {
  id: string;
  fileName: string;
  status: UploadStatus;
  scope: "ticket" | "comment";
  error?: string;
};

type TabId = "details" | "attachments" | "comments";

type ActionState = {
  type: "accept" | "status" | "release";
  ticketId: string;
  loading: boolean;
};

// ── Helpers ──

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
  if (bytes === null || bytes === undefined) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const formatted = value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[index]}`;
};

const formatUserName = (
  user?: { firstName?: string; lastName?: string; email?: string } | null,
) => {
  if (!user) return "—";
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email || "—";
};

const validateFile = (file: File) => {
  if (file.size > MAX_FILE_SIZE_BYTES) return "File is larger than 10MB.";
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) return "File type is not supported.";
  return null;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const pollAttachmentJob = async (jobId: string) => {
  for (let attempt = 0; attempt < UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    const status = await fetchAttachmentJobStatus(jobId);
    if (status.state === "completed") return status;
    if (status.state === "failed") throw new Error(status.failedReason || "Upload failed.");
    await sleep(UPLOAD_POLL_INTERVAL_MS);
  }
  throw new Error("Upload timed out.");
};

// ── Views ──

const views: { id: ItStaffTicketView; label: string; icon: React.ReactNode }[] = [
  { id: "unassigned", label: "Unassigned", icon: <Inbox className="h-4 w-4" /> },
  { id: "my-tickets", label: "My tickets", icon: <UserCheck className="h-4 w-4" /> },
  { id: "all", label: "All tickets", icon: <Circle className="h-4 w-4" /> },
];

// ── SLA Timer ──

function SlaTimer({ deadline, breached }: { deadline?: string | null; breached?: boolean | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!deadline) return null;

  const target = new Date(deadline).getTime();
  const diffMs = target - now;
  const diffMins = Math.round(diffMs / (1000 * 60));

  if (breached) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-200">
        <Clock className="h-3 w-3" />
        Breached
      </span>
    );
  }

  if (diffMins <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-200">
        <Clock className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  if (diffMins <= 60) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
        <Clock className="h-3 w-3" />
        {diffMins}m
      </span>
    );
  }

  const hours = Math.floor(diffMins / 60);
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
      <Clock className="h-3 w-3" />
      {hours}h
    </span>
  );
}

// ── Attachment Image ──

function AttachmentImage({ attachment }: { attachment: TicketAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    downloadAttachment(attachment.id)
      .then(({ blob }) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id]);

  if (loading) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
        <Loader className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-32 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03]">
        <AlertCircle className="h-4 w-4 text-rose-400" />
        <span className="text-xs text-zinc-500">Failed to load</span>
      </div>
    );
  }
  if (url) {
    return (
      <img src={url} alt={attachment.fileName} className="max-h-48 rounded-xl object-contain" />
    );
  }
  return null;
}

// ── Main Page Component ──

export default function ItStaffTicketsPage() {
  const { push } = useToast();
  const session = getAuthSession();
  const currentUserId = session?.identity?.userId ?? null;
  const searchParams = useSearchParams();

  // ── Data State ──
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ── UI State ──
  const [activeView, setActiveView] = useState<ItStaffTicketView>("unassigned");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);

  // ── Batch Selection State ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchAttachOpen, setIsBatchAttachOpen] = useState(false);
  const [isResolvingAll, setIsResolvingAll] = useState(false);
  const [singleAttachTicketId, setSingleAttachTicketId] = useState<string | null>(null);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredTickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTickets.map((t) => t.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBatchAttach = async (knownIssueId: string) => {
    const ids = singleAttachTicketId ? [singleAttachTicketId] : Array.from(selectedIds);
    await bulkAttachKnownIssue({ ticketIds: ids, knownIssueId });
    push({ title: "Attached", description: `${ids.length} ticket${ids.length !== 1 ? "s" : ""} linked to known issue.`, variant: "success" });
    setSingleAttachTicketId(null);
    clearSelection();
    if (selectedTicket) await loadTicketDetail(selectedTicket.id);
    await loadTickets();
  };

  const handleResolveAllUnderKnownIssue = async (knownIssueId: string) => {
    setIsResolvingAll(true);
    try {
      const resolved = await resolveTicketsUnderKnownIssue(knownIssueId);
      push({ title: "Resolved", description: `${resolved.length} ticket${resolved.length !== 1 ? "s" : ""} resolved.`, variant: "success" });
      if (selectedTicket) {
        await loadTicketDetail(selectedTicket.id);
      }
      await loadTickets();
    } catch (err) {
      push({ title: "Failed", description: isApiError(err) ? err.message : "Could not resolve tickets.", variant: "error" });
    } finally {
      setIsResolvingAll(false);
    }
  };

  // ── Comment State ──
  const [commentBody, setCommentBody] = useState("");
  const [commentFiles, setCommentFiles] = useState<FileList | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);

  const activeDetailRequestRef = useRef<string | null>(null);
  const ticketFileInputRef = useRef<HTMLInputElement | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Close status menu on outside click
  useEffect(() => {
    if (!statusMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusMenuOpen]);

  // ── Filtered Tickets ──
  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (filterStatus && filterStatus !== "all") {
      result = result.filter((t) => t.status === filterStatus);
    }
    if (filterPriority && filterPriority !== "all") {
      result = result.filter((t) => t.priority === filterPriority);
    }

    // Sort: critical/high first, then by created date descending
    const priorityOrder: Record<TicketPriority, number> = {
      Critical: 0, High: 1, Medium: 2, Low: 3,
    };
    result = [...result].sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [tickets, searchQuery, filterStatus, filterPriority]);

  // ── Load Functions ──
  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchItStaffTickets(activeView, currentUserId ?? undefined);
      setTickets(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load tickets.");
    } finally {
      setIsLoading(false);
    }
  }, [activeView, currentUserId]);

  const loadTicketDetail = useCallback(async (ticketId: string) => {
    activeDetailRequestRef.current = ticketId;
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await fetchTicketById(ticketId);
      if (activeDetailRequestRef.current !== ticketId) return;
      setSelectedTicket(detail);
    } catch (err) {
      if (activeDetailRequestRef.current !== ticketId) return;
      setDetailError(isApiError(err) ? err.message : "Failed to load ticket.");
      setSelectedTicket(null);
    } finally {
      if (activeDetailRequestRef.current === ticketId) {
        setIsDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  // Track whether URL param has been handled to avoid re-triggering
  const handledUrlRef = useRef(false);

  // Open ticket from URL param (e.g. from notification click)
  useEffect(() => {
    if (handledUrlRef.current) return;
    const ticketIdFromUrl = searchParams.get("ticketId");
    if (ticketIdFromUrl) {
      handledUrlRef.current = true;
      // Small delay to let the ticket list load first for instant context
      const timer = window.setTimeout(() => {
        handleRowClick(ticketIdFromUrl);
      }, 300);
      return () => window.clearTimeout(timer);
    }
    // The handleRowClick reference is intentionally omitted from deps
    // to avoid re-running the effect on every render.
  }, [searchParams]);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }
    void loadTicketDetail(selectedTicketId);
  }, [selectedTicketId, loadTicketDetail]);

  // ── Ticket Attachments ──
  const ticketAttachments = useMemo(() => {
    if (!selectedTicket?.attachments) return [];
    return selectedTicket.attachments.filter((a) => !a.commentId);
  }, [selectedTicket]);

  // ── Handlers ──

  const handleRefresh = async () => {
    await loadTickets();
  };

  const handleRowClick = (ticketId: string) => {
    setSelectedTicket(null);
    setIsDetailLoading(true);
    setSelectedTicketId(ticketId);
    setIsModalOpen(true);
    setActiveTab("details");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    setSelectedTicketId(null);
    setActiveTab("details");
    handledUrlRef.current = false;
  };

  const handleViewChange = (view: ItStaffTicketView) => {
    setActiveView(view);
    setFilterStatus("all");
    setFilterPriority("all");
    setSearchQuery("");
  };

  // ── Ticket Actions ──

  const handleClaimAndAcknowledge = async (ticketId: string) => {
    if (!currentUserId) return;
    setActionState({ type: "accept", ticketId, loading: true });
    try {
      await claimAndAcknowledge(ticketId, currentUserId);
      push({ title: "Ticket accepted", description: "Ticket assigned and set to Acknowledged.", variant: "success" });
      if (selectedTicket?.id === ticketId) {
        await loadTicketDetail(ticketId);
      }
      await loadTickets();
    } catch (err) {
      push({ title: "Failed", description: isApiError(err) ? err.message : "Could not accept ticket.", variant: "error" });
    } finally {
      setActionState(null);
    }
  };

  const handleReleaseTicket = async (ticketId: string) => {
    setActionState({ type: "release", ticketId, loading: true });
    try {
      await releaseTicket(ticketId);
      push({ title: "Ticket released", description: "The ticket is no longer assigned to you.", variant: "success" });
      if (selectedTicket?.id === ticketId) {
        await loadTicketDetail(ticketId);
      }
      await loadTickets();
    } catch (err) {
      push({ title: "Failed", description: isApiError(err) ? err.message : "Could not release ticket.", variant: "error" });
    } finally {
      setActionState(null);
    }
  };

  /** Validate that the transition follows the strict sequential order */
  const isValidTransition = (current: TicketStatus, target: TicketStatus): boolean => {
    const currentIdx = STATUS_ORDER.indexOf(current);
    const targetIdx = STATUS_ORDER.indexOf(target);
    if (currentIdx < 0 || targetIdx < 0) return false;
    // Only allow forward (+1)
    return targetIdx === currentIdx + 1;
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    // Find ticket from local state to validate transition (works for both modal & inline dropdown)
    const currentTicket = tickets.find(t => t.id === ticketId);
    if (!currentTicket) return;
    if (!isValidTransition(currentTicket.status, newStatus)) {
      push({
        title: "Invalid transition",
        description: `Cannot go from ${statusLabels[currentTicket.status]} to ${statusLabels[newStatus]}. Must follow: Open → Acknowledged → PendingUser → InProgress → Resolved → Closed`,
        variant: "error",
      });
      return;
    }
    setActionState({ type: "status", ticketId, loading: true });
    setStatusMenuOpen(null);
    try {
      await updateTicket(ticketId, { status: newStatus });
      push({ title: "Status updated", description: `Ticket set to ${statusLabels[newStatus]}.`, variant: "success" });
      if (selectedTicket?.id === ticketId) {
        await loadTicketDetail(ticketId);
      }
      await loadTickets();
    } catch (err) {
      push({ title: "Failed", description: isApiError(err) ? err.message : "Could not update status.", variant: "error" });
    } finally {
      setActionState(null);
    }
  };

  // ── Comment / Upload Handlers ──

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
        push({ title: "Upload blocked", description: `${file.name}: ${validationError}`, variant: "error" });
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
    await uploadFiles(files, "ticket", (file) => uploadTicketAttachment(selectedTicket.id, file));
    await loadTicketDetail(selectedTicket.id);
    await loadTickets();
    if (ticketFileInputRef.current) ticketFileInputRef.current.value = "";
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
        await uploadFiles(commentFiles, "comment", (file) => uploadCommentAttachment(created.id, file));
      }
      setCommentBody("");
      setCommentFiles(null);
      if (commentFileInputRef.current) commentFileInputRef.current.value = "";
      await loadTicketDetail(selectedTicket.id);
      await loadTickets();
      push({ title: "Comment added", description: "Your update was shared on the ticket.", variant: "success" });
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
        description: isApiError(err) ? err.message : "Unable to download the attachment.",
        variant: "error",
      });
    }
  };

  const handleDeleteAttachment = async (attachment: TicketAttachment) => {
    if (!selectedTicket) return;
    if (!confirm("Delete this attachment?")) return;
    try {
      await deleteAttachment(attachment.id);
      push({ title: "Attachment deleted", description: "The file was removed successfully.", variant: "success" });
      await loadTicketDetail(selectedTicket.id);
      await loadTickets();
    } catch (err) {
      push({
        title: "Delete failed",
        description: isApiError(err) ? err.message : "Unable to delete the attachment.",
        variant: "error",
      });
    }
  };

  const ticketListEmpty = !isLoading && filteredTickets.length === 0;

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Compact header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <TicketCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Tickets</h1>
            <p className="text-xs text-zinc-500">Manage incoming support requests</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="h-8 bg-white/10 px-3 text-xs text-zinc-200 hover:bg-white/15"
            onClick={handleRefresh}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error ? (
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* ── View Switcher ── */}
      <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => handleViewChange(view.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150",
              activeView === view.id
                ? "bg-white/10 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </div>

      {/* ── Search + Filter Bar ── */}
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by title…"
            className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/20"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Batch Operations Toolbar ── */}
      {selectedIds.size > 0 ? (
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
          <span className="text-sm text-zinc-400">
            <span className="font-medium text-zinc-200">{selectedIds.size}</span> selected
          </span>
          <div className="h-4 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => setIsBatchAttachOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/30"
          >
            <Bug className="h-3.5 w-3.5" />
            Attach to known issue
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* ── Ticket Table ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="divide-y divide-white/[0.06]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-4 px-6 py-4">
                <div className="h-4 w-8 rounded bg-white/10" />
                <div className="h-4 flex-1 rounded bg-white/10" />
                <div className="h-4 w-20 rounded bg-white/10" />
                <div className="h-4 w-20 rounded bg-white/10" />
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-4 w-28 rounded bg-white/10" />
                <div className="h-4 w-20 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : ticketListEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Inbox className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-400">
              {activeView === "unassigned"
                ? "No unassigned tickets. All caught up."
                : activeView === "my-tickets"
                  ? "No tickets assigned to you."
                  : "No tickets found."}
            </p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Search className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-400">No tickets match your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="w-10 px-3 py-3.5 text-left">
                    <input
                      type="checkbox"
                      checked={filteredTickets.length > 0 && selectedIds.size === filteredTickets.length}
                      onChange={selectAll}
                      className="rounded border-white/20 bg-white/5"
                    />
                  </th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">#</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">Ticket</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">Issue</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">Priority</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">Progression</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">SLA</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">Assignee</th>
                  <th className="px-3 py-3.5 text-right text-[10px] font-medium uppercase tracking-widest text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredTickets.map((ticket, index) => {
                  const isActionLoading = actionState?.ticketId === ticket.id && actionState.loading;
                  const isAssignedToMe = ticket.assignedToUserId === currentUserId;
                  const isUnassigned = !ticket.assignedToUserId;
                  // Only show forward (next) status in inline dropdown
                  const nextForInline = getNextStatus(ticket.status);
                  const availableStatuses = nextForInline ? [nextForInline] : [];

                  const currentIdx = STATUS_ORDER.indexOf(ticket.status as typeof STATUS_ORDER[number]);

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => handleRowClick(ticket.id)}
                      className={cn(
                        "cursor-pointer transition-colors duration-150",
                        selectedIds.has(ticket.id) ? "bg-white/[0.04]" : "hover:bg-white/5",
                      )}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ticket.id)}
                          onChange={() => toggleSelection(ticket.id)}
                          className="rounded border-white/20 bg-white/5"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="max-w-[200px] px-3 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-zinc-100">{ticket.title}</p>
                          </div>
                          <p className="truncate text-xs text-zinc-500">
                            {ticket.filedByUser ? formatUserName(ticket.filedByUser) : "—"}
                          </p>
                        </div>
                      </td>
                      {/* Known Issue */}
                      <td className="whitespace-nowrap px-3 py-4">
                        {ticket.knownIssueId ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-200">
                            <Bug className="h-2.5 w-2.5" />
                            Known
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                      {/* Priority */}
                      <td className="whitespace-nowrap px-3 py-4">
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                          priorityStyles[ticket.priority],
                        )}>
                          {priorityLabels[ticket.priority]}
                        </span>
                      </td>
                      {/* Mini Progression */}
                      <td className="whitespace-nowrap px-3 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5">
                            {STATUS_ORDER.map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full transition-all",
                                  i < currentIdx && PROG_COLORS[i],
                                  i === currentIdx && "h-1.5 w-3 rounded-full bg-white",
                                  i > currentIdx && "bg-white/10",
                                )}
                              />
                            ))}
                          </div>
                          <span className={cn(
                            "ml-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider",
                            statusStyles[ticket.status],
                          )}>
                            {statusLabels[ticket.status]}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        <SlaTimer
                          deadline={ticket.slaResolutionDeadline}
                          breached={ticket.slaResolutionBreached}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-400">
                        {formatUserName(ticket.assignedToUser)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {ticket.status === "Closed" ? (
                            <span className="text-[11px] text-zinc-600">Closed</span>
                          ) : (
                            <>
                              {/* Accept / Claim */}
                              {isUnassigned ? (
                                <button
                                  type="button"
                                  onClick={() => handleClaimAndAcknowledge(ticket.id)}
                                  disabled={isActionLoading}
                                  className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/20 disabled:opacity-50"
                                >
                                  {isActionLoading ? (
                                    <Loader className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                  Accept
                                </button>
                              ) : null}

                              {/* Status dropdown (assigned tickets) */}
                              {isAssignedToMe && availableStatuses.length > 0 ? (
                                <div className="relative" ref={statusMenuOpen === ticket.id ? statusMenuRef : undefined}>
                                  <button
                                    type="button"
                                    onClick={() => setStatusMenuOpen(statusMenuOpen === ticket.id ? null : ticket.id)}
                                    disabled={isActionLoading && actionState?.type === "status"}
                                    className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/20 disabled:opacity-50"
                                  >
                                    {isActionLoading && actionState?.type === "status" ? (
                                      <Loader className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                    Status
                                  </button>
                                  {statusMenuOpen === ticket.id ? (
                                    <div className="absolute right-0 bottom-full z-50 mb-1 w-44 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl backdrop-blur-xl">
                                      {availableStatuses.map((s) => (
                                        <button
                                          key={s}
                                          type="button"
                                          onClick={() => handleStatusChange(ticket.id, s)}
                                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
                                        >
                                          <span className={cn(
                                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider",
                                            statusStyles[s],
                                          )}>
                                            {statusLabels[s]}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {/* Release */}
                              {isAssignedToMe ? (
                                <button
                                  type="button"
                                  onClick={() => handleReleaseTicket(ticket.id)}
                                  disabled={isActionLoading && actionState?.type === "release"}
                                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:border-rose-500/30 hover:text-rose-300 disabled:opacity-50"
                                >
                                  {isActionLoading && actionState?.type === "release" ? (
                                    <Loader className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <LogOut className="h-3 w-3" />
                                  )}
                                  Release
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Ticket Detail Modal ── */}
      {isModalOpen && typeof window !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-xl"
              onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
            >
              <div className="mx-4 my-6 w-full max-w-7xl sm:mx-auto">
                <div className="flex max-h-[88vh] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900/95 shadow-2xl backdrop-blur-xl">
                  {/* Modal Header */}
                  <div className="flex items-start justify-between border-b border-white/[0.06] px-5 py-4">
                    <div className="min-w-0 flex-1">
                      {isDetailLoading ? (
                        <div className="flex items-center gap-3">
                          <Loader className="h-5 w-5 animate-spin text-zinc-400" />
                          <p className="text-sm text-zinc-400">Loading ticket details…</p>
                        </div>
                      ) : detailError ? (
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                          <p className="text-sm text-rose-200">{detailError}</p>
                        </div>
                      ) : selectedTicket ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold tracking-tight text-white">
                              {selectedTicket.title}
                            </h2>
                            <span className={cn(
                              "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                              statusStyles[selectedTicket.status],
                            )}>
                              {statusLabels[selectedTicket.status]}
                            </span>
                            <span className={cn(
                              "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                              priorityStyles[selectedTicket.priority],
                            )}>
                              {priorityLabels[selectedTicket.priority]}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                            <span>ID: {selectedTicket.id}</span>
                            {selectedTicket.assignedToUser ? (
                              <span>
                                Assigned to: {formatUserName(selectedTicket.assignedToUser)}
                              </span>
                            ) : (
                              <span className="text-amber-400">Unassigned</span>
                            )}
                          </div>

                          {/* Modal Action Bar */}
                          <div className="mt-3 flex items-center gap-2">
                            {selectedTicket.status === "Closed" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ticket closed
                              </span>
                            ) : (
                              <>
                                {!selectedTicket.assignedToUserId && currentUserId ? (
                                  <Button
                                    className="h-8 text-xs"
                                    onClick={() => {
                                      void handleClaimAndAcknowledge(selectedTicket.id);
                                    }}
                                  >
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                    Accept &amp; acknowledge
                                  </Button>
                                ) : null}
                                {selectedTicket.assignedToUserId === currentUserId ? (
                                  <>
                                    {/* Current status badge */}
                                    <span className={cn(
                                      "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
                                      statusStyles[selectedTicket.status],
                                    )}>
                                      {statusLabels[selectedTicket.status]}
                                    </span>

                                    {/* Advance to next sequential status */}
                                    {(() => {
                                      const next = getNextStatus(selectedTicket.status);
                                      if (!next) return null;
                                      return (
                                        <>
                                          <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
                                          <button
                                            type="button"
                                            onClick={() => void handleStatusChange(selectedTicket.id, next)}
                                            className={cn(
                                              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95",
                                              next === "PendingUser"
                                                ? "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                                                : next === "InProgress"
                                                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
                                                  : next === "Resolved"
                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                                                    : next === "Closed"
                                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                                                      : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/15",
                                            )}
                                          >
                                            {statusLabels[next]}
                                          </button>
                                        </>
                                      );
                                    })()}

                                    {/* Release button - ticket is not Closed in this branch */}
                                    <button
                                      type="button"
                                      onClick={() => void handleReleaseTicket(selectedTicket.id)}
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10"
                                    >
                                      <LogOut className="h-3.5 w-3.5" />
                                      Release
                                    </button>
                                  </>
                                ) : null}
                              </>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="ml-4 shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Tab Bar */}
                  <div className="flex gap-0 border-b border-white/[0.06] px-5">
                    {([
                      { id: "details" as const, label: "Details" },
                      { id: "attachments" as const, label: "Attachments" },
                      { id: "comments" as const, label: "Comments" },
                    ]).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "relative px-4 py-3 text-sm font-medium transition-colors",
                          activeTab === tab.id
                            ? "text-white"
                            : "text-zinc-400 hover:text-zinc-200",
                        )}
                      >
                        {tab.label}
                        {activeTab === tab.id ? (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                        ) : null}
                      </button>
                    ))}
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto border-t border-white/[0.04] bg-gradient-to-b from-transparent to-black/[0.08] p-5">
                    {isDetailLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader className="h-6 w-6 animate-spin text-zinc-400" />
                      </div>
                    ) : detailError ? (
                      <div className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4">
                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                        <p className="text-sm text-rose-200">{detailError}</p>
                      </div>
                    ) : !selectedTicket ? (
                      <div className="py-12 text-center text-sm text-zinc-500">No ticket selected.</div>
                    ) : (
                      <>
                        {/* ── Details Tab ── */}
                        {activeTab === "details" ? (
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                            {/* ── Left Column: Description, Pipeline, History ── */}
                            <div className="space-y-6">
                              {/* Description Card */}
                              <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 transition-all duration-200 hover:border-white/15">
                                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                                <div className="relative">
                                  <div className="mb-2.5 flex items-center gap-2">
                                    <div className="flex h-4 w-4 items-center justify-center rounded-md bg-zinc-800">
                                      <svg className="h-2.5 w-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                                      </svg>
                                    </div>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Description</span>
                                  </div>
                                  <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-200">
                                    {selectedTicket.description}
                                  </p>
                                </div>
                              </div>

                              {/* Status Pipeline */}
                              <StatusPipeline
                                currentStatus={selectedTicket.status}
                                isStaff={selectedTicket.assignedToUserId === currentUserId}
                                onStatusClick={
                                  selectedTicket.assignedToUserId === currentUserId
                                    ? (s) => void handleStatusChange(selectedTicket.id, s)
                                    : undefined
                                }
                              />

                              {/* Status History - Timeline */}
                              {selectedTicket.statusHistory && selectedTicket.statusHistory.length > 0 ? (
                                <div>
                                  <div className="mb-3 flex items-center gap-2">
                                    <div className="flex h-4 w-4 items-center justify-center rounded-md bg-zinc-800">
                                      <svg className="h-2.5 w-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Status History</span>
                                  </div>
                                  <div className="relative">
                                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
                                    <div className="space-y-0">
                                      {selectedTicket.statusHistory.map((entry, idx) => {
                                        const isLatest = idx === selectedTicket.statusHistory!.length - 1;
                                        return (
                                          <div key={entry.id} className="relative flex gap-4 pb-5">
                                            <div className={cn(
                                              "relative z-10 mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                              isLatest
                                                ? "border-emerald-400 bg-emerald-500/20"
                                                : "border-zinc-600 bg-zinc-800",
                                            )}>
                                              {isLatest ? (
                                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-300" />
                                              ) : (
                                                <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                                              )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-baseline justify-between gap-3">
                                                <div className="flex items-center gap-1.5 text-sm">
                                                  <span className="text-zinc-500">{entry.fromStatus ? statusLabels[entry.fromStatus] : "New"}</span>
                                                  <span className="text-zinc-600">→</span>
                                                  <span className="font-semibold text-zinc-100">{statusLabels[entry.toStatus]}</span>
                                                </div>
                                                <span className="shrink-0 text-[11px] text-zinc-500">{formatDateTime(entry.changedAt)}</span>
                                              </div>
                                              <p className="mt-0.5 text-[11px] text-zinc-500">by {formatUserName(entry.changedByUser)}</p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            {/* ── Right Column: Known Issue + Metadata Sidebar ── */}
                            <div className="space-y-2.5">
                              {/* Known Issue Section */}
                              <div className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.03] to-transparent p-3.5 transition-all duration-200 hover:border-amber-500/30">
                                <div className="relative">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Bug className="h-3.5 w-3.5 text-amber-400" />
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-400/80">Known Issue</p>
                                    </div>
                                    {selectedTicket.knownIssueId ? (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await updateTicket(selectedTicket.id, { knownIssueId: null });
                                            push({ title: "Detached", description: "Known issue removed from ticket.", variant: "success" });
                                            await loadTicketDetail(selectedTicket.id);
                                          } catch (err) {
                                            push({ title: "Failed", description: isApiError(err) ? err.message : "Could not detach.", variant: "error" });
                                          }
                                        }}
                                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                                      >
                                        Detach
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSingleAttachTicketId(selectedTicket.id);
                                          setIsBatchAttachOpen(true);
                                        }}
                                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-amber-400 transition hover:bg-amber-500/10 hover:text-amber-300"
                                      >
                                        Attach
                                      </button>
                                    )}
                                  </div>
                                  {selectedTicket.knownIssueId ? (
                                    <div className="mt-3">
                                      <p className="text-sm text-zinc-400">This ticket is linked to a known issue.</p>
                                      <button
                                        type="button"
                                        onClick={() => void handleResolveAllUnderKnownIssue(selectedTicket.knownIssueId!)}
                                        disabled={isResolvingAll}
                                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/30 disabled:opacity-50"
                                      >
                                        {isResolvingAll ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                        Resolve all
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {/* Metadata Sidebar */}
                              <div>
                                <div className="mb-2.5 flex items-center gap-1.5">
                                  <div className="flex h-4 w-4 items-center justify-center rounded-md bg-zinc-800">
                                    <svg className="h-2.5 w-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Ticket Details</span>
                                </div>
                                <div className="space-y-1.5">
                                  <ModernMetadataItem icon="folder" label="Category" value={selectedTicket.category?.name || "—"} />
                                  <ModernMetadataItem icon="monitor" label="Asset" value={selectedTicket.asset?.deviceType || "—"} />
                                  <ModernMetadataItem icon="user" label="Requested by" value={formatUserName(selectedTicket.filedByUser)} />
                                  <ModernMetadataItem icon="building" label="Department" value={selectedTicket.department?.name || "—"} />
                                  <ModernMetadataItem icon="target" label="Assigned to" value={formatUserName(selectedTicket.assignedToUser)} />
                                  <ModernMetadataItem icon="calendar" label="Created" value={formatDateTime(selectedTicket.createdAt)} />
                                  <ModernMetadataItem icon="calendar" label="Updated" value={formatDateTime(selectedTicket.updatedAt)} />
                                  <ModernMetadataItem icon="check" label="Acknowledged" value={formatDateTime(selectedTicket.acknowledgedAt)} />
                                  <ModernMetadataItem icon="clock" label="SLA Acknowledge" value={formatDateTime(selectedTicket.slaAckDeadline)} />
                                  <ModernMetadataItem icon="clock" label="SLA Resolution" value={formatDateTime(selectedTicket.slaResolutionDeadline)} />
                                  <ModernMetadataItem icon="alert" label="SLA Ack Breached" value={selectedTicket.slaAckBreached ? "Yes" : "No"} />
                                  <ModernMetadataItem icon="alert" label="SLA Resolution Breached" value={selectedTicket.slaResolutionBreached ? "Yes" : "No"} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {/* ── Attachments Tab ── */}
                        {activeTab === "attachments" ? (
                          <div className="space-y-5">
                            <div className="space-y-2">
                              <Label htmlFor="ticket-attachments">Upload files</Label>
                              <input
                                id="ticket-attachments"
                                ref={ticketFileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPTED_FILE_TYPES}
                                onChange={(event) => void handleTicketFilesChange(event.target.files)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-white/20"
                              />
                              <p className="text-xs text-zinc-500">
                                Max 10MB per file. Images, PDF, docs, spreadsheets, text, and archives supported.
                              </p>
                            </div>

                            {uploadQueue.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Uploads</p>
                                {uploadQueue.map((item) => (                                  <div key={item.id}
                                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300"
                                  >
                                    <span className="truncate">{item.fileName}</span>
                                    <span className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] uppercase",
                                      item.status === "completed"
                                        ? "bg-emerald-500/10 text-emerald-200"
                                        : item.status === "failed"
                                          ? "bg-rose-500/10 text-rose-200"
                                          : "bg-white/10 text-zinc-200",
                                    )}>
                                      {item.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {ticketAttachments.length === 0 ? (
                              <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-500">
                                No attachments yet.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                                  {ticketAttachments.length} attachment{ticketAttachments.length !== 1 ? "s" : ""}
                                </p>
                                {ticketAttachments.map((attachment) => (
                                  <div key={attachment.id} className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
                                    {attachment.fileType?.startsWith("image/") ? (
                                      <div className="border-b border-white/10 bg-white/[0.02] p-3">
                                        <AttachmentImage attachment={attachment} />
                                      </div>
                                    ) : null}
                                    <div className="flex items-center justify-between px-4 py-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm text-zinc-100">{attachment.fileName}</p>
                                        <p className="text-xs text-zinc-500">
                                          {formatFileSize(attachment.fileSizeBytes)} · {formatDateTime(attachment.createdAt)}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadAttachment(attachment)}
                                          className="rounded-full border border-white/10 p-2 text-zinc-300 transition hover:border-white/30 hover:text-white"
                                        >
                                          <Download className="h-4 w-4" />
                                        </button>
                                        {attachment.uploadedByUserId === currentUserId ? (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteAttachment(attachment)}
                                            className="rounded-full border border-rose-500/30 p-2 text-rose-300 transition hover:border-rose-400/60 hover:text-rose-100"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* ── Comments Tab ── */}
                        {activeTab === "comments" ? (
                          <div className="space-y-5">
                            {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                              <div className="space-y-3">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                                  {selectedTicket.comments.length} comment{selectedTicket.comments.length !== 1 ? "s" : ""}
                                </p>
                                {selectedTicket.comments.map((comment) => (
                                  <div key={comment.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                                    <div className="flex items-center justify-between text-xs text-zinc-500">
                                      <span className="font-medium text-zinc-300">
                                        {formatUserName(comment.authorUser)}
                                      </span>
                                      <span>{formatDateTime(comment.createdAt)}</span>
                                    </div>
                                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-200">
                                      {comment.body}
                                    </p>
                                    {comment.attachments && comment.attachments.length > 0 ? (
                                      <div className="mt-3 space-y-2">
                                        {comment.attachments.map((attachment) => (
                                          <div key={attachment.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                                            {attachment.fileType?.startsWith("image/") ? (
                                              <div className="border-b border-white/10 bg-white/[0.02] p-2">
                                                <AttachmentImage attachment={attachment} />
                                              </div>
                                            ) : null}
                                            <div className="flex items-center justify-between px-3 py-2">
                                              <div className="min-w-0">
                                                <p className="truncate text-xs text-zinc-100">{attachment.fileName}</p>
                                                <p className="text-[10px] text-zinc-500">
                                                  {formatFileSize(attachment.fileSizeBytes)} · {formatDateTime(attachment.createdAt)}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => handleDownloadAttachment(attachment)}
                                                  className="rounded-full border border-white/10 p-1.5 text-zinc-300 transition hover:border-white/30 hover:text-white"
                                                >
                                                  <Download className="h-3.5 w-3.5" />
                                                </button>
                                                {attachment.uploadedByUserId === currentUserId ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteAttachment(attachment)}
                                                    className="rounded-full border border-rose-500/30 p-1.5 text-rose-300 transition hover:border-rose-400/60 hover:text-rose-100"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </button>
                                                ) : null}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-500">
                                No comments yet.
                              </div>
                            )}

                            {/* Add Comment Form */}
                            <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
                              <Label>Add a comment</Label>
                              <Textarea
                                value={commentBody}
                                onChange={(event) => setCommentBody(event.target.value)}
                                placeholder="Share an update on this ticket…"
                                rows={3}
                              />
                              <input
                                ref={commentFileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPTED_FILE_TYPES}
                                onChange={(event) => setCommentFiles(event.target.files)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-white/20"
                              />
                              {commentError ? (
                                <p className="text-sm text-rose-400">{commentError}</p>
                              ) : null}
                              <div className="flex justify-end">
                                <Button
                                  className="h-10"
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
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* ── Batch Attach Modal ── */}
      <BatchAttachModal
        open={isBatchAttachOpen}
        onClose={() => {
          setIsBatchAttachOpen(false);
          setSingleAttachTicketId(null);
        }}
        onAttach={handleBatchAttach}
        selectedCount={singleAttachTicketId ? 1 : selectedIds.size}
      />
    </section>
  );
}

// ── Modern Metadata Item ──

const metadataIconMap: Record<string, React.ReactNode> = {
  folder: <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  monitor: <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  user: <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  building: <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  target: <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  calendar: <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  check: <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  clock: <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  alert: <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>,
};

function ModernMetadataItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  const isBreached = value === "Yes" && (label.includes("Breached"));
  return (
    <div className="group relative overflow-hidden rounded-lg border border-white/[0.05] bg-gradient-to-br from-white/[0.02] to-transparent px-3 py-2 transition-all duration-200 hover:border-white/[0.1] hover:from-white/[0.04]">
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
          isBreached ? "bg-rose-500/15 text-rose-400" : "bg-zinc-800/60 text-zinc-500 group-hover:text-zinc-400",
        )}>
          {metadataIconMap[icon]}
        </div>
        <div className="min-w-0">
          <p className={cn(
            "text-[11px] font-medium uppercase tracking-[0.12em]",
            isBreached ? "text-rose-400" : "text-zinc-500",
          )}>{label}</p>
          <p className={cn(
            "truncate text-xs font-medium",
            value === "—" ? "text-zinc-500" : isBreached ? "text-rose-200" : "text-zinc-100",
          )}>{value}</p>
        </div>
      </div>
    </div>
  );
}
