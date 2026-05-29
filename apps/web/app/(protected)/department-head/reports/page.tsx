"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Loader,
  Printer,
  RefreshCw,
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

// ── Date Range Presets ──

type DateRangeKey = "7d" | "30d" | "90d";

const DATE_PRESETS: { key: DateRangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
];

const getDateRange = (key: DateRangeKey): { from: string; to: string } => {
  const now = new Date();
  const to = now.toISOString().split("T")[0] ?? "";
  const from = new Date(now.getTime() - DAYS_MS[key]).toISOString().split("T")[0] ?? "";
  return { from, to };
};

const DAYS_MS: Record<DateRangeKey, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

// ── CSV Export Helpers ──

function downloadCsv(filename: string, rows: string[][]) {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const exportSlaBreachesCsv = (
  items: DepartmentHeadSlaBreaches["items"],
) => {
  const headers = [
    "Ticket",
    "Priority",
    "Status",
    "Ack Breach",
    "Res. Breach",
    "Ack Deadline",
    "Res. Deadline",
    "Created",
  ];
  const rows = items.map((item) => [
    item.title,
    item.priority,
    item.status,
    item.slaAckBreached ? "Breached" : "OK",
    item.slaResolutionBreached ? "Breached" : "OK",
    formatDateTime(item.slaAckDeadline),
    formatDateTime(item.slaResolutionDeadline),
    formatDateTime(item.createdAt),
  ]);
  downloadCsv("sla-breaches.csv", [headers, ...rows]);
};

const exportResolutionMetricsCsv = (
  metrics: DepartmentHeadResolutionMetrics,
) => {
  const headers = [
    "Priority",
    "Resolved Count",
    "Avg Minutes",
    "Median Minutes",
    "Max Minutes",
  ];
  const rows = metrics.byPriority.map((p) => [
    p.priority,
    String(p.resolvedCount),
    String(p.averageMinutes ?? ""),
    String(p.medianMinutes ?? ""),
    String(p.maxMinutes ?? ""),
  ]);
  downloadCsv("resolution-metrics.csv", [
    [
      "Range",
      `${formatDate(metrics.rangeStart)} — ${formatDate(metrics.rangeEnd)}`,
    ],
    ["Resolved Total", String(metrics.resolvedCount)],
    ["Avg Minutes", String(metrics.averageMinutes ?? "")],
    ["Median Minutes", String(metrics.medianMinutes ?? "")],
    ["Max Minutes", String(metrics.maxMinutes ?? "")],
    [],
    headers,
    ...rows,
  ]);
};

const exportWeeklySummaryCsv = (summary: DepartmentHeadWeeklySummary) => {
  const statusHeaders = ["Status", "Count"];
  const statusRows = Object.entries(summary.byStatus).map(([s, c]) => [s, String(c)]);
  const priorityHeaders = ["Priority", "Count"];
  const priorityRows = Object.entries(summary.byPriority).map(([p, c]) => [p, String(c)]);

  downloadCsv("weekly-summary.csv", [
    [
      "Range",
      `${formatDate(summary.rangeStart)} — ${formatDate(summary.rangeEnd)}`,
    ],
    ["Total Created", String(summary.totalCreated)],
    ["SLA Breaches (Total)", String(summary.slaBreaches.total)],
    ["SLA Breaches (Ack)", String(summary.slaBreaches.acknowledged)],
    ["SLA Breaches (Res)", String(summary.slaBreaches.resolution)],
    ["Avg Resolution Minutes", String(summary.averageResolutionMinutes ?? "")],
    [],
    ["— By Status —"],
    statusHeaders,
    ...statusRows,
    [],
    ["— By Priority —"],
    priorityHeaders,
    ...priorityRows,
  ]);
};

// ── Helpers ──

const formatMinutes = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatDate = (dateStr: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
};

const formatDateTime = (dateStr: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
};

// ── Main Page ──

export default function DepartmentHeadReportsPage() {
  const [selectedRange, setSelectedRange] = useState<DateRangeKey>("30d");
  const [weeklySummary, setWeeklySummary] = useState<DepartmentHeadWeeklySummary | null>(null);
  const [resolutionMetrics, setResolutionMetrics] = useState<DepartmentHeadResolutionMetrics | null>(null);
  const [slaBreaches, setSlaBreaches] = useState<DepartmentHeadSlaBreaches | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const dateRange = useMemo(() => getDateRange(selectedRange), [selectedRange]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { from, to } = getDateRange(selectedRange);
      const [weekly, metrics, breaches] = await Promise.all([
        fetchDepartmentHeadWeeklySummary({ fromDate: from, toDate: to }),
        fetchDepartmentHeadResolutionMetrics({ fromDate: from, toDate: to }),
        fetchDepartmentHeadSlaBreaches({ fromDate: from, toDate: to }),
      ]);
      setWeeklySummary(weekly);
      setResolutionMetrics(metrics);
      setSlaBreaches(breaches);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load report data.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <section className="flex h-full flex-col gap-4 print-section">
      {/* ── Print Styles ── */}
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          .print-section {
            margin: 0 !important;
            padding: 20px 40px !important;
            background: #fff !important;
            color: #111 !important;
          }
          .print-section * {
            color: #111 !important;
            border-color: #e5e7eb !important;
          }
          .print-section .rounded-xl { border-color: #e5e7eb !important; background: #f9fafb !important; }
          .print-section .rounded-lg { border-color: #e5e7eb !important; }
          .print-section h1 { font-size: 24px !important; }
          .print-section table { width: 100% !important; border-collapse: collapse !important; }
          .print-section th { background: #f3f4f6 !important; font-size: 10px !important; }
          .print-section td, .print-section th { border: 1px solid #e5e7eb !important; padding: 6px 10px !important; }
          .print-section [class*="text-rose-"] { color: #e11d48 !important; }
          .print-section [class*="text-emerald-"] { color: #059669 !important; }
          .print-section [class*="text-amber-"] { color: #d97706 !important; }
          .print-section [class*="text-orange-"] { color: #ea580c !important; }
          .print-section [class*="text-sky-"] { color: #0284c7 !important; }
          .print-section [class*="text-indigo-"] { color: #6366f1 !important; }
          .print-section [class*="text-zinc-"] { color: #52525b !important; }
          .print-section [class*="bg-rose-"] { background: #fef2f2 !important; border-color: #fecaca !important; }
          .print-section [class*="bg-emerald-"] { background: #ecfdf5 !important; border-color: #a7f3d0 !important; }
          .print-section [class*="bg-amber-"] { background: #fffbeb !important; border-color: #fde68a !important; }
          .print-section [class*="bg-orange-"] { background: #fff7ed !important; border-color: #fed7aa !important; }
          .print-section [class*="bg-indigo-"] { background: #eef2ff !important; border-color: #c7d2fe !important; }
          .print-section [class*="bg-zinc-"] { background: #fafafa !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Reports</h1>
            <p className="text-xs text-zinc-500">
              Department performance metrics and SLA compliance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          {/* Date range selector */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => setSelectedRange(preset.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition",
                  selectedRange === preset.key
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-zinc-200 transition hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            disabled={isLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-zinc-200 transition hover:bg-white/15 disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>

          {/* Export CSV */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              disabled={isLoading || (!weeklySummary && !resolutionMetrics && !slaBreaches)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-zinc-200 transition hover:bg-white/15 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
                  <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Export as CSV
                  </div>
                  {resolutionMetrics && (
                    <button
                      onClick={() => {
                        exportResolutionMetricsCsv(resolutionMetrics);
                        setExportOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-200 transition hover:bg-white/5"
                    >
                      <Activity className="h-3.5 w-3.5 text-zinc-500" />
                      Resolution Metrics
                    </button>
                  )}
                  {weeklySummary && (
                    <button
                      onClick={() => {
                        exportWeeklySummaryCsv(weeklySummary);
                        setExportOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-200 transition hover:bg-white/5"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
                      Weekly Summary
                    </button>
                  )}
                  {slaBreaches && slaBreaches.items.length > 0 && (
                    <button
                      onClick={() => {
                        exportSlaBreachesCsv(slaBreaches.items);
                        setExportOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-200 transition hover:bg-white/5"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-zinc-500" />
                      SLA Breaches
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Date range display ── */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 no-print">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>
          {formatDate(dateRange.from)} — {formatDate(dateRange.to)}
        </span>
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
            Loading reports data…
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={<TicketIcon className="h-4 w-4 text-sky-400" />}
              label="Tickets Created"
              value={String(weeklySummary?.totalCreated ?? "—")}
              subtext={weeklySummary ? `over ${selectedRange === "7d" ? "7" : selectedRange === "30d" ? "30" : "90"} days` : undefined}
            />
            <SummaryCard
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              label="Resolved"
              value={String(resolutionMetrics?.resolvedCount ?? "—")}
              subtext={resolutionMetrics ? `avg ${formatMinutes(resolutionMetrics.averageMinutes)}` : undefined}
            />
            <SummaryCard
              icon={<Clock className="h-4 w-4 text-indigo-400" />}
              label="Avg Resolution Time"
              value={formatMinutes(resolutionMetrics?.averageMinutes)}
              subtext={resolutionMetrics?.medianMinutes ? `median ${formatMinutes(resolutionMetrics.medianMinutes)}` : undefined}
            />
            <SummaryCard
              icon={<AlertTriangle className="h-4 w-4 text-rose-400" />}
              label="SLA Breaches"
              value={String(slaBreaches?.total ?? "—")}
              subtext={weeklySummary?.slaBreaches ? `ack: ${weeklySummary.slaBreaches.acknowledged} · res: ${weeklySummary.slaBreaches.resolution}` : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* ── Resolution Metrics ── */}
            <ReportPanel
              title="Resolution Metrics"
              icon={<TrendingUp className="h-3.5 w-3.5 text-zinc-400" />}
            >
              {resolutionMetrics ? (
                <div className="space-y-4">
                  {/* Overview */}
                  <div className="grid grid-cols-3 gap-3">
                    <MetricItem label="Avg" value={formatMinutes(resolutionMetrics.averageMinutes)} />
                    <MetricItem label="Median" value={formatMinutes(resolutionMetrics.medianMinutes)} />
                    <MetricItem label="Max" value={formatMinutes(resolutionMetrics.maxMinutes)} />
                  </div>

                  {/* By Priority Breakdown */}
                  {resolutionMetrics.byPriority.length > 0 && (
                    <div>
                      <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        By Priority
                      </p>
                      <div className="space-y-2">
                        {resolutionMetrics.byPriority.map((p) => {
                          const maxCount = Math.max(...resolutionMetrics.byPriority.map((x) => x.resolvedCount), 1);
                          const barWidth = (p.resolvedCount / maxCount) * 100;

                          return (
                            <div key={p.priority} className="space-y-1">
                              <div className="flex items-center justify-between">
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
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    p.priority === "Critical" ? "bg-rose-500/60" :
                                    p.priority === "High" ? "bg-orange-500/60" :
                                    p.priority === "Medium" ? "bg-amber-500/60" : "bg-emerald-500/60",
                                  )}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState message="No resolution metrics available for this period." />
              )}
            </ReportPanel>

            {/* ── Weekly Summary ── */}
            <ReportPanel
              title="Weekly Summary"
              icon={<Activity className="h-3.5 w-3.5 text-zinc-400" />}
            >
              {weeklySummary ? (
                <div className="space-y-4">
                  {/* By Status */}
                  {Object.keys(weeklySummary.byStatus).length > 0 && (
                    <div>
                      <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        By Status
                      </p>
                      <div className="space-y-2">
                        {Object.entries(weeklySummary.byStatus).map(([status, count]) => {
                          const total = Object.values(weeklySummary.byStatus).reduce((a, b) => a + b, 0);
                          const barWidth = total > 0 ? (count / total) * 100 : 0;

                          return (
                            <div key={status} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-400">{status}</span>
                                <span className="text-xs font-medium text-zinc-100">{count}</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                                <div
                                  className="h-full rounded-full bg-zinc-500/60 transition-all duration-500"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* By Priority */}
                  {Object.keys(weeklySummary.byPriority).length > 0 && (
                    <div>
                      <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        By Priority
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(weeklySummary.byPriority).map(([priority, count]) => (
                          <div
                            key={priority}
                            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1"
                          >
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
                <EmptyState message="No weekly summary available for this period." />
              )}
            </ReportPanel>
          </div>

          {/* ── SLA Breaches Table ── */}
          <ReportPanel
            title={`SLA Breaches${slaBreaches ? ` (${slaBreaches.total})` : ""}`}
            icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
          >
            {slaBreaches && slaBreaches.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="pb-2 pr-4 font-medium">Ticket</th>
                      <th className="pb-2 pr-4 font-medium">Priority</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Ack Breach</th>
                      <th className="pb-2 pr-4 font-medium">Res. Breach</th>
                      <th className="pb-2 pr-4 font-medium">Ack Deadline</th>
                      <th className="pb-2 font-medium">Res. Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {slaBreaches.items.map((item) => (
                      <tr key={item.id} className="transition hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-4">
                          <p className="truncate text-sm font-medium text-zinc-100 max-w-[200px]">
                            {item.title}
                          </p>
                          <p className="text-xs text-zinc-500">{formatDateTime(item.createdAt)}</p>
                        </td>
                        <td className="py-2.5 pr-4">
                          <PriorityBadge priority={item.priority} />
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-2.5 pr-4">
                          {item.slaAckBreached ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-200">
                              Breached
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          {item.slaResolutionBreached ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-200">
                              Breached
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-zinc-400">
                          {formatDateTime(item.slaAckDeadline)}
                        </td>
                        <td className="py-2.5 text-xs text-zinc-400">
                          {formatDateTime(item.slaResolutionDeadline)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No SLA breaches in this period." />
            )}
          </ReportPanel>
        </div>
      )}
    </section>
  );
}

// ── Sub-components ──

function SummaryCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          {subtext ? (
            <p className="mt-0.5 truncate text-[10px] text-zinc-500">{subtext}</p>
          ) : null}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ReportPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800">
          {icon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-6 text-center text-sm text-zinc-500">{message}</p>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
      priority === "Critical" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" :
      priority === "High" ? "border-orange-500/30 bg-orange-500/10 text-orange-200" :
      priority === "Medium" ? "border-amber-500/30 bg-amber-500/10 text-amber-200" :
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    )}>{priority}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
      status === "Open" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" :
      status === "Acknowledged" ? "border-sky-500/30 bg-sky-500/10 text-sky-200" :
      status === "InProgress" ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200" :
      status === "Resolved" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" :
      "border-white/10 bg-white/5 text-zinc-400",
    )}>{status}</span>
  );
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}
