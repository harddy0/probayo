import Link from "next/link";

export default async function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      {/* ── Ambient background layers ── */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(255,255,255,0.12),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(255,255,255,0.06),_transparent_28%),linear-gradient(135deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))]" />
      <div className="absolute left-1/4 top-8 h-64 w-64 rounded-full bg-white/[0.04] blur-[140px]" />
      <div className="absolute right-1/3 top-1/3 h-80 w-80 rounded-full bg-white/[0.03] blur-[160px]" />
      <div className="absolute bottom-0 left-1/5 h-48 w-48 rounded-full bg-white/[0.03] blur-[100px]" />

      {/* ── Subtle grid overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 sm:px-8 lg:px-12">
        {/* ── Top bar ── */}
        <header className="flex shrink-0 items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-sm font-bold tracking-tight text-white">
              P
            </div>
            <span className="text-sm font-medium tracking-tight text-zinc-300">
              Probayo
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-zinc-200 shadow-sm transition hover:bg-white/15 hover:text-white"
            >
              Get started
            </Link>
          </nav>
        </header>

        {/* ── Hero section ── */}
        <section className="flex min-h-0 flex-1 items-center">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            {/* Left content */}
            <div className="max-w-xl py-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Enterprise IT support platform
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Intelligent ticketing for
                <br />
                <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  modern IT teams
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
                Streamline support operations with smart ticket routing, real-time
                SLA tracking, and a unified workspace for your entire IT
                organization.
              </p>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-zinc-950 shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-zinc-100"
                >
                  Access dashboard
                </Link>
            <Link
              href="/docs"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 px-6 text-sm font-medium text-zinc-300 transition hover:-translate-y-0.5 hover:border-white/20 hover:text-white"
            >
              View documentation
            </Link>
              </div>

              {/* Trust bar */}
              <div className="mt-10 flex items-center gap-6 text-xs text-zinc-600">
                <span className="uppercase tracking-[0.15em]">Powered by</span>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-zinc-400">
                    P
                  </div>
                  <span className="text-zinc-500">Probayo</span>
                </div>
              </div>
            </div>

            {/* Right visual */}
            <div className="hidden lg:block">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl">
                {/* Decorative header */}
                <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                  <span className="ml-3 text-xs text-zinc-600">dashboard.probayo.io</span>
                </div>

                {/* Mock dashboard content */}
                <div className="space-y-4 p-6">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Open tickets", value: "24", color: "text-emerald-300" },
                      { label: "SLA breaches", value: "3", color: "text-rose-300" },
                      { label: "Avg response", value: "4.2m", color: "text-sky-300" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                          {stat.label}
                        </p>
                        <p className={`mt-1 text-xl font-semibold ${stat.color}`}>
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Ticket list mock */}
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                      Recent tickets
                    </p>
                    {[
                      { title: "VPN access not working", priority: "High", status: "Open" },
                      { title: "Printer offline — Floor 3", priority: "Medium", status: "In progress" },
                      { title: "New employee onboarding", priority: "Low", status: "Resolved" },
                    ].map((ticket) => (
                      <div
                        key={ticket.title}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5"
                      >
                        <p className="text-sm text-zinc-200">{ticket.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                            {ticket.priority}
                          </span>
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="flex shrink-0 items-center justify-between border-t border-white/10 py-5 text-xs text-zinc-600">
          <span>&copy; {new Date().getFullYear()} Probayo. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <span className="transition hover:text-zinc-400">Privacy</span>
            <span className="transition hover:text-zinc-400">Terms</span>
            <span className="transition hover:text-zinc-400">Contact</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
