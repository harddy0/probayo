"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  ChevronRight,
  Clock,
  Loader,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { Notification, NotificationType } from "@/lib/types/notifications";
import { cn } from "@/lib/utils";

// ── Constants ──

const typeConfig: Record<
  NotificationType,
  { icon: React.ReactNode; color: string }
> = {
  TicketCreated: {
    icon: <Bell className="h-3 w-3" />,
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  StatusChanged: {
    icon: <Clock className="h-3 w-3" />,
    color: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  },
  Escalation: {
    icon: <AlertCircle className="h-3 w-3" />,
    color: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  },
  KnownIssueResolved: {
    icon: <CheckCircle className="h-3 w-3" />,
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  Assignment: {
    icon: <UserCheck className="h-3 w-3" />,
    color: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  },
  SlaBreach: {
    icon: <AlertCircle className="h-3 w-3" />,
    color: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  },
  CommentAdded: {
    icon: <MessageSquare className="h-3 w-3" />,
    color: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  },
};

const formatTimeAgo = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.round(diffMs / (1000 * 60));
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(dateStr));
};

// ── Dropdown Component ──

export default function NotificationBellDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load data ──

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchNotifications();
      const sorted = [...data].sort((a, b) => {
        const aDate = a.sentAt ?? a.createdAt;
        const bDate = b.sentAt ?? b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      setRecent(sorted.slice(0, 5));
    } catch {
      // Silently fail for dropdown
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Poll unread count every 30s ──

  useEffect(() => {
    void loadUnreadCount();
    pollRef.current = setInterval(() => void loadUnreadCount(), 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadUnreadCount]);

  // ── Open/close ──

  useEffect(() => {
    if (!isOpen) return;
    void loadRecent();

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    // Delay adding listener to avoid immediate close from the toggle click
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, loadRecent]);

  // ── Handlers ──

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    try {
      await markNotificationRead(notif.id);
      setUnreadCount((prev) => (prev !== null ? Math.max(0, prev - 1) : prev));
      setRecent((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    } catch {
      // Non-critical
    }
    setIsOpen(false);

    // Navigate
    if (notif.ticket?.id) {
      router.push(`/it-staff/tickets?ticketId=${notif.ticket.id}`);
    } else {
      router.push("/it-staff/tickets");
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 transition hover:border-white/20 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unreadCount !== null && unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {/* Dropdown */}
      {isOpen ? (
        <div className="absolute right-0 top-full z-[300] mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <span className="text-xs font-semibold text-zinc-100">Notifications</span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/it-staff/notifications");
              }}
              className="text-[10px] uppercase tracking-wider text-zinc-500 transition hover:text-zinc-200"
            >
              View all
            </button>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8">
                <Bell className="h-6 w-6 text-zinc-600" />
                <p className="text-xs text-zinc-500">No notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {recent.map((notif) => {
                  const cfg = typeConfig[notif.type] ?? typeConfig.TicketCreated;
                  const isUnread = !notif.readAt;

                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => void handleNotificationClick(notif)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5",
                        isUnread && "bg-white/[0.02]",
                      )}
                    >
                      {/* Type icon */}
                      <div
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border",
                          cfg.color,
                        )}
                      >
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isUnread ? (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                          ) : null}
                          <p className="truncate text-xs font-medium text-zinc-100">
                            {notif.ticket?.title ?? "Notification"}
                          </p>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">
                          {notif.body}
                        </p>
                        <p className="mt-1 text-[10px] text-zinc-500">
                          {formatTimeAgo(notif.sentAt ?? notif.createdAt)}
                        </p>
                      </div>

                      <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-zinc-600" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
