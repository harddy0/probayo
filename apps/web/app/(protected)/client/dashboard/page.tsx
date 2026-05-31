"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  LifeBuoy,
  Loader,
  Plus,
  RefreshCw,
  Ticket,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TicketCreateModal from "@/components/tickets/ticket-create-modal";
import { isApiError } from "@/lib/api/client";
import {
  fetchActiveKnownIssues,
  fetchTicketCategories,
  fetchTickets,
} from "@/lib/api/tickets";
import { fetchAllAssets } from "@/lib/api/assets";
import type { Asset } from "@/lib/types/assets";
import type {
  KnownIssue,
  Ticket as TicketRecord,
  TicketCategory,
} from "@/lib/types/tickets";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  Open: "Open",
  Acknowledged: "Acknowledged",
  PendingUser: "Pending user",
  InProgress: "In progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

const priorityLabels: Record<string, string> = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Critical: "Critical",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatUserName = (
  user?: { firstName?: string; lastName?: string } | null,
) => {
  if (!user) return "-";
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || "-";
};

export default function ClientDashboardPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [knownIssues, setKnownIssues] = useState<KnownIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ticketData, categoryData, assetData, issueData] = await Promise.all([
        fetchTickets(),
        fetchTicketCategories(),
        fetchAllAssets(),
        fetchActiveKnownIssues(),
      ]);
      setTickets(ticketData.data ?? []);
      setCategories(categoryData);
      setAssets(assetData);
      setKnownIssues(issueData);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "Open").length;
    const inProgress = tickets.filter(
      (t) => t.status === "InProgress" || t.status === "Acknowledged",
    ).length;
    const resolved = tickets.filter(
      (t) => t.status === "Resolved" || t.status === "Closed",
    ).length;
    const pendingUser = tickets.filter((t) => t.status === "PendingUser").length;
    return { total, open, inProgress, resolved, pendingUser };
  }, [tickets]);

  const recentTickets = useMemo(() => {
    return [...tickets]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [tickets]);

  const handleTicketCreated = (ticket: TicketRecord) => {
    setTickets((current) => [ticket, ...current]);
  };

  return (
    <section className="flex h-full flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <LifeBuoy className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-zinc-500">
              Your support overview at a glance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
          <Button className="h-9" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New ticket
          </Button>
        </div>
      </div>

      {/* ── Error ── */}
      {error ? (
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Loader className="h-5 w-5 animate-spin" />
            Loading dashboard data…
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Total
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Open
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-2xl font-semibold text-emerald-300">
                  {stats.open}
                </p>
                {stats.open > 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    Active
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                In Progress
              </p>
              <p className="mt-1 text-2xl font-semibold text-sky-300">
                {stats.inProgress}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Resolved
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">
                {stats.resolved}
              </p>
            </div>
          </div>

          {/* ── Recent Tickets ── */}
          <div className="rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Recent Tickets
                </span>
              </div>
              <Link
                href="/client/tickets"
                className="flex items-center gap-1 text-xs text-sky-400 transition hover:text-sky-300"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentTickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Ticket className="h-5 w-5 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400">No tickets yet</p>
                <p className="text-xs text-zinc-500">
                  Create your first support ticket to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/client/tickets?ticketId=${ticket.id}`}
                    className="flex items-center gap-4 px-5 py-3 transition hover:bg-white/[0.04]"
                  >                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <Ticket className="h-3.5 w-3.5 text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {ticket.title}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {formatDateTime(ticket.createdAt)} &middot;{" "}
                        {ticket.category?.name || "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                          ticket.status === "Open"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : ticket.status === "Acknowledged"
                              ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
                              : ticket.status === "InProgress"
                                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
                                : ticket.status === "Resolved" || ticket.status === "Closed"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                  : ticket.status === "PendingUser"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                                    : "",
                        )}
                      >
                        {statusLabels[ticket.status] || ticket.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Quick-links grid ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/client/tickets"
              className="group block rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
                  <Ticket className="h-4 w-4 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white group-hover:text-white">
                    My Tickets
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Open, track, and update your IT support tickets.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-zinc-300" />
              </div>
            </Link>
            <Link
              href="/client/profile"
              className="group block rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <UserRound className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white group-hover:text-white">
                    Profile
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Review and edit your account information.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-zinc-300" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── Create Ticket Modal ── */}
      <TicketCreateModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleTicketCreated}
        categories={categories}
        assets={assets}
        knownIssues={knownIssues}
      />
    </section>
  );
}
