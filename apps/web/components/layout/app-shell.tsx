"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hasBadge?: boolean;
} | {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isSubmenu: true;
  children: { href: string; label: string }[];
};

export interface AppShellProps {
  children: ReactNode;
  navItems: NavItem[];
  brandLetter: string;
  brandLabel: string;
  /** Base path for notification bell link, e.g. "/admin" */
  basePath: string;
  unreadCount: number | null;
  onLogout: () => void;
  /** Custom active-detection function per layout */
  isActive: (href: string) => boolean;
  /** For submenu items: check if any child is active */
  isSubmenuActive?: (children: { href: string }[]) => boolean;
  /** Declarative alternative to isSubmenuActive. Keyed by submenu href, values are path patterns.
   * Parent nav highlights when pathname starts with any of the patterns. */
  activePathPatterns?: Record<string, string[]>;
}

// ── Constants ──

const navLinkClass = (isActive: boolean) =>
  cn(
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
    isActive
      ? "bg-white/10 text-white shadow-sm"
      : "text-zinc-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-zinc-200",
  );

const iconClass = (isActive: boolean) =>
  cn(
    "h-4 w-4 shrink-0 transition-all duration-200",
    isActive ? "text-emerald-300" : "text-zinc-500 group-hover:text-zinc-300",
  );

// ── Component ──

export default function AppShell({
  children,
  navItems,
  brandLetter,
  brandLabel,
  basePath,
  unreadCount,
  onLogout,
  isActive: detectActive,
  isSubmenuActive,
  activePathPatterns,
}: AppShellProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Track open/closed state for each submenu by href
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleSubmenu = (href: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const isSubmenuOpen = (href: string) => openSubmenus[href] ?? true;

  const renderNavLink = (
    href: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    isItemActive: boolean,
    badge?: number | null,
  ) => (
    <Link
      key={href}
      href={href}
      onClick={() => setMobileOpen(false)}
      className={cn(navLinkClass(isItemActive), !isCollapsed && "pr-3", isCollapsed && "relative")}
    >
      <Icon className={iconClass(isItemActive)} />
      <span
        className={cn(
          "transition-all duration-300",
          isCollapsed && "w-0 overflow-hidden",
        )}
      >
        {label}
      </span>
      {badge !== null && badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "ml-auto inline-flex items-center justify-center rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white",
            isCollapsed && "absolute -right-1 -top-1",
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {isItemActive && !isCollapsed && (
        <div className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      )}
    </Link>
  );

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
        <Link href={`${basePath}/dashboard`} className="flex items-center gap-2 transition active:scale-95">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-[10px] font-bold text-white">
            {brandLetter}
          </div>
          <span className="text-sm font-medium text-zinc-300">{brandLabel}</span>
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
          "fixed left-0 top-0 z-30 flex h-screen shrink-0 flex-col border-r border-white/10 bg-white/5 shadow-2xl shadow-black/30 backdrop-blur-2xl transition-all duration-300 ease-out",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-6 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-sm font-bold text-white transition hover:bg-white/20">
              {brandLetter}
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
              <p className="text-[11px] text-zinc-500">{brandLabel}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5 sidebar-scroll">
            {navItems.map((item) => {
              if ("isSubmenu" in item && item.isSubmenu) {
                const submenuPatterns =
                  activePathPatterns?.[item.href];
                const parentActive = submenuPatterns
                  ? submenuPatterns.some((p) => pathname.startsWith(p))
                  : isSubmenuActive?.(item.children) ?? false;
                const submenuOpen = isSubmenuOpen(item.href);

                return (
                  <div key={item.href}>
                    <button
                      onClick={() => toggleSubmenu(item.href)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        parentActive
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-zinc-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-zinc-200",
                      )}
                    >
                      <item.icon className={iconClass(parentActive)} />
                      <span
                        className={cn(
                          "flex-1 text-left transition-all duration-300",
                          isCollapsed && "w-0 overflow-hidden",
                        )}
                      >
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-zinc-500 transition-transform duration-200",
                          submenuOpen && "rotate-180",
                          isCollapsed && "hidden",
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        submenuOpen && !isCollapsed
                          ? "mt-1 max-h-40 opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      <div className="ml-5 border-l border-white/10 pl-4">
                        {item.children.map((child) => {
                          const isChildActive = detectActive(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200",
                                isChildActive
                                  ? "bg-white/10 text-white shadow-sm"
                                  : "text-zinc-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-zinc-200",
                              )}
                            >
                              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                              <span>{child.label}</span>
                              {isChildActive && (
                                <div className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return renderNavLink(
                item.href,
                item.label,
                item.icon,
                detectActive(item.href),
                "hasBadge" in item && item.hasBadge ? unreadCount : null,
              );
            })}
          </nav>

          {/* Footer */}
          <div className="shrink-0 space-y-1 border-t border-white/10 px-3 py-4">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/5 hover:text-zinc-200"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 transition-all duration-200 group-hover:text-zinc-300" />
              ) : (
                <ChevronLeft className="h-4 w-4 shrink-0 text-zinc-500 transition-all duration-200 group-hover:text-zinc-300" />
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
              onClick={onLogout}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/5 hover:text-zinc-200"
            >
              <LogOut className="h-4 w-4 shrink-0 text-zinc-500 transition-all duration-200 group-hover:text-zinc-300" />
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
      </aside>

      {/* ── Main content ── */}
      <main
        className={cn(
          "relative h-screen overflow-hidden transition-[margin-left] duration-300",
          isCollapsed ? "lg:ml-20" : "lg:ml-64",
        )}
      >
        <NotificationBell basePath={basePath} />

        <div className="h-full overflow-y-auto">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 px-6 py-10 sm:px-8 lg:px-12 lg:py-14">
            {children}
          </div>
        </div>
      </main>

      {/* ── Animation keyframes ── */}
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

// ── Notification bell sub-component ──

import NotificationBellDropdown from "@/components/it-staff/notification-bell-dropdown";

function NotificationBell({ basePath }: { basePath: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <NotificationBellDropdown direction="up" basePath={basePath} />
    </div>
  );
}
