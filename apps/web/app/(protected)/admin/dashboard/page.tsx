import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock,
  Layers,
  Monitor,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/admin/users",
    label: "Users",
    description: "Manage accounts, roles, and access.",
    icon: Users,
    accent: "text-sky-400",
    border: "border-sky-500/20",
    bg: "bg-sky-500/10",
  },
  {
    href: "/admin/departments",
    label: "Departments",
    description: "Create and organize departments.",
    icon: Layers,
    accent: "text-violet-400",
    border: "border-violet-500/20",
    bg: "bg-violet-500/10",
  },
  {
    href: "/admin/assets",
    label: "Assets",
    description: "Track and assign IT equipment.",
    icon: Monitor,
    accent: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
  },
  {
    href: "/admin/ticket-categories",
    label: "Categories",
    description: "Configure ticket categories.",
    icon: BarChart3,
    accent: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/10",
  },
  {
    href: "/admin/known-issues",
    label: "Known Issues",
    description: "Track known problems and solutions.",
    icon: AlertTriangle,
    accent: "text-rose-400",
    border: "border-rose-500/20",
    bg: "bg-rose-500/10",
  },
  {
    href: "/admin/sla-policies",
    label: "SLA Policies",
    description: "Set response and resolution targets.",
    icon: Clock,
    accent: "text-indigo-400",
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/10",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    description: "Review system-wide activity trail.",
    icon: ShieldAlert,
    accent: "text-rose-400",
    border: "border-rose-500/20",
    bg: "bg-rose-500/10",
  },
  {
    href: "/admin/profile",
    label: "Profile",
    description: "Update your account settings.",
    icon: Settings,
    accent: "text-zinc-400",
    border: "border-white/10",
    bg: "bg-white/5",
  },
];

export default function AdminDashboardPage() {
  return (
    <section className="flex h-full flex-col gap-4">
      {/* ── Compact header ── */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <p className="text-xs text-zinc-500">
            Overview and management tools for the system.
          </p>
        </div>
      </div>

      {/* ── Quick-links grid (fills remaining height) ── */}
      <div className="min-h-0 flex-1">
        <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="group block">
              <div className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]">
                <div className="space-y-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border",
                      link.bg,
                      link.border,
                    )}
                  >
                    <link.icon className={cn("h-4 w-4", link.accent)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-white">
                      {link.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                      {link.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-medium text-zinc-500 transition group-hover:text-zinc-300">
                  Open
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
