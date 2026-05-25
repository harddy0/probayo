import { FileJson, Box, Cpu, Bell, Shield, Users, Database, Mail, HardDrive, AlertTriangle, Clock, MessageSquare, Paperclip } from "lucide-react";

const modules = [
  {
    icon: Users,
    name: "UsersModule",
    path: "users/",
    description: "User management — CRUD operations, password reset, and status toggling. Admin-only for most endpoints.",
    controllers: ["UsersController"],
    services: ["UsersService"],
    endpoints: [
      "GET /users — List all users",
      "POST /users — Create a user",
      "GET /users/:id — Get user by ID",
      "PATCH /users/:id — Update a user",
      "DELETE /users/:id — Delete a user",
      "POST /users/:id/reset-password — Reset password to default",
      "PATCH /users/:id/status — Toggle active status",
    ],
  },
  {
    icon: Shield,
    name: "AuthModule",
    path: "auth/",
    description: "Authentication and session management. Uses JWT tokens with local and bearer strategies.",
    controllers: ["AuthController"],
    services: ["AuthService"],
    endpoints: [
      "POST /auth/login — Authenticate & receive JWT",
      "POST /auth/logout — Invalidate session",
      "GET /auth/profile — Get current user profile",
      "POST /auth/change-password — Update password",
    ],
  },
  {
    icon: Box,
    name: "TicketsModule",
    path: "tickets/",
    description: "The core module. Handles ticket CRUD, assignment, comments, attachments, categories, and known issues linking.",
    controllers: ["TicketsController", "CategoriesController"],
    services: ["TicketsService", "CategoriesService"],
    endpoints: [
      "GET /tickets — List tickets (role-filtered)",
      "POST /tickets — Create a ticket",
      "GET /tickets/:id — Get ticket details",
      "PATCH /tickets/:id — Update a ticket",
      "DELETE /tickets/:id — Close/delete a ticket",
      "POST /tickets/:id/assign/:userId — Assign to IT staff",
      "POST /tickets/:id/unassign — Unassign ticket",
      "POST /tickets/:ticketId/comments — Add comment",
      "GET /tickets/:ticketId/comments — Get comments",
      "POST /tickets/bulk-attach-issue — Bulk attach to known issue",
    ],
  },
  {
    icon: Database,
    name: "DepartmentsModule",
    path: "departments/",
    description: "Organizational unit management. Admins can create, update, and delete departments.",
    controllers: ["DepartmentsController"],
    services: ["DepartmentsService"],
    endpoints: [
      "GET /departments — List all departments",
      "POST /departments — Create a department",
      "GET /departments/:id — Get department details",
      "PATCH /departments/:id — Update a department",
      "DELETE /departments/:id — Delete a department",
    ],
  },
  {
    icon: HardDrive,
    name: "AssetsModule",
    path: "assets/",
    description: "IT asset tracking. Admins and IT staff can manage hardware inventory.",
    controllers: ["AssetsController"],
    services: ["AssetsService"],
    endpoints: [
      "GET /assets — List all assets",
      "POST /assets — Create an asset",
      "GET /assets/:id — Get asset details",
      "PATCH /assets/:id — Update an asset",
      "DELETE /assets/:id — Delete an asset",
    ],
  },
  {
    icon: Clock,
    name: "SlaModule",
    path: "sla/",
    description: "SLA policy management, escalation rules, and the cron-based SLA enforcement engine.",
    controllers: ["SlaController", "EscalationRulesController"],
    services: ["SlaService", "EscalationRulesService", "SlaCronService", "SlaEscalationService"],
    endpoints: [
      "GET /sla-policies — List all SLA policies",
      "POST /sla-policies — Create a policy",
      "GET /sla-policies/:id — Get policy details",
      "PATCH /sla-policies/:id — Update a policy",
      "GET /sla-policies/priority/:priority — Get by priority",
      "GET /sla-escalation-rules — List escalation rules",
      "GET /sla-escalation-rules/:id — Get rule details",
      "PATCH /sla-escalation-rules/:id — Update a rule",
    ],
  },
  {
    icon: AlertTriangle,
    name: "KnownIssuesModule",
    path: "known-issues/",
    description: "Manage recurring or widespread issues that can be linked to multiple tickets.",
    controllers: ["KnownIssuesController"],
    services: ["KnownIssuesService"],
    endpoints: [
      "GET /known-issues — List all known issues",
      "POST /known-issues — Create a known issue",
      "GET /known-issues/:id — Get details",
      "PATCH /known-issues/:id — Update",
      "DELETE /known-issues/:id — Delete",
    ],
  },
  {
    icon: Bell,
    name: "NotificationsModule",
    path: "notifications/",
    description: "In-app and email notifications triggered by ticket events, SLA breaches, and escalations.",
    controllers: ["NotificationsController"],
    services: ["NotificationsService"],
    endpoints: [
      "GET /notifications — List user's notifications",
      "GET /notifications/unread-count — Unread count",
      "GET /notifications/:id — Get notification details",
      "PUT /notifications/:id/seen — Mark as seen",
    ],
  },
  {
    icon: MessageSquare,
    name: "CommentsModule",
    path: "comments/",
    description: "Standalone comments module (separate from ticket-specific comment endpoints).",
    controllers: ["CommentsController"],
    services: ["CommentsService"],
    endpoints: [
      "POST /comments — Create a comment",
      "GET /comments/ticket/:ticketId — Get comments",
      "GET /comments/:id — Get by ID",
      "PATCH /comments/:id — Update",
      "DELETE /comments/:id — Delete",
    ],
  },
  {
    icon: Paperclip,
    name: "AttachmentsModule",
    path: "attachments/",
    description: "Async file uploads using Bull queues. Supports both ticket and comment attachments with S3/local storage.",
    controllers: ["AttachmentsController"],
    services: ["AttachmentsService", "LocalStorageService", "S3StorageService"],
    endpoints: [
      "POST /attachments/tickets/:ticketId — Upload to ticket (async)",
      "GET /attachments/tickets/:ticketId — List ticket attachments",
      "POST /attachments/comments/:commentId — Upload to comment (async)",
      "GET /attachments/comments/:commentId — List comment attachments",
    ],
  },
  {
    icon: Mail,
    name: "MailModule",
    path: "mail/",
    description: "Email dispatch for notifications and scheduled reports.",
    controllers: ["MailController"],
    services: ["MailService"],
    endpoints: [
      "POST /mail — Send email (via queue)",
    ],
  },
  {
    icon: Cpu,
    name: "QueuesModule",
    path: "queues/",
    description: "Bull queue management and monitoring. Includes queue health checks and failed job inspection.",
    controllers: ["FailedJobsController", "HealthController"],
    services: ["FailedJobsService", "CleanupService"],
    queues: ["FILES", "MAIL", "NOTIFICATIONS"],
    note: "Bull Board is available at /admin/queues for visual queue monitoring.",
  },
  {
    icon: Database,
    name: "PrismaModule",
    path: "prisma/",
    description: "Database connection and ORM service. Wraps PrismaClient for dependency injection.",
    services: ["PrismaService"],
    note: "Exported globally for use by all feature modules.",
  },
];

export default function ModulesPage() {
  return (
    <div className="space-y-14">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          NestJS modules
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Modules
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          The backend is organized into 13 feature modules following NestJS conventions. Each
          module encapsulates its own controllers, services, DTOs, and tests.
        </p>
      </div>

      <div className="grid gap-5">
        {modules.map((mod) => (
          <section
            key={mod.name}
            className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-white/5 sm:p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-white/10 group-hover:text-white">
                <mod.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-base font-semibold text-white">{mod.name}</h2>
                  <code className="text-xs text-zinc-500">apps/api/src/{mod.path}</code>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  {mod.description}
                </p>

                {/* Controllers & Services */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs">
                  {mod.controllers && (
                    <div>
                      <span className="text-zinc-500">Controllers: </span>
                      {mod.controllers.map((c) => (
                        <code key={c} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-zinc-300">{c}</code>
                      ))}
                    </div>
                  )}
                  {mod.services && (
                    <div>
                      <span className="text-zinc-500">Services: </span>
                      {mod.services.map((s) => (
                        <code key={s} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-zinc-300">{s}</code>
                      ))}
                    </div>
                  )}
                  {mod.queues && (
                    <div>
                      <span className="text-zinc-500">Queues: </span>
                      {mod.queues.map((q) => (
                        <code key={q} className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-amber-300">{q}</code>
                      ))}
                    </div>
                  )}
                </div>

                {/* Endpoints */}
                {mod.endpoints && (
                  <div className="mt-3 grid gap-1 sm:grid-cols-2">
                    {mod.endpoints.map((ep) => (
                      <div key={ep} className="flex items-center gap-2 text-xs text-zinc-400">
                        <div className="h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                        <code className="font-mono text-[11px]">{ep}</code>
                      </div>
                    ))}
                  </div>
                )}

                {/* Note */}
                {mod.note && (
                  <p className="mt-3 text-xs italic text-zinc-500">{mod.note}</p>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
