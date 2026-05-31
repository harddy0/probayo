"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Archive,
  CalendarDays,
  Globe,
  Loader,
  LogIn,
  LogOut,
  MessageSquare,
  PenSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/client";
import { fetchAuditLogs } from "@/lib/api/audit-logs";
import type {
  AuditAction,
  AuditEntityType,
  AuditLogEntry,
} from "@/lib/types/audit-logs";
import { cn } from "@/lib/utils";

// ── Constants ──

const ACTION_CONFIG: Record<
  AuditAction,
  { icon: React.ReactNode; label: string; color: string }
> = {
  Create: {
    icon: <Plus className="h-3.5 w-3.5" />,
    label: "Created",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  Update: {
    icon: <PenSquare className="h-3.5 w-3.5" />,
    label: "Updated",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
  Delete: {
    icon: <Trash2 className="h-3.5 w-3.5" />,
    label: "Deleted",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  View: {
    icon: <Activity className="h-3.5 w-3.5" />,
    label: "Viewed",
    color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  },
  Assign: {
    icon: <UserPlus className="h-3.5 w-3.5" />,
    label: "Assigned",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  Unassign: {
    icon: <Users className="h-3.5 w-3.5" />,
    label: "Unassigned",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  Comment: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    label: "Commented",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  Login: {
    icon: <LogIn className="h-3.5 w-3.5" />,
    label: "Logged in",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  Logout: {
    icon: <LogOut className="h-3.5 w-3.5" />,
    label: "Logged out",
    color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  },
  Upload: {
    icon: <Upload className="h-3.5 w-3.5" />,
    label: "Uploaded",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  Download: {
    icon: <Archive className="h-3.5 w-3.5" />,
    label: "Downloaded",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
};

const ENTITY_COLORS: Record<string, string> = {
  Ticket: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  Comment: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  Attachment: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  User: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  Department: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  KnownIssue: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  SlaPolicy: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  EscalationRule: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  Asset: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  Category: "bg-pink-500/15 text-pink-300 border-pink-500/20",
};

const formatTimeAgo = (dateStr: string): string => {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.round(diffMs / (1000 * 60));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(new Date(dateStr));
};

const formatFullDate = (dateStr: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
};

const ALL_ACTIONS = Object.keys(ACTION_CONFIG) as AuditAction[];
const ALL_ENTITY_TYPES = Object.keys(ENTITY_COLORS) as AuditEntityType[];

// ── Main Page Component ──

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | "all">(
    "all",
  );
  const [showFilters, setShowFilters] = useState(false);

  // ── Load ──

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs();
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setLogs(sorted);
    } catch (err) {
      setError(
        isApiError(err)
          ? `${err.message} (${err.status})`
          : "Failed to load audit logs.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  // ── Filters ──

  const filteredLogs = useMemo(() => {
    let result = logs;

    // Action filter
    if (actionFilter !== "all") {
      result = result.filter((log) => log.action === actionFilter);
    }

    // Entity type filter
    if (entityFilter !== "all") {
      result = result.filter((log) => log.entityType === entityFilter);
    }

    // Search query (actor name, email, entity ID, IP address)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (log) =>
          log.actor.fullName.toLowerCase().includes(q) ||
          log.actor.email.toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q) ||
          log.ipAddress.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entityType.toLowerCase().includes(q),
      );
    }

    return result;
  }, [logs, actionFilter, entityFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      uniqueActors: new Set(logs.map((l) => l.actor.id)).size,
      uniqueActions: new Set(logs.map((l) => l.action)).size,
    };
  }, [logs]);

  const hasActiveFilters = actionFilter !== "all" || entityFilter !== "all" || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setActionFilter("all");
    setEntityFilter("all");
    setSearchQuery("");
  };

  // ── Render ──

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <ShieldAlert className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Audit Logs</h1>
            <p className="text-xs text-zinc-500">
              Track every action across the system
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Stats pills */}
          <div className="hidden items-center gap-2 sm:flex">
            <StatPill label="Entries" value={stats.total} />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Actors" value={stats.uniqueActors} />
            <div className="h-4 w-px bg-white/10" />
            <StatPill
              label="Actions"
              value={stats.uniqueActions}
              className="text-sky-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
              showFilters || hasActiveFilters
                ? "border-white/20 bg-white/10 text-white"
                : "border-white/10 text-zinc-300 hover:bg-white/10",
            )}
          >
            <Search className="h-3.5 w-3.5" />
            {hasActiveFilters ? "Filters active" : "Filters"}
          </button>
          <button
            onClick={loadAuditLogs}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Filters Panel ── */}
      {showFilters && (
        <div className="flex shrink-0 flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) =>
                setActionFilter(e.target.value as AuditAction | "all")
              }
              className="h-8 rounded-lg border border-white/10 bg-zinc-900 px-2.5 text-xs text-zinc-100 outline-none transition focus:border-white/20"
            >
              <option value="all">All actions</option>
              {ALL_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {ACTION_CONFIG[action].label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">
              Entity
            </label>
            <select
              value={entityFilter}
              onChange={(e) =>
                setEntityFilter(e.target.value as AuditEntityType | "all")
              }
              className="h-8 rounded-lg border border-white/10 bg-zinc-900 px-2.5 text-xs text-zinc-100 outline-none transition focus:border-white/20"
            >
              <option value="all">All entities</option>
              {ALL_ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">
              Search
            </label>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Actor, email, entity ID, IP…"
              className="h-8 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 pr-8 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2.5 text-sm text-zinc-500">
            <Loader className="h-4 w-4 animate-spin" />
            Loading audit logs…
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <ShieldAlert className="h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">
              {hasActiveFilters ? "No matching entries" : "No audit logs yet"}
            </p>
            <p className="text-xs text-zinc-500">
              {hasActiveFilters
                ? "Try adjusting your filters."
                : "System activity will appear here as actions are performed."}
            </p>
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                className="mt-2 h-8 bg-zinc-800 px-3 text-xs text-zinc-50 hover:bg-zinc-700"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-950/95 text-[10px] uppercase tracking-[0.25em] text-zinc-500 backdrop-blur">
                <tr>
                  <th className="border-b border-white/10 px-4 py-2.5 font-medium">
                    Time
                  </th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">
                    Actor
                  </th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">
                    Action
                  </th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">
                    Entity
                  </th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">
                    Entity ID
                  </th>
                  <th className="border-b border-white/10 px-4 py-2.5 text-right font-medium">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const actionCfg =
                    ACTION_CONFIG[log.action] ?? ACTION_CONFIG.View;
                  const entityColor =
                    ENTITY_COLORS[log.entityType] ??
                    "bg-zinc-500/15 text-zinc-300 border-zinc-500/20";

                  return (
                    <tr
                      key={log.id}
                      className="group transition hover:bg-white/[0.04]"
                    >
                      {/* Time */}
                      <td className="border-b border-white/5 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                          <div>
                            <p className="text-xs font-medium text-white">
                              {formatTimeAgo(log.createdAt)}
                            </p>
                            <p
                              className="text-[10px] text-zinc-500"
                              title={formatFullDate(log.createdAt)}
                            >
                              {new Date(log.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="border-b border-white/5 px-3 py-3">
                        <p className="truncate text-xs font-medium text-zinc-100">
                          {log.actor.fullName}
                        </p>
                        <p className="truncate text-[10px] text-zinc-500">
                          {log.actor.email}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="border-b border-white/5 px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
                            actionCfg.color,
                          )}
                        >
                          {actionCfg.icon}
                          {actionCfg.label}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="border-b border-white/5 px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            entityColor,
                          )}
                        >
                          {log.entityType}
                        </span>
                      </td>

                      {/* Entity ID */}
                      <td className="max-w-[140px] truncate border-b border-white/5 px-3 py-3">
                        <code className="text-[11px] font-mono text-zinc-400">
                          {log.entityId.length > 20
                            ? `${log.entityId.slice(0, 20)}…`
                            : log.entityId}
                        </code>
                      </td>

                      {/* IP */}
                      <td className="border-b border-white/5 px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5">
                          <Globe className="h-3 w-3 text-zinc-600" />
                          <code className="text-[10px] font-mono text-zinc-500">
                            {log.ipAddress}
                          </code>
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
    </section>
  );
}

// ── Tiny stat pill ──

function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums text-white",
          className,
        )}
      >
        {value}
      </span>
    </div>
  );
}
