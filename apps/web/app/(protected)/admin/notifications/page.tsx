"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  CheckSquare,
  ChevronRight,
  Clock,
  Loader,
  MessageSquare,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/client";
import {
  fetchNotifications,
  markNotificationSeen,
  markNotificationsSeen,
} from "@/lib/api/notifications";
import type { Notification, NotificationType } from "@/lib/types/notifications";
import { cn } from "@/lib/utils";

// ── Constants ──

const typeConfig: Record<
  NotificationType,
  { icon: React.ReactNode; label: string; color: string }
> = {
  TicketCreated: {
    icon: <Bell className="h-4 w-4" />,
    label: "New ticket",
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  StatusChanged: {
    icon: <Clock className="h-4 w-4" />,
    label: "Status update",
    color: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  },
  Escalation: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: "Escalated",
    color: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  },
  KnownIssueResolved: {
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Known issue resolved",
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  Assignment: {
    icon: <UserCheck className="h-4 w-4" />,
    label: "Assigned",
    color: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  },
  SlaBreach: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: "SLA breach",
    color: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  },
  CommentAdded: {
    icon: <MessageSquare className="h-4 w-4" />,
    label: "Comment",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  },
};

const formatTimeAgo = (dateStr: string | null): string => {
  if (!dateStr) return "—";
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

// ── Main Page Component ──

export default function AdminNotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load ──

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications();
      // Sort: most recent first (by sentAt or createdAt)
      const sorted = [...data].sort((a, b) => {
        const aDate = a.sentAt ?? a.createdAt;
        const bDate = b.sentAt ?? b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      setNotifications(sorted);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Live polling — refresh notifications every 30s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const data = await fetchNotifications();
          const sorted = [...data].sort((a, b) => {
            const aDate = a.sentAt ?? a.createdAt;
            const bDate = b.sentAt ?? b.createdAt;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
          });
          setNotifications(sorted);
        } catch {
          // Silent refresh — don't overwrite existing data on error
        }
      })();
    }, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Mark as seen and navigate ──

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as seen optimistically
    setMarkingIds((prev) => new Set(prev).add(notif.id));
    try {
      await markNotificationSeen(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isSeen: true } : n)),
      );
    } catch {
      // If marking fails, we still navigate — not critical
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(notif.id);
        return next;
      });
    }

    // Navigate to the related ticket if one exists
    if (notif.ticket?.id) {
      router.push(`/admin/tickets?ticketId=${notif.ticket.id}`);
    } else {
      router.push("/admin/tickets");
    }
  };

  // ── Mark all as seen ──

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const unreadIds = notifications.filter((n) => !n.isSeen).map((n) => n.id);
      await markNotificationsSeen(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, isSeen: true })));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to mark all as read.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  // ── Group by date ──

  const grouped = notifications.reduce<Record<string, Notification[]>>(
    (acc, notif) => {
      const date = notif.sentAt ?? notif.createdAt;
      const today = new Date();
      const notifDate = new Date(date);
      let key: string;

      const isToday =
        notifDate.getFullYear() === today.getFullYear() &&
        notifDate.getMonth() === today.getMonth() &&
        notifDate.getDate() === today.getDate();

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        notifDate.getFullYear() === yesterday.getFullYear() &&
        notifDate.getMonth() === yesterday.getMonth() &&
        notifDate.getDate() === yesterday.getDate();

      if (isToday) key = "Today";
      else if (isYesterday) key = "Yesterday";
      else
        key = new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
        }).format(notifDate);

      (acc[key] ??= []).push(notif);
      return acc;
    },
    {},
  );

  const isEmpty = !isLoading && notifications.length === 0;

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Compact header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <Bell className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Notifications</h1>
            <p className="text-xs text-zinc-500">
              Updates on tickets, assignments, and SLA status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="h-8 bg-white/10 px-3 text-xs text-zinc-200 hover:bg-white/15"
            onClick={() => void handleMarkAllAsRead()}
            disabled={isMarkingAll || notifications.length === 0}
          >
            {isMarkingAll ? (
              <Loader className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
            )}
            Mark all read
          </Button>
          <button
            onClick={loadNotifications}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
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

      {/* ── Scrollable content ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-5 py-4"
              >
                <div className="h-8 w-8 shrink-0 rounded-lg bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-white/10" />
                  <div className="h-2.5 w-1/2 rounded bg-white/5" />
                </div>
                <div className="h-3 w-12 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Bell className="h-6 w-6 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-400">No notifications yet.</p>
            <p className="text-xs text-zinc-500">
              You will be notified when tickets are assigned or updated.
            </p>
          </div>
        ) : (
          /* ── Grouped Notification List ── */
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel} className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {dateLabel}
                </p>
                <div className="space-y-1">
                  {items.map((notif) => {
                    const cfg =
                      typeConfig[notif.type] ?? typeConfig.TicketCreated;
                    const isMarking = markingIds.has(notif.id);
                    const isUnread = !notif.isSeen;

                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => void handleNotificationClick(notif)}
                        disabled={isMarking}
                        className={cn(
                          "group relative flex w-full items-start gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-150",
                          isUnread
                            ? "border-white/[0.10] bg-white/5"
                            : "border-white/5 bg-transparent",
                          isMarking
                            ? "opacity-60"
                            : "hover:border-white/20 hover:bg-white/[0.07]",
                        )}
                      >
                        {/* Unread dot */}
                        {isUnread ? (
                          <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-400" />
                        ) : null}

                        {/* Type icon badge */}
                        <div
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                            cfg.color,
                          )}
                        >
                          {cfg.icon}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                                cfg.color,
                              )}
                            >
                              {cfg.label}
                            </span>
                            {notif.ticket ? (
                              <span className="truncate text-xs font-medium text-zinc-100">
                                {notif.ticket.title}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-zinc-400 line-clamp-2">
                            {notif.body}
                          </p>

                          {/* Footer */}
                          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                            <span>
                              {formatTimeAgo(notif.sentAt ?? notif.createdAt)}
                            </span>
                            {notif.subject ? (
                              <>
                                <span className="text-zinc-700">·</span>
                                <span className="truncate">
                                  {notif.subject}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {/* Chevron + spinner */}
                        <div className="mt-1 shrink-0">
                          {isMarking ? (
                            <Loader className="h-4 w-4 animate-spin text-zinc-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-zinc-600 transition group-hover:text-zinc-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
