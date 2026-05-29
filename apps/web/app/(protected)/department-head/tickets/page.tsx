"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Inbox,
  Loader,
  RefreshCw,
  Search,
  TicketCheck,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiError } from "@/lib/api/client";
import {
  fetchDepartmentHeadTickets,
  fetchDepartmentHeadTicketById,
} from "@/lib/api/department-head";
import type {
  PaginationMeta,
  Ticket as TicketRecord,
  TicketPriority,
  TicketStatus,
} from "@/lib/types/tickets";
import { cn } from "@/lib/utils";

// ── Constants ──

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

const formatUserName = (
  user?: { firstName?: string; lastName?: string; fullName?: string; email?: string } | null,
) => {
  if (!user) return "—";
  const name = user.fullName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email || "—";
};

// ── SlaTimer ──

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

// ── Main Page Component ──

export default function DepartmentHeadTicketsPage() {
  const searchParams = useSearchParams();

  // ── Data State ──
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  // ── UI State ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const handledUrlRef = useRef(false);

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
      const response = await fetchDepartmentHeadTickets({
        page: pageOverride ?? currentPage,
        limit: PAGE_SIZE,
        ...(filterStatus && filterStatus !== "all" ? { status: filterStatus } : {}),
        ...(filterPriority && filterPriority !== "all" ? { priority: filterPriority } : {}),
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
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await fetchDepartmentHeadTicketById(ticketId);
      setSelectedTicket(detail);
    } catch (err) {
      setDetailError(isApiError(err) ? err.message : "Failed to load ticket.");
      setSelectedTicket(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

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

  // ── Handlers ──

  const handleRefresh = async () => {
    setCurrentPage(1);
    await loadTickets(1);
  };

  const handleRowClick = (ticketId: string) => {
    setSelectedTicket(null);
    setIsDetailLoading(true);
    setIsModalOpen(true);
    void loadTicketDetail(ticketId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    setDetailError(null);
    handledUrlRef.current = false;
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
            <h1 className="text-lg font-semibold text-white">Department Tickets</h1>
            <p className="text-xs text-zinc-500">View tickets in your department</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-zinc-200 transition hover:bg-white/15"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
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
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">Priority</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">Progression</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">SLA</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">Assignee</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredTickets.map((ticket, index) => {
                  const currentIdx = STATUS_ORDER.indexOf(ticket.status as typeof STATUS_ORDER[number]);
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
                          <p className="truncate text-sm font-medium text-zinc-100">{ticket.title}</p>
                          <p className="truncate text-xs text-zinc-500">
                            {(ticket.filedBy ?? ticket.filedByUser) ? formatUserName(ticket.filedBy ?? ticket.filedByUser) : "—"}
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                          priorityStyles[ticket.priority],
                        )}>
                          {priorityLabels[ticket.priority]}
                        </span>
                      </td>
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-400">
                        {ticket.department?.name || "—"}
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
          onPageChange={(page) => {
            setCurrentPage(page);
          }}
        />
      ) : null}

      {/* ── Ticket Detail Modal ── */}
      {isModalOpen && typeof window !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-xl"
              onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
            >
              <div className="mx-4 my-6 w-full max-w-3xl sm:mx-auto">
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
                            <span>Department: {selectedTicket.department?.name || "—"}</span>
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
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                        {/* Left Column: Description & Pipeline */}
                        <div className="space-y-6">
                          {/* Description */}
                          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4">
                            <div className="mb-2.5 flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Description</span>
                            </div>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-200">
                              {selectedTicket.description}
                            </p>
                          </div>

                          {/* Status Pipeline */}
                          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4">
                            <div className="mb-4 flex items-center gap-2">
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
                                      {statusLabels[status]}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Status History */}
                          {selectedTicket.statusHistory && selectedTicket.statusHistory.length > 0 ? (
                            <div>
                              <div className="mb-3 flex items-center gap-2">
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
                                            <svg className="h-2.5 w-2.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
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

                        {/* Right Column: Metadata */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Ticket Details</span>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <MetadataItem label="Category" value={selectedTicket.category?.name || "—"} />
                            <MetadataItem label="Asset" value={selectedTicket.asset?.deviceType || "—"} />
                            <MetadataItem label="Requested by" value={formatUserName(selectedTicket.filedBy ?? selectedTicket.filedByUser)} />
                            <MetadataItem label="Department" value={selectedTicket.department?.name || "—"} />
                            <MetadataItem label="Assigned to" value={formatUserName(selectedTicket.assignedTo ?? selectedTicket.assignedToUser)} />
                            <MetadataItem label="Created" value={formatDateTime(selectedTicket.createdAt)} />
                            <MetadataItem label="Updated" value={formatDateTime(selectedTicket.updatedAt)} />
                            <MetadataItem label="Acknowledged" value={formatDateTime(selectedTicket.acknowledgedAt)} />
                            <MetadataItem label="SLA Ack" value={formatDateTime(selectedTicket.slaAckDeadline)} />
                            <MetadataItem label="SLA Resolution" value={formatDateTime(selectedTicket.slaResolutionDeadline)} />
                            <MetadataItem label="SLA Ack Breached" value={selectedTicket.slaAckBreached ? "Yes" : "No"} breached={selectedTicket.slaAckBreached} />
                            <MetadataItem label="SLA Res. Breached" value={selectedTicket.slaResolutionBreached ? "Yes" : "No"} breached={selectedTicket.slaResolutionBreached} />
                          </div>
                        </div>
                      </div>
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

// ── Metadata Item ──

function MetadataItem({ label, value, breached }: { label: string; value: string; breached?: boolean | null }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</span>
      <span className={cn(
        "truncate text-xs font-medium ml-2",
        breached ? "text-rose-300" : value === "—" ? "text-zinc-500" : "text-zinc-100",
      )}>{value}</span>
    </div>
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
  const pageNumbers: (number | "ellipsis")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== "ellipsis") {
      pageNumbers.push("ellipsis");
    }
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
      <span className="text-xs text-zinc-500">
        Showing {startItem}–{endItem} of {totalItems} ticket{totalItems !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageNumbers.map((page, idx) =>
          page === "ellipsis" ? (
            <span key={"e-" + idx} className="flex h-8 w-6 items-center justify-center text-xs text-zinc-600">…</span>
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
