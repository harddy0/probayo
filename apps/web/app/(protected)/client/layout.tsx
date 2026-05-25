"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  UserRound,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import { getAuthSession } from "@/lib/api/client";
import { fetchUnreadCount } from "@/lib/api/notifications";
import AppShell, { type NavItem } from "@/components/layout/app-shell";

const navItems: NavItem[] = [
  { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/client/tickets", label: "Tickets", icon: Ticket },
  { href: "/client/profile", label: "Profile", icon: UserRound },
];

export default function ClientLayout({
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
      router.replace("/admin/dashboard");
    } else if (role === "itstaff") {
      router.replace("/it-staff/dashboard");
    } else {
      setIsAuthorized(true);
      fetchUnreadCount()
        .then((count) => {
          if (mountedRef.current) setUnreadCount(count);
        })
        .catch(() => {});
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
      brandLetter="P"
      brandLabel="Client"
      basePath="/client"
      unreadCount={unreadCount}
      onLogout={handleLogout}
      isActive={(href) => pathname === href}
    >
      {children}
    </AppShell>
  );
}
