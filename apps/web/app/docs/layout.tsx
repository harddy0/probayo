"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Code2,
  Cpu,
  Database,
  FileJson,
  LayoutDashboard,
  Menu,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/docs", label: "Overview", icon: BookOpen },
  { href: "/docs/architecture", label: "Architecture", icon: Cpu },
  { href: "/docs/modules", label: "Modules", icon: FileJson },
  { href: "/docs/api-reference", label: "API Reference", icon: Code2 },
  { href: "/docs/data-models", label: "Data Models", icon: Database },
  { href: "/docs/roles", label: "Roles & Permissions", icon: Shield },
];

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Ambient background ── */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.08),_transparent_35%),radial-gradient(circle_at_70%_80%,_rgba(255,255,255,0.04),_transparent_30%),linear-gradient(135deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))]" />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* ── Top bar (mobile) ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/docs" className="flex items-center gap-2 transition active:scale-95">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-[10px] font-bold text-white">
            P
          </div>
          <span className="text-sm font-medium text-zinc-300">Probayo</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-90"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </header>

      {/* ── Mobile backdrop ── */}
      <div
        className={cn(
          "fixed inset-0 z-20 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-white/5 shadow-2xl shadow-black/30 backdrop-blur-2xl transition-all duration-300 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-6 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-sm font-bold text-white transition hover:bg-white/20">
              P
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
                Probayo
              </p>
              <p className="text-[11px] text-zinc-500">Documentation</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-zinc-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-zinc-200",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-all duration-200",
                      isActive
                        ? "text-emerald-300"
                        : "text-zinc-500 group-hover:text-zinc-300",
                    )}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="shrink-0 border-t border-white/10 px-6 py-4">
            <Link
              href="/"
              className="group flex items-center gap-2 text-xs text-zinc-500 transition-all duration-200 hover:text-zinc-300"
            >
              <LayoutDashboard className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>Back to app</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="relative lg:ml-64">
        <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8 lg:px-12 lg:py-14">
          {/* Page transition wrapper */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </div>
      </main>

      {/* ── Tailwind `animate-in` shim — inject a small style block ── */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom-2 {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in.fade-in.slide-in-from-bottom-2 {
          animation: fade-in 0.4s ease-out, slide-in-from-bottom-2 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
