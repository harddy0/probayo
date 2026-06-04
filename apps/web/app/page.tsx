import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  Headphones,
  Plus,
  Search,
  Shield,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "SLA Tracking",
    description:
      "Per-priority SLA policies with breach detection, escalation triggers, and deadline monitoring.",
  },
  {
    icon: Users,
    title: "Role-Based Dashboards",
    description:
      "Dedicated workspaces for Admins, IT Staff, and Employees. Each role gets a purpose-built interface.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description:
      "Alerts for ticket assignments, status changes, SLA warnings, and escalations.",
  },
  {
    icon: Shield,
    title: "Role-Gated Security",
    description:
      "JWT authentication backed by two-layer guards. Access control across endpoints and UI.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Analytics",
    description:
      "Insights into ticket volume, SLA compliance, team performance, and asset utilization.",
  },
];

const steps = [
  {
    number: "01",
    title: "Employee submits a ticket",
    description:
      "A team member creates a support request with priority level, category, and description.",
  },
  {
    number: "02",
    title: "IT staff claims & resolves",
    description:
      "Available tickets appear in the IT queue. Staff claim, acknowledge, and work through the status pipeline.",
  },
  {
    number: "03",
    title: "SLA enforcement monitors",
    description:
      "Every ticket has SLA deadlines computed from priority. Automated escalations trigger when time runs low.",
  },
  {
    number: "04",
    title: "Resolution & audit trail",
    description:
      "Every status change is recorded. Full comment and attachment history. Complete audit trail for compliance.",
  },
];

const stats = [
  { value: "3", label: "User roles", sub: "Admin · IT Staff · Employee" },
  { value: "16+", label: "API modules", sub: "RESTful endpoints" },
  { value: "6", label: "Ticket statuses", sub: "Full lifecycle pipeline" },
  { value: "4", label: "Priority levels", sub: "Critical to Low" },
];

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
            <Link
              href="/docs"
              className="hidden sm:inline-flex h-9 items-center justify-center rounded-xl px-4 text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
            >
              Docs
            </Link>
          </nav>
        </header>

        {/* ── Hero section ── */}
        <section className="flex min-h-0 flex-1 items-center py-16 lg:py-20">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            {/* Left content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Enterprise IT support platform
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                IT ticketing platform for
                <br />
                <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  modern IT teams
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
                Ticket tracking, real-time SLA monitoring, and a unified workspace
                for your entire IT organization.
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

            {/* Right visual - Mock Dashboard */}
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

        {/* ── Stats Bar ── */}
        <section className="border-y border-white/[0.06] py-10">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-semibold tracking-tight text-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-300">{stat.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features Section ── */}
        <section className="py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium text-zinc-300">
              <Zap className="h-3 w-3 text-amber-300" />
              Everything you need
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Built for IT teams that move fast
            </h2>
            <p className="mt-3 text-base text-zinc-400">
              From ticket creation to resolution, Probayo gives your team the tools
              to handle support at scale.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-white/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-white/10 group-hover:text-white">
                  <feature.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-zinc-200 transition-colors duration-200 group-hover:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400 transition-colors duration-200 group-hover:text-zinc-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium text-zinc-300">
              <Plus className="h-3 w-3 text-emerald-300" />
              Simple workflow
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              From ticket to resolution in four steps
            </h2>
            <p className="mt-3 text-base text-zinc-400">
              A streamlined process designed to minimize friction at every stage.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.number} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-white/20 to-transparent md:block" />
                )}
                <div className="relative flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-bold tracking-tight text-zinc-400 transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/10 hover:text-white">
                    {step.number}
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-zinc-200">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features Deep-Dive (Alternating Rows) ── */}
        <section className="border-t border-white/[0.06] py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium text-zinc-300">
              <Search className="h-3 w-3 text-sky-300" />
              Deep dive
            </div>              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Core capabilities
              </h2>
              <p className="mt-3 text-base text-zinc-400">
                Probayo is built for real-world IT operations.
              </p>
          </div>

          <div className="mt-12 space-y-16">
            {/* Row 1 */}
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="order-2 md:order-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  Core
                </div>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  Three distinct dashboards, one platform
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Each role — Admin, IT Staff, and Employee — gets a purpose-built
                  interface. Admins manage the system, IT staff handle tickets, and
                  employees track their own requests. No clutter, no confusion.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    "Admin: user management, SLA config, system oversight",
                    "IT Staff: ticket queue, asset management, known issues",
                    "Employee: ticket creation, status tracking, history",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 md:order-2">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-rose-500/10 px-4 py-3">
                      <Shield className="h-5 w-5 text-rose-400" />
                      <div>
                        <p className="text-sm font-medium text-rose-200">Admin Dashboard</p>
                        <p className="text-xs text-rose-400/80">Full system access</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-sky-500/10 px-4 py-3">
                      <Headphones className="h-5 w-5 text-sky-400" />
                      <div>
                        <p className="text-sm font-medium text-sky-200">IT Staff Dashboard</p>
                        <p className="text-xs text-sky-400/80">Ticket operations</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-emerald-500/10 px-4 py-3">
                      <Users className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-emerald-200">Employee Dashboard</p>
                        <p className="text-xs text-emerald-400/80">Self-service portal</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="order-2 md:order-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-300">
                  SLA
                </div>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  Automated SLA engine with escalation
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Configure per-priority SLA policies with acknowledgement and
                  resolution deadlines. A cron-based engine monitors every ticket,
                  triggers escalations on breach, and dispatches notifications.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    "Per-priority SLA policies (Critical / High / Medium / Low)",
                    "Automatic deadline computation on ticket creation",
                    "Escalation rules with role-targeted notifications",
                    "Real-time SLA timer visible in ticket views",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 md:order-1">
                <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-6">
                  <div className="space-y-3">
                    {[
                      { priority: "Critical", ack: "15 min", res: "1 hour" },
                      { priority: "High", ack: "30 min", res: "4 hours" },
                      { priority: "Medium", ack: "2 hours", res: "8 hours" },
                      { priority: "Low", ack: "8 hours", res: "24 hours" },
                    ].map((sla) => (
                      <div
                        key={sla.priority}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-zinc-500" />
                          <span className="text-sm font-medium text-zinc-200">{sla.priority}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span>Ack: {sla.ack}</span>
                          <span className="text-zinc-700">|</span>
                          <span>Res: {sla.res}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-8 py-16 text-center sm:px-16">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 transition-opacity" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready to streamline your IT support?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-zinc-400">
              Get started with Probayo and give your team the tools they need to
              resolve tickets faster, meet SLAs, and keep everyone productive.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-zinc-950 shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-zinc-100"
              >
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 px-6 text-sm font-medium text-zinc-300 transition hover:-translate-y-0.5 hover:border-white/20 hover:text-white"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="flex shrink-0 items-center justify-between border-t border-white/10 py-5 text-xs text-zinc-600">
          <span>&copy; {new Date().getFullYear()} Probayo. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="transition hover:text-zinc-400">
              Documentation
            </Link>
            <span className="transition hover:text-zinc-400">Privacy</span>
            <span className="transition hover:text-zinc-400">Terms</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
