import { Cpu, Layers, Server, Workflow } from "lucide-react";

const sections = [
  {
    icon: Layers,
    title: "Monorepo Structure (Turborepo)",
    content: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          The project is organized as a Turborepo monorepo with two main applications:
        </p>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-200 hover:border-white/30 hover:shadow-lg hover:shadow-white/5">
          <pre className="overflow-x-auto p-4 text-sm text-zinc-300"><code>{`probayo/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   │   ├── app/      # App Router pages & layouts
│   │   ├── components/ # Reusable UI components
│   │   └── lib/      # API client, types, utils
│   └── api/          # NestJS backend
│       ├── src/
│       │   ├── modules/   # Feature modules
│       │   ├── prisma/    # Database service
│       │   └── queues/    # Bull queue processors
│       └── prisma/
│           └── schema.prisma
├── packages/         # Shared configs & types
└── turbo.json        # Pipeline configuration`}</code></pre>
        </div>
      </div>
    ),
  },
  {
    icon: Server,
    title: "Backend Architecture (NestJS)",
    content: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          The API follows NestJS conventions: controllers handle HTTP requests, services
          contain business logic, and Prisma provides database access. Authentication is
          JWT-based with role guards protecting sensitive endpoints.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-md hover:shadow-white/5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Request Flow
            </h4>
            <div className="mt-3 space-y-1.5 text-sm text-zinc-400">
              {[
                "1. Client → REST API",
                "2. JwtAuthGuard (validate token)",
                "3. RolesGuard (check permissions)",
                "4. Controller (route handler)",
                "5. Service (business logic)",
                "6. PrismaService (database)",
              ].map((step) => (
                <p key={step} className="transition-colors hover:text-zinc-300">
                  {step}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-md hover:shadow-white/5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Key Components
            </h4>
            <div className="mt-3 space-y-1.5 text-sm text-zinc-400">
              {[
                "Controllers (16 total)",
                "Services (21 total)",
                "Guards (JWT, Roles, ActiveUser)",
                "DTOs (30+ validation schemas)",
                "Bull queues (FILES, MAIL, NOTIFICATIONS)",
                "Swagger/OpenAPI docs",
              ].map((item) => (
                <p key={item} className="transition-colors hover:text-zinc-300">
                  • {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Workflow,
    title: "Frontend Architecture (Next.js)",
    content: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          The frontend uses Next.js 16 App Router with route groups for role-based sections.
          Each user role (Admin, IT Staff, Employee) has its own layout, sidebar, and
          protected pages. The API client layer centralizes all backend communication.
        </p>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-200 hover:border-white/30 hover:shadow-lg hover:shadow-white/5">
          <pre className="overflow-x-auto p-4 text-sm text-zinc-300"><code>{`app/
├── page.tsx              # Landing page (public)
├── login/                # Authentication (public)
├── docs/                 # Documentation (public)
└── (protected)/          # Authenticated routes
    ├── layout.tsx        # Session validation
    ├── admin/            # Admin dashboard
    ├── it-staff/         # IT staff dashboard
    └── client/           # Employee dashboard`}</code></pre>
        </div>
      </div>
    ),
  },
];

export default function ArchitecturePage() {
  return (
    <div className="space-y-14">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3.5 py-1 text-xs font-medium text-sky-300 transition hover:border-sky-500/40 hover:bg-sky-500/15">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          System design
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Architecture
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          An overview of the project structure, design decisions, and the data flow between frontend and backend.
        </p>
      </div>

      {sections.map((section, i) => (
        <section key={section.title} className="scroll-mt-20">
          <div className="group flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-white/30 group-hover:bg-white/10 group-hover:text-white">
              <section.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            </div>
            <h2 className="text-lg font-semibold text-white transition-colors duration-200 group-hover:text-zinc-100">
              {section.title}
            </h2>
          </div>
          <div
            className="mt-4 transition-all duration-300"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {section.content}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/20 sm:p-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          <Cpu className="h-4 w-4" />
          Key Design Decisions
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-400">
          {[
            {
              title: "Role-based layouts",
              desc: "Instead of a single dashboard with role-based feature gating, each role has its own dedicated layout and pages. This provides a cleaner separation of concerns and allows each role's UI to be independently developed and tested.",
            },
            {
              title: "Async file uploads",
              desc: "File attachments are processed asynchronously via Bull queues. The client uploads to the API, which enqueues a job for processing (virus scan, thumbnail generation, S3 sync), and the client polls for completion.",
            },
            {
              title: "SLA engine",
              desc: "A cron-based service checks ticket deadlines against SLA policy thresholds. When a breach is detected, an escalation event is created and notifications are dispatched to the appropriate roles.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.02]">
              <strong className="text-zinc-200">{item.title}:</strong>{" "}
              <span className="text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
