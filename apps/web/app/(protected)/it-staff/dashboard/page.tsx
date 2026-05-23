"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Inbox,
  LogIn,
  RefreshCw,
  TicketCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { getAuthSession, isApiError } from "@/lib/api/client";
import { fetchItStaffDashboardStats } from "@/lib/api/it-staff";
import type { ItStaffDashboardStats } from "@/lib/types/it-staff";
import type { TicketPriority, TicketStatus } from "@/lib/types/tickets";
import { cn } from "@/lib/utils";

// ── Helpers ──

const formatUserName = (user?: { firstName?: string; lastName?: string; email?: string } | null) => {
  if (!user) return "—";
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email || "—";
};

const priorityLabels: Record<TicketPriority, string> = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Critical: "Critical",
};

const statusLabels: Record<TicketStatus, string> = {
  Open: "Open",
  Acknowledged: "Acknowledged",
  PendingUser: "Pending user",
  InProgress: "In progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

const priorityColors: Record<TicketPriority, string> = {
  Critical: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  High: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

// ── Stat Card ──

function StatCard({
  label,
  value,
  icon,
  accent,
  subtext,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: "emerald" | "amber" | "rose" | "sky" | "indigo" | "zinc";
  subtext?: string;
}) {
  const accentBorders: Record<string, string> = {
    emerald: "border-emerald-500/20",
    amber: "border-amber-500/20",
    rose: "border-rose-500/20",
    sky: "border-sky-500/20",
    indigo: "border-indigo-500/20",
    zinc: "border-white/10",
  };
  const accentIcons: Record<string, string> = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    sky: "text-sky-400",
    indigo: "text-indigo-400",
    zinc: "text-zinc-400",
  };
  const accentValues: Record<string, string> = {
    emerald: "text-emerald-200",
    amber: "text-amber-200",
    rose: "text-rose-200",
    sky: "text-sky-200",
    indigo: "text-indigo-200",
    zinc: "text-white",
  };

  return (
    <div className={cn(
      "rounded-xl border bg-white/[0.03] p-4 transition hover:bg-white/[0.06]",
      accentBorders[accent],
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
          <p className={cn("text-2xl font-semibold tracking-tight", accentValues[accent])}>
            {value}
          </p>
          {subtext ? (
            <p className="text-[10px] text-zinc-500 leading-tight">{subtext}</p>
          ) : null}
        </div>
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border bg-white/5",
          accentIcons[accent],
          accentBorders[accent],
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Progress Bar ──

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colors: Record<string, string> = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    sky: "bg-sky-400",
    indigo: "bg-indigo-400",
    zinc: "bg-white/30",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={cn("h-full rounded-full transition-all duration-500", colors[color] || colors.zinc)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ── Main Component ──

export default function ItStaffDashboard() {
  const session = getAuthSession();
  const currentUserId = session?.identity?.userId ?? null;
  const currentUserEmail = session?.identity?.email ?? null;
  const currentUserName = formatUserName(session?.identity);

  const [stats, setStats] = useState<ItStaffDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(false);

  const loadStats = useCallback(async (silent = false) => {
    if (!currentUserId) return;
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchItStaffDashboardStats(currentUserId);
      if (mountedRef.current) {
        setStats(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(isApiError(err) ? err.message : "Failed to load dashboard.");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [currentUserId]);

  useEffect(() => {
    mountedRef.current = true;
    void loadStats();
    return () => { mountedRef.current = false; };
  }, [loadStats]);

  if (!currentUserId) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <LogIn className="h-5 w-5 text-zinc-400" />
        </div>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-zinc-200">Session required</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Please log in to view the dashboard.</p>
        </div>
      </section>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStats(true);
  };

  const statusBreakdown = stats
    ? Object.entries(stats.byStatus).map(([key, count]) => ({
        key,
        label: statusLabels[key as TicketStatus] || key,
        count,
        color: ({
          Open: "emerald",
          Acknowledged: "sky",
          PendingUser: "amber",
          InProgress: "indigo",
          Resolved: "emerald",
          Closed: "zinc",
        } as Record<string, string>)[key] || "zinc",
      }))
    : [];

  const priorityBreakdown = stats
    ? Object.entries(stats.byPriority).map(([key, count]) => ({
        key,
        label: priorityLabels[key as TicketPriority] || key,
        count,
        color: ({
          Critical: "rose",
          High: "amber",
          Medium: "amber",
          Low: "emerald",
        } as Record<string, string>)[key] || "zinc",
      }))
    : [];

  const totalTickets = stats
    ? Object.values(stats.byStatus).reduce((sum, c) => sum + c, 0)
    : 0;

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Compact header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-zinc-500">Monitor and manage support operations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUserEmail ? (
            <p className="hidden text-[11px] text-zinc-500 sm:block">
              <span className="text-zinc-600">Signed in as </span>
              <span className="font-medium text-zinc-300">{currentUserEmail}</span>
            </p>
          ) : null}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Welcome Card ── */}
      <div className="shrink-0 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-sm font-semibold text-white">
            {currentUserName.charAt(0).toUpperCase() || "I"}
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              Welcome back, {currentUserName || "IT Staff"}
            </p>
            <p className="text-xs text-zinc-500">
              {stats
                ? `You have ${stats.myActive} active ticket${stats.myActive !== 1 ? "s" : ""} assigned`
                : "Loading your status…"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error ? (
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* ── Scrollable content area ── */}
      <div className="min-h-0 flex-1 overflow-y-auto space-y-3">
        {/* ── Stats Grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="h-3 w-16 rounded bg-white/10" />
                <div className="mt-2 h-7 w-12 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Open tickets"
              value={stats?.totalOpen ?? 0}
              icon={<Inbox className="h-4 w-4" />}
              accent="emerald"
              subtext="Open / Acknowledged / In Progress"
            />
            <StatCard
              label="Unassigned"
              value={stats?.unassigned ?? 0}
              icon={<Activity className="h-4 w-4" />}
              accent="amber"
              subtext="Awaiting IT staff assignment"
            />
            <StatCard
              label="My active tickets"
              value={stats?.myActive ?? 0}
              icon={<TicketCheck className="h-4 w-4" />}
              accent="sky"
              subtext="Resolved + Closed excluded"
            />
            <StatCard
              label="SLA breaches"
              value={stats?.slaBreached ?? 0}
              icon={<AlertTriangle className="h-4 w-4" />}
              accent="rose"
              subtext="Ack or Resolution deadline missed"
            />
          </div>
        )}

        {/* ── Breakdown Panels ── */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Status Breakdown */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Tickets by Status</p>
                <p className="text-[10px] text-zinc-500">{totalTickets} total</p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {statusBreakdown.length > 0 ? (
                statusBreakdown.map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{item.label}</span>
                      <span className="font-medium text-zinc-200">{item.count}</span>
                    </div>
                    <ProgressBar value={item.count} max={totalTickets} color={item.color} />
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500">No tickets yet.</p>
              )}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Tickets by Priority</p>
                <p className="text-[10px] text-zinc-500">{totalTickets} total</p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <AlertTriangle className="h-3.5 w-3.5 text-zinc-400" />
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {priorityBreakdown.length > 0 ? (
                priorityBreakdown.map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider",
                        priorityColors[item.key as TicketPriority] || "border-white/10 bg-white/5 text-zinc-400",
                      )}>
                        {item.label}
                      </span>
                      <span className="font-medium text-zinc-200">{item.count}</span>
                    </div>
                    <ProgressBar value={item.count} max={totalTickets} color={item.color} />
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500">No tickets yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Quick Actions</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/it-staff/tickets?view=unassigned">
              <div className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/10">
                <Inbox className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="flex-1">Unassigned tickets</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-zinc-500" />
              </div>
            </Link>
            <Link href="/it-staff/tickets?view=my-tickets">
              <div className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/10">
                <TicketCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span className="flex-1">My tickets</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-zinc-500" />
              </div>
            </Link>
            <Link href="/it-staff/assets">
              <div className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/10">
                <Users className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                <span className="flex-1">Manage assets</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-zinc-500" />
              </div>
            </Link>
            <Link href="/it-staff/tickets">
              <div className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/10">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span className="flex-1">All tickets</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-zinc-500" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
