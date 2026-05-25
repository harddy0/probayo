import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Code2,
  Cpu,
  Database,
  FileJson,
  Shield,
} from "lucide-react";

const quickLinks = [
  {
    href: "/docs/architecture",
    label: "Architecture",
    desc: "Tech stack, system design, and project structure",
    icon: Cpu,
  },
  {
    href: "/docs/modules",
    label: "Modules",
    desc: "NestJS module breakdown and responsibilities",
    icon: FileJson,
  },
  {
    href: "/docs/api-reference",
    label: "API Reference",
    desc: "Complete REST API endpoint documentation",
    icon: Code2,
  },
  {
    href: "/docs/data-models",
    label: "Data Models",
    desc: "Prisma schema, entities, and relationships",
    icon: Database,
  },
  {
    href: "/docs/roles",
    label: "Roles & Permissions",
    desc: "User roles, access control, and authorization",
    icon: Shield,
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

export default function DocsPage() {
  return (
    <div className="space-y-16">
      {/* ── Hero ── */}
      <section>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/15">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Portfolio project documentation
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Probayo — IT Support Platform
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
          Probayo is a full-stack IT ticketing and asset management platform built
          with modern technologies. It supports three user roles — <strong className="font-semibold text-zinc-200">Admin</strong>,{" "}
          <strong className="font-semibold text-zinc-200">IT Staff</strong>, and <strong className="font-semibold text-zinc-200">Employee</strong> — with role-specific
          dashboards, real-time SLA tracking, escalation rules, file attachments,
          and a queue-driven background job system.
        </p>

        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
          This documentation covers the full system architecture, API contracts,
          data models, and module breakdown. Use the sidebar or the quick links
          below to navigate.
        </p>
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-white/10 group-hover:text-white">
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

      {/* ── Tech stack summary ── */}
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
    </div>
  );
}
