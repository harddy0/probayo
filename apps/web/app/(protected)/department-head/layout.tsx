"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  TicketCheck,
  UserRound,
} from "lucide-react";
import { fetchProfile, logout } from "@/lib/api/auth";
import { getAuthSession } from "@/lib/api/client";
import { fetchUnreadCount } from "@/lib/api/notifications";
import AppShell, { type NavItem } from "@/components/layout/app-shell";

const navItems: NavItem[] = [
  { href: "/department-head/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/department-head/tickets", label: "Tickets", icon: TicketCheck },
  { href: "/department-head/reports", label: "Reports", icon: BarChart3 },
  { href: "/department-head/notifications", label: "Notifications", icon: Bell, hasBadge: true },
  { href: "/department-head/profile", label: "Profile", icon: UserRound },
];

export default function DepartmentHeadLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    const normalizeRole = (r: string) =>
      String(r).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    const redirectForRole = (r: string) => {
      const roleRedirects: Record<string, string> = {
        admin: "/admin/dashboard",
        itstaff: "/it-staff/dashboard",
        employee: "/client/dashboard",
        departmenthead: "/department-head/dashboard",
      };
      router.replace(roleRedirects[r] ?? "/client/dashboard");
    };

    // Fast client-side check from session
    const sessionRole = normalizeRole(session.identity.role);
    if (sessionRole !== "departmenthead") {
      redirectForRole(sessionRole);
      return;
    }

    // Server-side verification — fetch profile to confirm the role matches
    // This prevents access via session storage tampering
    fetchProfile()
      .then((profile) => {
        if (!mountedRef.current) return;
        const profileRole = normalizeRole(profile.role);
        if (profileRole === "departmenthead") {
          setIsAuthorized(true);
          // Fire-and-forget unread count fetch after auth is confirmed
          fetchUnreadCount()
            .then((count) => {
              if (mountedRef.current) setUnreadCount(count);
            })
            .catch(() => {});
        } else {
          redirectForRole(profileRole);
        }
      })
      .catch(() => {
        // If profile fetch fails (e.g. network), fall back to session-based auth
        setIsAuthorized(true);
        fetchUnreadCount()
          .then((count) => {
            if (mountedRef.current) setUnreadCount(count);
          })
          .catch(() => {});
      });
  }, [router]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="animate-pulse rounded-lg bg-white/5 p-6">
          <div className="mb-3 h-4 w-40 bg-white/10" />
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
    <AppShell
      navItems={navItems}
      brandLetter="D"
      brandLabel="Dept. Head"
      basePath="/department-head"
      unreadCount={unreadCount}
      onLogout={handleLogout}
      isActive={(href) =>
        href === "/department-head" ? pathname === href : pathname.startsWith(href)
      }
    >
      {children}
    </AppShell>
  );
}
