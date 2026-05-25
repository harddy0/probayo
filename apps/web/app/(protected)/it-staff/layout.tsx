"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  LayoutDashboard,
  LogOut,
  TicketCheck,
  User,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import { getAuthSession } from "@/lib/api/client";
import { fetchUnreadCount } from "@/lib/api/notifications";
import NotificationBellDropdown from "@/components/it-staff/notification-bell-dropdown";
import { cn } from "@/lib/utils";

export default function ItStaffLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    // Normalize role to be resilient to casing/spacing and punctuation differences.
    const role = String(session.identity.role || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (role === "itstaff") {
      setIsAuthorized(true);
      fetchUnreadCount()
        .then((count) => {
          if (mountedRef.current) setUnreadCount(count);
        })
        .catch(() => {
          /* ignore */
        });
    } else {
      const roleRedirects: Record<string, string> = {
        admin: "/admin/dashboard",
        employee: "/client/dashboard",
        departmenthead: "/department-head/dashboard",
      };
      router.replace(roleRedirects[role] ?? "/client/dashboard");
    }
  }, [router]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Render a lightweight placeholder while client-side session validation runs
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="animate-pulse rounded-lg bg-white/5 p-6">
          <div className="h-4 w-40 bg-white/10 mb-3" />
          <div className="h-3 w-32 bg-white/8" />
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_32%),linear-gradient(135deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))]" />
      <div className="absolute -left-24 top-14 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute right-10 top-24 h-72 w-72 rounded-full bg-white/5 blur-[120px]" />
      <div className="absolute bottom-16 left-1/3 h-48 w-48 rounded-full bg-white/5 blur-[110px]" />

      <aside
        className={cn(
          "fixed left-0 top-0 z-20 flex h-screen shrink-0 flex-col rounded-0 border-r border-white/10 bg-white/5 px-4 py-6 shadow-[30px_0_80px_rgba(0,0,0,0.45)] backdrop-blur",
          "transition-[width] duration-300",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-semibold text-white">
              I
            </div>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isCollapsed && "w-0",
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
                Probayo
              </p>
              <p className="text-xs text-zinc-500">It Staff</p>
            </div>
          </div>

          <nav className="mt-8 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 sidebar-scroll">
            <Link
              href="/it-staff/dashboard"
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                pathname === "/it-staff/dashboard"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5",
              )}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "transition-all duration-300",
                  isCollapsed && "w-0 overflow-hidden",
                )}
              >
                Dashboard
              </span>
            </Link>

            <Link
              href="/it-staff/tickets"
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                pathname.startsWith("/it-staff/tickets")
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5",
              )}
            >
              <TicketCheck className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "transition-all duration-300",
                  isCollapsed && "w-0 overflow-hidden",
                )}
              >
                Tickets
              </span>
            </Link>

            <Link
              href="/it-staff/assets"
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                pathname === "/it-staff/assets"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5",
              )}
            >
              <HardDrive className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "transition-all duration-300",
                  isCollapsed && "w-0 overflow-hidden",
                )}
              >
                Assets
              </span>
            </Link>

            <div className="relative">
              <Link
                href="/it-staff/notifications"
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                  pathname.startsWith("/it-staff/notifications")
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5",
                )}
              >
                <Bell className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "transition-all duration-300",
                    isCollapsed && "w-0 overflow-hidden",
                  )}
                >
                  Notifications
                </span>
                {unreadCount !== null && unreadCount > 0 ? (
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center justify-center rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white",
                      isCollapsed && "absolute -right-1 -top-1",
                    )}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            </div>

            <Link
              href="/it-staff/profile"
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                pathname === "/it-staff/profile"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5",
              )}
            >
              <User className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "transition-all duration-300",
                  isCollapsed && "w-0 overflow-hidden",
                )}
              >
                Profile
              </span>
            </Link>
          </nav>

          <div className="shrink-0 space-y-2 border-t border-white/10 pt-4">
            <div className="border-t border-white/5 pt-2 space-y-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/5"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5 shrink-0" />
                ) : (
                  <ChevronLeft className="h-5 w-5 shrink-0" />
                )}
                <span
                  className={cn(
                    "transition-all duration-300",
                    isCollapsed && "w-0 overflow-hidden",
                  )}
                >
                  Collapse
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/5"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "transition-all duration-300",
                    isCollapsed && "w-0 overflow-hidden",
                  )}
                >
                  Logout
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main
        className={cn(
          "relative z-10 h-screen overflow-hidden transition-[margin-left] duration-300",
          isCollapsed ? "ml-20" : "ml-64",
        )}
      >
        {/* Floating notification bell — bottom-right */}
        <div className="fixed bottom-6 right-6 z-40">
          <NotificationBellDropdown direction="up" basePath="/it-staff" />
        </div>

        <div className="h-full overflow-y-auto">
          <div className="px-6 py-6 sm:px-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
