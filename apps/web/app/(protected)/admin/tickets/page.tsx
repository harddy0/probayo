"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileUp,
  Inbox,
  Loader,
  Plus,
  RefreshCw,
  Search,
  TicketCheck,
  Trash2,
  UserPlus,
  X,
  ZoomIn,
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
  assignTicket,
  deleteAttachment,
  downloadAttachment,
  fetchAttachmentJobStatus,
  fetchTicketById,
  fetchTickets,
  unassignTicket,
  updateTicket,
  uploadCommentAttachment,
  uploadTicketAttachment,
} from "@/lib/api/tickets";
import { bulkAttachKnownIssue, updateKnownIssueStatus } from "@/lib/api/known-issues";
import type {
  PaginationMeta,
  Ticket as TicketRecord,
  TicketAttachment,
  TicketPriority,
  TicketStatus,
} from "@/lib/types/tickets";
import type { KnownIssue } from "@/lib/types/known-issues";
import { fetchAllUsers, type SimpleUser } from "@/lib/api/users";
import CreateKnownIssueModal from "@/components/known-issues/create-known-issue-modal";
import BatchAttachModal from "@/components/it-staff/batch-attach-modal";
import ImageLightbox from "@/components/tickets/image-lightbox";
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
const PAGE_SIZE = 10;

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

type UploadStatus = "uploading" | "processing" | "completed" | "failed";

type UploadItem = {
  id: string;
  fileName: string;
  status: UploadStatus;
  scope: "ticket" | "comment";
  error?: string;
};

type TabId = "details" | "attachments" | "comments";

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
  user?: { firstName?: string; lastName?: string; fullName?: string; email?: string } | null,
) => {
  if (!user) return "—";
  const name = user.fullName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
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

function AttachmentImage({ attachment, onView }: { attachment: TicketAttachment; onView?: (src: string, name: string) => void }) {
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
      <button
        type="button"
        className="group relative block w-full overflow-hidden rounded-lg"
        onClick={() => onView?.(url, attachment.fileName)}
      >
        <img
          src={url}
          alt={attachment.fileName}
          className="aspect-[4/3] w-full object-cover transition duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition duration-200 group-hover:bg-black/40">
          <span className="scale-0 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition duration-200 group-hover:scale-100">
            <ZoomIn className="h-4 w-4" />
          </span>
        </div>
      </button>
    );
  }
  return null;
}

// ── Assign User Modal ──

function AssignUserModal({
  open,
  onClose,
  onAssign,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onAssign: (userId: string) => void;
  loading: boolean;
}) {
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedId(null);
    let mounted = true;
    fetchAllUsers()
      .then((data) => {
        if (mounted) setUsers(data.filter((u) => u.isActive));
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  const itStaffUsers = useMemo(() => {
    return users.filter((u) => u.role === "ItStaff");
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itStaffUsers;
    return itStaffUsers.filter((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      return name.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [itStaffUsers, search]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold text-white">Assign ticket</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Choose an IT staff member</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IT staff by name or email…"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/20"
              autoFocus
            />
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                {search ? "No matching IT staff found." : "No IT staff users available."}
              </p>
            ) : (
              filtered.map((user) => {
                const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
                const isSelected = selectedId === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : user.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      isSelected
                        ? "bg-white/10 text-white"
                        : "text-zinc-300 hover:bg-white/5",
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-xs font-semibold text-sky-300">
                      {(user.firstName?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {name || "Unnamed"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{user.email}</p>
                    </div>
                    {isSelected ? (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/10 px-5 py-3.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-9 rounded-lg border border-white/10 px-3.5 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            onClick={() => selectedId && onAssign(selectedId)}
            disabled={!selectedId || loading}
            className="h-9"
          >
            {loading ? (
              <Loader className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Assign
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Main Page Component ──

export default function AdminTicketsPage() {
  const { push } = useToast();
  const session = getAuthSession();
  const currentUserId = session?.identity?.userId ?? null;
  const searchParams = useSearchParams();

  // ── Data State ──
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ── UI State ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // ── Assignment State ──
  const [assignTicketId, setAssignTicketId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // ── Known Issue State ──
  const [createKiTicketId, setCreateKiTicketId] = useState<string | null>(null);
  const [singleAttachTicketId, setSingleAttachTicketId] = useState<string | null>(null);
  const [isBatchAttachOpen, setIsBatchAttachOpen] = useState(false);
  const [isResolvingAll, setIsResolvingAll] = useState(false);

  // ── Lightbox State ──
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxFileName, setLightboxFileName] = useState<string | undefined>();

  const handleResolveAllUnderKnownIssue = async (knownIssueId: string) => {
    setIsResolvingAll(true);
    try {
      await updateKnownIssueStatus(knownIssueId, { status: "Resolved" });
      push({ title: "Resolved", description: "All tickets under this known issue resolved.", variant: "success" });
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

  const handleCreatedKnownIssueAttach = async (issue: KnownIssue, ticketId: string) => {
    try {
      const updated = await updateTicket(ticketId, {
        knownIssueId: issue.id,
      });
      push({ title: "Known issue attached", description: `${issue.title} linked to this ticket.`, variant: "success" });
      setSelectedTicket(updated);
      await loadTickets();
    } catch (err) {
      push({ title: "Failed", description: isApiError(err) ? err.message : "Could not attach known issue.", variant: "error" });
    }
  };

  const handleBatchAttach = async (knownIssueId: string) => {
    const ids = singleAttachTicketId ? [singleAttachTicketId] : [];
    await bulkAttachKnownIssue({ ticketIds: ids, knownIssueId });
    push({ title: "Attached", description: `${ids.length} ticket${ids.length !== 1 ? "s" : ""} linked to known issue.`, variant: "success" });
    setSingleAttachTicketId(null);
    if (selectedTicket) await loadTicketDetail(selectedTicket.id);
    await loadTickets();
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

  // Auto-focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

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
  const loadTickets = useCallback(async (pageOverride?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchTickets({
        page: pageOverride ?? currentPage,
        pageSize: PAGE_SIZE,
        ...(filterStatus && filterStatus !== "all" ? { status: filterStatus as TicketStatus } : {}),
        ...(filterPriority && filterPriority !== "all" ? { priority: filterPriority as TicketPriority } : {}),
      });
      setTickets(response.data ?? []);
      if (response.meta) setPaginationMeta(response.meta);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load tickets.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filterStatus, filterPriority]);

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
      const timer = window.setTimeout(() => {
        handleRowClick(ticketIdFromUrl);
      }, 300);
      return () => window.clearTimeout(timer);
    }
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
    setCurrentPage(1);
    await loadTickets(1);
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

  // ── Assignment Handler ──

  const handleAssign = async (userId: string) => {
    if (!assignTicketId) return;
    setIsAssigning(true);
    try {
      await assignTicket(assignTicketId, userId);
      // When Admin assigns on an open ticket, the backend auto-acknowledges it
      push({ title: "Ticket assigned", description: "Ticket assigned to IT staff. Open tickets are auto-acknowledged.", variant: "success" });
      setAssignTicketId(null);
      if (selectedTicket?.id === assignTicketId) {
        await loadTicketDetail(assignTicketId);
      }
      await loadTickets();
    } catch (err) {
      push({ title: "Assignment failed", description: isApiError(err) ? err.message : "Could not assign ticket.", variant: "error" });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (ticketId: string) => {
    try {
      await unassignTicket(ticketId);
      push({ title: "Ticket unassigned", description: "The ticket has been unassigned.", variant: "success" });
      if (selectedTicket?.id === ticketId) {
        await loadTicketDetail(ticketId);
      }
      await loadTickets();
    } catch (err) {
      push({ title: "Failed", description: isApiError(err) ? err.message : "Could not unassign ticket.", variant: "error" });
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
            <p className="text-xs text-zinc-500">View all tickets and assign to IT staff</p>
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
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
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
        <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); setCurrentPage(1); }}>
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
            <p className="text-sm text-zinc-400">No tickets found.</p>
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
                  const currentIdx = STATUS_ORDER.indexOf(ticket.status as typeof STATUS_ORDER[number]);
                  const isUnassigned = !ticket.assignedToUserId && !ticket.assignedTo?.id;

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => handleRowClick(ticket.id)}
                      className="cursor-pointer transition-colors duration-150 hover:bg-white/5"
                    >
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="max-w-[200px] px-3 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-zinc-100">{ticket.title}</p>
                          </div>
                          <p className="truncate text-xs text-zinc-500">
                            {(ticket.filedBy ?? ticket.filedByUser) ? formatUserName(ticket.filedBy ?? ticket.filedByUser) : "—"}
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
                        {formatUserName(ticket.assignedTo ?? ticket.assignedToUser)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {ticket.status === "Closed" ? (
                            <span className="text-[11px] text-zinc-600">Closed</span>
                          ) : isUnassigned ? (
                            <button
                              type="button"
                              onClick={() => setAssignTicketId(ticket.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/20"
                            >
                              <UserPlus className="h-3 w-3" />
                              Assign
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnassign(ticket.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:border-rose-500/30 hover:text-rose-300"
                            >
                              <X className="h-3 w-3" />
                              Unassign
                            </button>
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

      {/* ── Pagination ── */}
      {paginationMeta && !isLoading ? (
        <PaginationBar
          currentPage={currentPage}
          totalPages={paginationMeta.totalPages}
          totalItems={paginationMeta.totalItems}
          pageSize={paginationMeta.itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
        />
      ) : null}

      {/* ── Assignment Modal ── */}
      <AssignUserModal
        open={assignTicketId !== null}
        onClose={() => setAssignTicketId(null)}
        onAssign={handleAssign}
        loading={isAssigning}
      />

      {/* ── Create Known Issue Modal ── */}
      <CreateKnownIssueModal
        open={createKiTicketId !== null}
        onClose={() => setCreateKiTicketId(null)}
        onCreated={(issue) => {
          const ticketId = createKiTicketId;
          setCreateKiTicketId(null);
          if (ticketId) {
            void handleCreatedKnownIssueAttach(issue, ticketId);
          }
        }}
        initialTitle={selectedTicket?.title ?? ""}
        initialDescription={selectedTicket?.description ?? ""}
      />

      {/* ── Batch Attach Modal ── */}
      <BatchAttachModal
        open={isBatchAttachOpen}
        onClose={() => {
          setIsBatchAttachOpen(false);
          setSingleAttachTicketId(null);
        }}
        onAttach={handleBatchAttach}
        selectedCount={singleAttachTicketId ? 1 : 0}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        src={lightboxSrc}
        fileName={lightboxFileName}
        onClose={() => {
          setLightboxSrc(null);
          setLightboxFileName(undefined);
        }}
      />

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
                            {(selectedTicket.assignedTo ?? selectedTicket.assignedToUser) ? (
                              <span>
                                Assigned to: {formatUserName(selectedTicket.assignedTo ?? selectedTicket.assignedToUser)}
                              </span>
                            ) : (
                              <span className="text-amber-400">Unassigned</span>
                            )}
                          </div>

                          {/* Admin Action Bar */}
                          <div className="mt-3 flex items-center gap-2">
                            {selectedTicket.status === "Closed" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ticket closed
                              </span>
                            ) : (
                              <>
                                {!selectedTicket.assignedToUserId && !selectedTicket.assignedTo?.id ? (
                                  <Button
                                    className="h-8 text-xs"
                                    onClick={() => setAssignTicketId(selectedTicket.id)}
                                  >
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                    Assign to IT staff
                                  </Button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUnassign(selectedTicket.id)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Unassign
                                  </button>
                                )}
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

                              {/* Status Pipeline (view-only) */}
                              <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 transition-all duration-200 hover:border-white/15">
                                <div className="relative">
                                  <div className="mb-4 flex items-center gap-2">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800">
                                      <svg className="h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Status Pipeline</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {STATUS_ORDER.map((status, i) => {
                                      const currentIdx = STATUS_ORDER.indexOf(selectedTicket.status as typeof STATUS_ORDER[number]);
                                      const isPast = i < currentIdx;
                                      const isCurrent = i === currentIdx;
                                      return (
                                        <div key={status} className="flex items-center gap-1.5">
                                          {i > 0 ? (
                                            <div className={cn(
                                              "h-px w-3",
                                              i <= currentIdx ? "bg-gradient-to-r from-white/30 to-white/40" : "bg-white/10",
                                            )} />
                                          ) : null}
                                          <div className={cn(
                                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200",
                                            isPast
                                              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                              : isCurrent
                                                ? "border border-white/30 bg-white/10 text-white shadow-[0_0_12px_-4px_rgba(255,255,255,0.3)]"
                                                : "border border-white/[0.06] bg-white/[0.02] text-zinc-500",
                                          )}>
                                            {isPast ? (
                                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-300" />
                                            ) : isCurrent ? (
                                              <ChevronDown className="h-2.5 w-2.5" />
                                            ) : null}
                                            {statusLabels[status]}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

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
                                      <div className="flex items-center gap-1.5">
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
                                        <button
                                          type="button"
                                          onClick={() => setCreateKiTicketId(selectedTicket.id)}
                                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"
                                        >
                                          <Plus className="mr-1 inline h-3 w-3" />
                                          Create &amp; attach
                                        </button>
                                      </div>
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
                              <div className="flex items-center gap-1.5">
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
                                <ModernMetadataItem icon="user" label="Requested by" value={formatUserName(selectedTicket.filedBy ?? selectedTicket.filedByUser)} />
                                <ModernMetadataItem icon="building" label="Department" value={selectedTicket.department?.name || "—"} />
                                <ModernMetadataItem icon="target" label="Assigned to" value={formatUserName(selectedTicket.assignedTo ?? selectedTicket.assignedToUser)} />
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
                        ) : null}

                        {/* ── Attachments Tab ── */}
                        {activeTab === "attachments" ? (
                          <div className="space-y-5">
                            {/* Upload Input */}
                            <div className="group relative overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5 transition-all hover:border-white/30 hover:bg-white/[0.04]">
                              <input
                                id="ticket-attachments"
                                ref={ticketFileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPTED_FILE_TYPES}
                                onChange={(event) =>
                                  void handleTicketFilesChange(event.target.files)
                                }
                                className="absolute inset-0 cursor-pointer opacity-0"
                              />
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                  <FileUp className="h-5 w-5 text-zinc-400" />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-medium text-zinc-300">Drop files or click to upload</p>
                                  <p className="mt-0.5 text-xs text-zinc-500">
                                    Max 10MB · Images, PDF, docs, spreadsheets &amp; text
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Upload Queue */}
                            {uploadQueue.length > 0 ? (
                              <div className="space-y-1.5">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                                  Uploads
                                </p>
                                <div className="space-y-1.5">
                                  {uploadQueue.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300"
                                    >
                                      <span className="truncate">{item.fileName}</span>
                                      <span
                                        className={cn(
                                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase",
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
                              </div>
                            ) : null}

                            {/* Attachment Grid */}
                            {ticketAttachments.length === 0 ? (
                              <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-500">
                                No attachments yet.
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-1 w-1 rounded-full bg-zinc-500" />
                                  <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                                    {ticketAttachments.filter((a) => a.fileType?.startsWith("image/")).length} image{ticketAttachments.filter((a) => a.fileType?.startsWith("image/")).length !== 1 ? "s" : ""}
                                    {ticketAttachments.filter((a) => !a.fileType?.startsWith("image/")).length > 0 ? (
                                      <> &middot; {ticketAttachments.filter((a) => !a.fileType?.startsWith("image/")).length} file{ticketAttachments.filter((a) => !a.fileType?.startsWith("image/")).length !== 1 ? "s" : ""}</>
                                    ) : null}
                                  </span>
                                </div>

                                {/* Image Grid */}
                                {ticketAttachments.filter((a) => a.fileType?.startsWith("image/")).length > 0 ? (
                                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                    {ticketAttachments
                                      .filter((a) => a.fileType?.startsWith("image/"))
                                      .map((attachment) => (
                                        <div key={attachment.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                          <AttachmentImage
                                            attachment={attachment}
                                            onView={(src, name) => {
                                              setLightboxSrc(src);
                                              setLightboxFileName(name);
                                            }}
                                          />
                                          <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            {attachment.uploadedByUserId === currentUserId ? (
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteAttachment(attachment)}
                                                className="rounded-lg bg-black/60 p-1.5 text-rose-300 backdrop-blur-sm transition hover:bg-black/80 hover:text-rose-100"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            ) : null}
                                          </div>
                                          <div className="border-t border-white/10 px-2 py-1.5">
                                            <p className="truncate text-[10px] text-zinc-400">{attachment.fileName}</p>
                                            <p className="truncate text-[9px] text-zinc-600">{formatFileSize(attachment.fileSizeBytes)}</p>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                ) : null}

                                {/* Non-image Files */}
                                {ticketAttachments.filter((a) => !a.fileType?.startsWith("image/")).length > 0 ? (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">Files</p>
                                    {ticketAttachments
                                      .filter((a) => !a.fileType?.startsWith("image/"))
                                      .map((attachment) => (
                                        <div
                                          key={attachment.id}
                                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/20"
                                        >
                                          <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                              <FileUp className="h-4 w-4 text-zinc-400" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="truncate text-sm text-zinc-100">{attachment.fileName}</p>
                                              <p className="text-xs text-zinc-500">
                                                {formatFileSize(attachment.fileSizeBytes)} &middot; {formatDateTime(attachment.createdAt)}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleDownloadAttachment(attachment)}
                                              className="rounded-lg border border-white/10 p-2 text-zinc-300 transition hover:border-white/30 hover:text-white"
                                            >
                                              <Download className="h-4 w-4" />
                                            </button>
                                            {attachment.uploadedByUserId === currentUserId ? (
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteAttachment(attachment)}
                                                className="rounded-lg border border-rose-500/30 p-2 text-rose-300 transition hover:border-rose-400/60 hover:text-rose-100"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            ) : null}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* ── Comments Tab ── */}
                        {activeTab === "comments" ? (
                          <div className="space-y-5">
                            {/* Comment List */}
                            {selectedTicket.comments &&
                            selectedTicket.comments.length > 0 ? (
                              <div className="space-y-3">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                                  {selectedTicket.comments.length} comment
                                  {selectedTicket.comments.length !== 1
                                    ? "s"
                                    : ""}
                                </p>
                                {selectedTicket.comments.map((comment) => {
                                  const isCurrentUser = comment.authorUserId === currentUserId;
                                  return (
                                    <div
                                      key={comment.id}
                                      className={cn(
                                        "group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:border-white/15",
                                        isCurrentUser
                                          ? "border-sky-500/20 bg-gradient-to-br from-sky-500/[0.04] to-transparent"
                                          : "border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01]",
                                      )}
                                    >
                                      {/* Author Row */}
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                          <div className={cn(
                                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase",
                                            isCurrentUser
                                              ? "bg-sky-500/20 text-sky-300"
                                              : "bg-zinc-700/50 text-zinc-400",
                                          )}>
                                            {(comment.authorUser?.firstName?.[0] ?? comment.authorUser?.email?.[0] ?? "?")}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-zinc-100">
                                              {formatUserName(comment.authorUser)}
                                            </p>
                                            <p className="text-[11px] text-zinc-500">
                                              {formatDateTime(comment.createdAt)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Comment Body */}
                                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-200">
                                        {comment.body}
                                      </p>

                                      {/* Comment Attachments */}
                                      {comment.attachments &&
                                      comment.attachments.length > 0 ? (
                                        <div className="mt-3 space-y-2">
                                          {comment.attachments.map(
                                            (attachment) => (
                                              <div
                                                key={attachment.id}
                                                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                                              >
                                                {attachment.fileType?.startsWith(
                                                  "image/",
                                                ) ? (
                                                  <div className="border-b border-white/10 bg-white/[0.02] p-2">
                                                    <AttachmentImage
                                                      attachment={attachment}
                                                      onView={(src, name) => {
                                                        setLightboxSrc(src);
                                                        setLightboxFileName(name);
                                                      }}
                                                    />
                                                  </div>
                                                ) : null}
                                                <div className="flex items-center justify-between px-3 py-2">
                                                  <div className="min-w-0">
                                                    <p className="truncate text-xs text-zinc-100">
                                                      {attachment.fileName}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-500">
                                                      {formatFileSize(
                                                        attachment.fileSizeBytes,
                                                      )}{" "}
                                                      {"\u00B7"}{" "}
                                                      {formatDateTime(
                                                        attachment.createdAt,
                                                      )}
                                                    </p>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleDownloadAttachment(
                                                          attachment,
                                                        )
                                                      }
                                                      className="rounded-full border border-white/10 p-1.5 text-zinc-300 transition hover:border-white/30 hover:text-white"
                                                    >
                                                      <Download className="h-3.5 w-3.5" />
                                                    </button>
                                                    {attachment.uploadedByUserId ===
                                                    currentUserId ? (
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          handleDeleteAttachment(
                                                            attachment,
                                                          )
                                                        }
                                                        className="rounded-full border border-rose-500/30 p-1.5 text-rose-300 transition hover:border-rose-400/60 hover:text-rose-100"
                                                      >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                      </button>
                                                    ) : null}
                                                  </div>
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-500">
                                No comments yet.
                              </div>
                            )}

                            {/* Add Comment Form */}
                            <div className="space-y-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
                              <div className="flex items-center gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800">
                                  <svg className="h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                </div>
                                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Add a comment</span>
                              </div>
                              <Textarea
                                value={commentBody}
                                onChange={(event) =>
                                  setCommentBody(event.target.value)
                                }
                                placeholder="Share an update on this ticket…"
                                rows={3}
                                className="rounded-lg text-sm"
                              />
                              <input
                                ref={commentFileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPTED_FILE_TYPES}
                                onChange={(event) =>
                                  setCommentFiles(event.target.files)
                                }
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-white/20"
                              />
                              {commentError ? (
                                <p className="text-sm text-rose-400">
                                  {commentError}
                                </p>
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
    </section>
  );
}


// ── Pagination Bar ──

function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  // Generate page numbers with ellipsis
  const pageNumbers: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== 'ellipsis') {
      pageNumbers.push('ellipsis');
    }
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
      <span className="text-xs text-zinc-500">
        Showing {startItem}–{endItem} of {totalItems} ticket{totalItems !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page Numbers */}
        {pageNumbers.map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={'e-' + idx} className="flex h-8 w-6 items-center justify-center text-xs text-zinc-600">
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-medium transition",
                page === currentPage
                  ? "bg-white/15 text-white"
                  : "border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white",
              )}
            >
              {page}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
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
