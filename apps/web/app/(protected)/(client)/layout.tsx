"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
              P
            </div>
            <div
              className={cn(
                "flex flex-col transition-opacity",
                isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100",
              )}
            >
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">Client</span>
              <span className="text-sm font-semibold text-white">Probayo</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed((current) => !current)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-zinc-200 transition hover:bg-white/20"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="mt-8 space-y-2">
            <Link
              href="/client"
              className={cn(
                "group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold transition",
                pathname === "/client"
                  ? "border-white/15 bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-zinc-300 hover:border-white/10 hover:bg-white/10 hover:text-white",
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className={cn(isCollapsed && "sr-only")}>Dashboard</span>
            </Link>
            <Link
              href="/client/profile"
              className={cn(
                "group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold transition",
                pathname?.startsWith("/client/profile")
                  ? "border-white/15 bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-zinc-300 hover:border-white/10 hover:bg-white/10 hover:text-white",
              )}
            >
              <UserRound className="h-4 w-4" />
              <span className={cn(isCollapsed && "sr-only")}>Profile</span>
            </Link>
          </nav>

          <div className="mt-auto">
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/20",
                isCollapsed && "justify-center",
              )}
            >
              <LogOut className="h-4 w-4" />
              <span className={cn(isCollapsed && "sr-only")}>Logout</span>
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <div className="h-full rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
