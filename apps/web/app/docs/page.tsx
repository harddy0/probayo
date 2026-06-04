import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Code2,
  Cpu,
  Database,
  FileJson,
  Shield,
  BarChart3,
  GitBranch,
  Layers,
  Server,
  Zap,
} from "lucide-react";

const quickLinks = [
  {
    href: "/docs/architecture",
    label: "Architecture",
    desc: "Tech stack, monorepo structure, and system design",
    icon: Cpu,
    color: "text-cyan-300",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/10",
  },
  {
    href: "/docs/modules",
    label: "Modules",
    desc: "13 NestJS feature modules with controllers, services, and endpoints",
    icon: Layers,
    color: "text-indigo-300",
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/10",
  },
  {
    href: "/docs/api-reference",
    label: "API Reference",
    desc: "Complete REST API — 50+ endpoints across 12 resource groups",
    icon: Code2,
    color: "text-sky-300",
    border: "border-sky-500/20",
    bg: "bg-sky-500/10",
  },
  {
    href: "/docs/data-models",
    label: "Data Models",
    desc: "7 core Prisma models, 6 enums, and their relationships",
    icon: Database,
    color: "text-emerald-300",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
  },
  {
    href: "/docs/roles",
    label: "Roles & Permissions",
    desc: "3 user roles with dedicated dashboards and API access matrix",
    icon: Shield,
    color: "text-violet-300",
    border: "border-violet-500/20",
    bg: "bg-violet-500/10",
  },
];

const techStack = [
  {
    title: "Frontend",
    items: [
      "Next.js 16 (App Router)",
      "React 19",
      "TypeScript",
      "Tailwind CSS v3",
      "Lucide React (icons)",
      "Radix UI (select, slot)",
    ],
  },
  {
    title: "Backend",
    items: [
      "NestJS (Node.js)",
      "TypeScript",
      "Prisma ORM",
      "MySQL",
      "Redis + Bull (queues)",
      "Swagger / OpenAPI",
    ],
  },
  {
    title: "Infrastructure",
    items: [
      "Turborepo (monorepo)",
      "Docker",
      "JWT authentication",
      "Rate limiting (throttler)",
      "Bull Board (queue UI)",
    ],
  },
  {
    title: "Features",
    items: [
      "Role-based dashboards (3 roles)",
      "SLA tracking & escalation",
      "Real-time notifications",
      "File attachments (async uploads)",
      "Batch operations & known issues",
    ],
  },
];

const milestones = [
  {
    icon: Server,
    label: "Controllers",
    value: "16",
    desc: "REST controllers",
  },
  {
    icon: Zap,
    label: "Services",
    value: "21",
    desc: "Business logic services",
  },
  {
    icon: BarChart3,
    label: "Endpoints",
    value: "50+",
    desc: "RESTful API endpoints",
  },
  {
    icon: GitBranch,
    label: "Queues",
    value: "3",
    desc: "Bull background queues",
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-16">
      {/* ── Hero ── */}
      <section>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/15">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Full-stack portfolio project
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Probayo — IT Support Platform
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
          Probayo is a full-stack IT ticketing and asset management platform built
          with modern technologies. It supports <strong className="font-semibold text-zinc-200">three user roles</strong> —{" "}
          <strong className="font-semibold text-zinc-200">Admin</strong>,{" "}
          <strong className="font-semibold text-zinc-200">IT Staff</strong>, and{" "}
          <strong className="font-semibold text-zinc-200">Employee</strong> — with
          role-specific dashboards, real-time SLA tracking, escalation rules, file
          attachments, and a queue-driven background job system.
        </p>

        {/* Stats counters */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {milestones.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-2">
                <m.icon className="h-4 w-4 text-zinc-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {m.label}
                </span>
              </div>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
                {m.value}
              </p>
              <p className="text-[11px] text-zinc-600">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick links grid ── */}
      <section>
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Explore the docs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-white/5"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${link.border} ${link.bg} ${link.color} transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-110`}
                >
                  <link.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-200 transition-colors duration-200 group-hover:text-white">
                      {link.label}
                    </h3>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 transition-colors duration-200 group-hover:text-zinc-400">
                    {link.desc}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Architecture overview ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/20 sm:p-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          <GitBranch className="h-4 w-4" />
          Project Structure
        </h2>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-zinc-300">Monorepo (Turborepo)</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-200 hover:border-white/30 hover:shadow-lg hover:shadow-white/5">
              <pre className="overflow-x-auto p-4 text-sm text-zinc-300"><code>{`probayo/
├── apps/
│   ├── web/        # Next.js 16
│   └── api/        # NestJS
├── packages/       # Shared configs
└── turbo.json      # Pipeline`}</code></pre>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">Frontend (App Router)</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-200 hover:border-white/30 hover:shadow-lg hover:shadow-white/5">
              <pre className="overflow-x-auto p-4 text-sm text-zinc-300"><code>{`app/
├── page.tsx           # Landing
├── login/             # Auth
├── docs/              # Docs
└── (protected)/
    ├── admin/         # Admin UI
    ├── it-staff/      # IT Staff UI
    └── client/        # Employee UI`}</code></pre>
            </div>
          </div>
        </div>

        {/* Request flow diagram */}
        <div className="mt-8">
          <p className="text-sm font-medium text-zinc-300">Request Lifecycle</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {[
              { label: "Client", desc: "Browser / cURL" },
              { label: "JWT Guard", desc: "Token validation" },
              { label: "Roles Guard", desc: "Permission check" },
              { label: "Controller", desc: "Route handler" },
              { label: "Service", desc: "Business logic" },
              { label: "Prisma / DB", desc: "Data access" },
            ].map((step, i) => (
              <div
                key={step.label}
                className="relative rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06]"
              >
                {i < 5 ? (
                  <div className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-zinc-700 md:block">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                ) : null}
                <p className="text-xs font-semibold text-zinc-200">{step.label}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech stack summary ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/20 sm:p-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          <BookOpen className="h-4 w-4" />
          Tech Stack at a Glance
        </h2>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {techStack.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="group flex items-center gap-2 text-sm text-zinc-400 transition-all duration-200 hover:translate-x-1 hover:text-zinc-300"
                  >
                    <div className="h-1 w-1 shrink-0 rounded-full bg-zinc-600 transition-all duration-200 group-hover:h-1.5 group-hover:w-1.5 group-hover:bg-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick start ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/20 sm:p-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          <Zap className="h-4 w-4" />
          Quick Start
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Frontend
            </h3>
            <div className="mt-3 overflow-hidden rounded-lg bg-zinc-900">
              <pre className="overflow-x-auto p-3 text-sm text-zinc-300"><code>{`cd apps/web
npm install
npm run dev`}</code></pre>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Runs on port 3000</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Backend
            </h3>
            <div className="mt-3 overflow-hidden rounded-lg bg-zinc-900">
              <pre className="overflow-x-auto p-3 text-sm text-zinc-300"><code>{`cd apps/api
npm install
npx prisma migrate dev
npm run start:dev`}</code></pre>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Runs on port 3001</p>
          </div>
        </div>
      </section>
    </div>
  );
}
