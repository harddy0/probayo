import Link from "next/link";
import { ArrowRight, LifeBuoy, Ticket, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/client/tickets",
    label: "My Tickets",
    description: "Open, track, and update your IT support tickets.",
    icon: Ticket,
    accent: "text-sky-400",
    border: "border-sky-500/20",
    bg: "bg-sky-500/10",
  },
  {
    href: "/client/profile",
    label: "Profile",
    description: "Review and edit your account information.",
    icon: UserRound,
    accent: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
  },
];

export default function ClientDashboardPage() {
  return (
    <section className="flex h-full flex-col gap-4">
      {/* ── Compact header ── */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
          <LifeBuoy className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <p className="text-xs text-zinc-500">
            A quiet control surface for your support needs.
          </p>
        </div>
      </div>

      {/* ── Quick-links grid ── */}
      <div className="min-h-0 flex-1">
        <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="group block">
              <div className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]">
                <div className="space-y-3">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border",
                    link.bg, link.border,
                  )}>
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
