"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Building2,
  HardDrive,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  Tags,
  TicketCheck,
  UserRound,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api/auth";
import { getAuthSession } from "@/lib/api/client";
import { fetchUnreadCount } from "@/lib/api/notifications";
import AppShell, { type NavItem } from "@/components/layout/app-shell";

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldAlert },
  { href: "/admin/ticket-categories", label: "Ticket Categories", icon: Tags },
  { href: "/admin/known-issues", label: "Known Issues", icon: AlertTriangle },
  { href: "/admin/tickets", label: "Tickets", icon: TicketCheck },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, hasBadge: true },
  {
    href: "/admin/sla",
    label: "SLA",
    icon: ShieldCheck,
    isSubmenu: true,
    children: [
      { href: "/admin/sla-policies", label: "Policies" },
      { href: "/admin/sla-escalation-rules", label: "Escalation Rules" },
    ],
  },
  { href: "/admin/assets", label: "Assets", icon: HardDrive },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/profile", label: "Profile", icon: UserRound },
];

export default function AdminLayout({
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
    if (role === "admin") {
      setIsAuthorized(true);
      fetchUnreadCount()
        .then((count) => {
          if (mountedRef.current) setUnreadCount(count);
        })
        .catch(() => {});
    } else {
      router.replace("/client/dashboard");
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
      brandLetter="A"
      brandLabel="Admin"
      basePath="/admin"
      unreadCount={unreadCount}
      onLogout={handleLogout}
      isActive={(href) =>
        href === "/admin" ? pathname === href : pathname.startsWith(href)
      }
      activePathPatterns={{
        "/admin/sla": ["/admin/sla-policies", "/admin/sla-escalation-rules"],
      }}
    >
      {children}
    </AppShell>
  );
}
