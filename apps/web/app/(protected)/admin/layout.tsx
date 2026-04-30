"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Building2,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import { getAuthSession } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    // Only Admin role can access admin routes
    if (session?.identity.role === "Admin") {
      setIsAuthorized(true);
    } else {
      // Redirect non-admin users to client dashboard
      router.replace("/client/dashboard");
    }
  }, [router]);

  if (!isAuthorized) {
    return null;
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

      <div className="relative z-10 flex w-full gap-6 px-4 py-6 sm:px-6">
        <aside
          className={cn(
            "sticky top-6 flex h-[calc(100vh-3rem)] shrink-0 flex-col rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur",
            "transition-[width] duration-300",
            isCollapsed ? "w-20" : "w-64",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-semibold text-white">
              A
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
              <p className="text-xs text-zinc-500">Admin</p>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-2">
            <Link
              href="/admin/dashboard"
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                pathname === "/admin/dashboard"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5",
              )}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span className={cn("transition-all duration-300", isCollapsed && "w-0 overflow-hidden")}>
                Dashboard
              </span>
            </Link>

            <Link
              href="/admin/departments"
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                pathname === "/admin/departments"
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5",
              )}
            >
              <Building2 className="h-5 w-5 shrink-0" />
              <span className={cn("transition-all duration-300", isCollapsed && "w-0 overflow-hidden")}>
                Departments
              </span>
            </Link>
          </nav>

          <div className="space-y-2 border-t border-white/10 pt-4">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/5"
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5 shrink-0" />
              ) : (
                <ChevronLeft className="h-5 w-5 shrink-0" />
              )}
              <span className={cn("transition-all duration-300", isCollapsed && "w-0 overflow-hidden")}>
                Collapse
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/5"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className={cn("transition-all duration-300", isCollapsed && "w-0 overflow-hidden")}>
                Logout
              </span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
