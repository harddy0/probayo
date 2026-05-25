"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  HardDrive,
  LayoutDashboard,
  TicketCheck,
  User,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import { getAuthSession } from "@/lib/api/client";
import { fetchUnreadCount } from "@/lib/api/notifications";
import AppShell, { type NavItem } from "@/components/layout/app-shell";

const navItems: NavItem[] = [
  { href: "/it-staff/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/it-staff/tickets", label: "Tickets", icon: TicketCheck },
  { href: "/it-staff/assets", label: "Assets", icon: HardDrive },
  { href: "/it-staff/notifications", label: "Notifications", icon: Bell, hasBadge: true },
  { href: "/it-staff/profile", label: "Profile", icon: User },
];

export default function ItStaffLayout({
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
        .catch(() => {});
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
      brandLetter="I"
      brandLabel="IT Staff"
      basePath="/it-staff"
      unreadCount={unreadCount}
      onLogout={handleLogout}
      isActive={(href) =>
        href === "/it-staff" ? pathname === href : pathname.startsWith(href)
      }
    >
      {children}
    </AppShell>
  );
}
