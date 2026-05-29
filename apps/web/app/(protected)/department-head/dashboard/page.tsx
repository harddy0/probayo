"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Loader,
  RefreshCw,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { isApiError } from "@/lib/api/client";
import {
  fetchDepartmentHeadWeeklySummary,
  fetchDepartmentHeadResolutionMetrics,
  fetchDepartmentHeadSlaBreaches,
} from "@/lib/api/department-head";
import type {
  DepartmentHeadWeeklySummary,
  DepartmentHeadResolutionMetrics,
  DepartmentHeadSlaBreaches,
} from "@/lib/types/department-head";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Helpers ──

const formatMinutes = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// ── Main Page ──

export default function DepartmentHeadDashboardPage() {
  const [weeklySummary, setWeeklySummary] = useState<DepartmentHeadWeeklySummary | null>(null);
  const [resolutionMetrics, setResolutionMetrics] = useState<DepartmentHeadResolutionMetrics | null>(null);
  const [slaBreaches, setSlaBreaches] = useState<DepartmentHeadSlaBreaches | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [weekly, metrics, breaches] = await Promise.all([
        fetchDepartmentHeadWeeklySummary(),
        fetchDepartmentHeadResolutionMetrics(),
        fetchDepartmentHeadSlaBreaches(),
      ]);
      setWeeklySummary(weekly);
      setResolutionMetrics(metrics);
      setSlaBreaches(breaches);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <section className="flex h-full flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Department Dashboard</h1>
            <p className="text-xs text-zinc-500">
              Overview of your department&apos;s ticket performance
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-zinc-200 transition hover:bg-white/15 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error ? (
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
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
        <div className="min-h-0 flex-1 overflow-y-auto space-y-4">
          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Created */}
            <StatCard
              icon={<Ticket className="h-4 w-4" />}
              label="Total Created"
              value={String(weeklySummary?.totalCreated ?? "—")}
              accent="text-sky-400"
              border="border-sky-500/20"
              bg="bg-sky-500/10"
            />
            {/* Average Resolution Time */}
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Avg Resolution"
              value={formatMinutes(resolutionMetrics?.averageMinutes)}
              accent="text-emerald-400"
              border="border-emerald-500/20"
              bg="bg-emerald-500/10"
            />
            {/* Median Resolution Time */}
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Median Resolution"
              value={formatMinutes(resolutionMetrics?.medianMinutes)}
              accent="text-indigo-400"
              border="border-indigo-500/20"
              bg="bg-indigo-500/10"
            />
            {/* SLA Breaches */}
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="SLA Breaches"
              value={String(slaBreaches?.total ?? "—")}
              accent={slaBreaches && slaBreaches.total > 0 ? "text-rose-400" : "text-emerald-400"}
              border={slaBreaches && slaBreaches.total > 0 ? "border-rose-500/20" : "border-emerald-500/20"}
              bg={slaBreaches && slaBreaches.total > 0 ? "bg-rose-500/10" : "bg-emerald-500/10"}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* ── Resolution Metrics ── */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800">
                  <BarChart3 className="h-3 w-3 text-zinc-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                  Resolution Metrics
                </span>
              </div>
              {resolutionMetrics ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs text-zinc-400">Resolved</span>
                    <span className="text-sm font-semibold text-zinc-100">{resolutionMetrics.resolvedCount}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs text-zinc-400">Average</span>
                    <span className="text-sm font-semibold text-zinc-100">{formatMinutes(resolutionMetrics.averageMinutes)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs text-zinc-400">Median</span>
                    <span className="text-sm font-semibold text-zinc-100">{formatMinutes(resolutionMetrics.medianMinutes)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs text-zinc-400">Max</span>
                    <span className="text-sm font-semibold text-zinc-100">{formatMinutes(resolutionMetrics.maxMinutes)}</span>
                  </div>

                  {/* By Priority */}
                  {resolutionMetrics.byPriority.length > 0 && (
                    <div className="pt-2">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">By Priority</p>
                      <div className="space-y-1.5">
                        {resolutionMetrics.byPriority.map((p) => (
                          <div key={p.priority} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                            <span className={cn(
                              "text-xs font-medium",
                              p.priority === "Critical" ? "text-rose-300" :
                              p.priority === "High" ? "text-orange-300" :
                              p.priority === "Medium" ? "text-amber-300" : "text-emerald-300",
                            )}>{p.priority}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-zinc-400">{p.resolvedCount} resolved</span>
                              <span className="text-xs text-zinc-500">avg {formatMinutes(p.averageMinutes)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-zinc-500">No resolution data.</p>
              )}
            </div>

            {/* ── Weekly Summary ── */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800">
                  <Activity className="h-3 w-3 text-zinc-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                  Weekly Summary
                </span>
              </div>
              {weeklySummary ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs text-zinc-400">Total Created</span>
                    <span className="text-sm font-semibold text-zinc-100">{weeklySummary.totalCreated}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs text-zinc-400">Avg Resolution</span>
                    <span className="text-sm font-semibold text-zinc-100">{formatMinutes(weeklySummary.averageResolutionMinutes)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs text-zinc-400">SLA Breaches</span>
                    <span className={cn(
                      "text-sm font-semibold",
                      weeklySummary.slaBreaches.total > 0 ? "text-rose-300" : "text-emerald-300",
                    )}>{weeklySummary.slaBreaches.total}</span>
                  </div>

                  {/* By Status */}
                  {Object.keys(weeklySummary.byStatus).length > 0 && (
                    <div className="pt-2">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">By Status</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(weeklySummary.byStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                            <span className="text-xs text-zinc-400">{status}</span>
                            <span className="text-xs font-semibold text-zinc-100">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Priority */}
                  {Object.keys(weeklySummary.byPriority).length > 0 && (
                    <div className="pt-2">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">By Priority</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(weeklySummary.byPriority).map(([priority, count]) => (
                          <div key={priority} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                            <span className={cn(
                              "text-xs",
                              priority === "Critical" ? "text-rose-300" :
                              priority === "High" ? "text-orange-300" :
                              priority === "Medium" ? "text-amber-300" : "text-emerald-300",
                            )}>{priority}</span>
                            <span className="text-xs font-semibold text-zinc-100">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-zinc-500">No weekly summary data.</p>
              )}
            </div>
          </div>

          {/* ── SLA Breaches List ── */}
          {slaBreaches && slaBreaches.items.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800">
                    <AlertTriangle className="h-3 w-3 text-rose-400" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                    SLA Breaches ({slaBreaches.total})
                  </span>
                </div>
                <Link
                  href="/department-head/tickets"
                  className="flex items-center gap-1 text-xs text-sky-400 transition hover:text-sky-300"
                >
                  View all tickets
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-1.5">
                {slaBreaches.items.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-rose-500/10 bg-rose-500/[0.03] px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{item.title}</p>
                      <p className="text-xs text-zinc-500">
                        {item.slaAckBreached && item.slaResolutionBreached
                          ? "Ack & Resolution breached"
                          : item.slaAckBreached
                            ? "Acknowledgement breached"
                            : "Resolution breached"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 ml-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                        item.priority === "Critical" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" :
                        item.priority === "High" ? "border-orange-500/30 bg-orange-500/10 text-orange-200" :
                        item.priority === "Medium" ? "border-amber-500/30 bg-amber-500/10 text-amber-200" :
                        "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                      )}>{item.priority}</span>
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                        item.status === "Open" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" :
                        item.status === "Acknowledged" ? "border-sky-500/30 bg-sky-500/10 text-sky-200" :
                        item.status === "InProgress" ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200" :
                        item.status === "Resolved" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" :
                        "border-white/10 bg-white/5 text-zinc-400",
                      )}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick Links ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/department-head/tickets"
              className="group block rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
                  <TicketCheck className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-white">View Tickets</p>
                  <p className="text-xs text-zinc-500">Browse all department tickets</p>
                </div>
              </div>
            </Link>
            <Link
              href="/department-head/profile"
              className="group block rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <Activity className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-white">Profile Settings</p>
                  <p className="text-xs text-zinc-500">Update your account information</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Stat Card Sub-component ──

function StatCard({
  icon,
  label,
  value,
  accent,
  border,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  border: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", bg, border)}>
          <div className={accent}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function TicketCheck(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
