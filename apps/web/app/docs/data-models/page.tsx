import { Database, Hash, Key, Link2, List } from "lucide-react";

const models = [
  {
    name: "Users",
    table: "users",
    description: "Core user profiles. Each user belongs to one role and optionally one department.",
    color: "text-rose-300",
    border: "border-rose-500/20",
    bg: "bg-rose-500/10",
    fields: [
      { name: "id", type: "UUID", key: "PK", description: "Primary key" },
      { name: "email", type: "String", key: "unique", description: "Login email" },
      { name: "password", type: "String", key: null, description: "Hashed password" },
      { name: "firstName", type: "String", key: null, description: "Given name" },
      { name: "lastName", type: "String", key: null, description: "Surname" },
      { name: "role", type: "UserRole enum", key: null, description: "Admin | ItStaff | Employee | DepartmentHead" },
      { name: "isActive", type: "Boolean", key: null, description: "Soft disable flag" },
      { name: "departmentId", type: "UUID?", key: "FK → departments", description: "Optional department assignment" },
    ],
    relations: ["Has many tickets (created)", "Has many assigned tickets", "Has many assets", "Has many notifications"],
  },
  {
    name: "Departments",
    table: "departments",
    description: "Organizational units. Each department can have a designated department head.",
    color: "text-sky-300",
    border: "border-sky-500/20",
    bg: "bg-sky-500/10",
    fields: [
      { name: "id", type: "UUID", key: "PK", description: "Primary key" },
      { name: "name", type: "String", key: "unique", description: "Department name" },
      { name: "description", type: "String?", key: null, description: "Optional description" },
      { name: "headId", type: "UUID?", key: "FK → users", description: "Department head" },
    ],
    relations: ["Has many users", "Has many tickets (via assigned department)", "Has many assets"],
  },
  {
    name: "Tickets",
    table: "tickets",
    description: "The central entity. Tracks support requests through their full lifecycle.",
    color: "text-amber-300",
    border: "border-amber-500/20",
    bg: "bg-amber-500/10",
    fields: [
      { name: "id", type: "UUID", key: "PK", description: "Primary key" },
      { name: "title", type: "String", key: null, description: "Short summary" },
      { name: "description", type: "Text", key: null, description: "Detailed issue description" },
      { name: "status", type: "TicketStatus enum", key: null, description: "Open → Acknowledged → InProgress → PendingUser → Resolved → Closed" },
      { name: "priority", type: "PriorityLevel enum", key: null, description: "Critical | High | Medium | Low" },
      { name: "createdById", type: "UUID", key: "FK → users", description: "Ticket creator" },
      { name: "assignedToId", type: "UUID?", key: "FK → users", description: "Assigned IT staff" },
      { name: "categoryId", type: "UUID?", key: "FK → ticket_categories", description: "Ticket category" },
      { name: "departmentId", type: "UUID?", key: "FK → departments", description: "Related department" },
      { name: "slaDeadlineAck", type: "DateTime?", key: null, description: "SLA acknowledgement deadline" },
      { name: "slaDeadlineRes", type: "DateTime?", key: null, description: "SLA resolution deadline" },
    ],
    relations: ["Has many comments", "Has many attachments", "Has many status history entries", "May link to a known issue"],
  },
  {
    name: "SlaPolicies",
    table: "sla_policies",
    description: "Defines SLA time constraints per priority level. Used by the SLA cron engine.",
    color: "text-emerald-300",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
    fields: [
      { name: "id", type: "UUID", key: "PK", description: "Primary key" },
      { name: "priority", type: "PriorityLevel", key: "unique", description: "One policy per priority" },
      { name: "acknowledgementMinutes", type: "Int", key: null, description: "Minutes to acknowledge" },
      { name: "resolutionMinutes", type: "Int", key: null, description: "Minutes to resolve" },
    ],
    relations: ["Referenced by SLA escalation engine"],
  },
  {
    name: "Assets",
    table: "assets",
    description: "IT equipment and devices tracked within the organization.",
    color: "text-violet-300",
    border: "border-violet-500/20",
    bg: "bg-violet-500/10",
    fields: [
      { name: "id", type: "UUID", key: "PK", description: "Primary key" },
      { name: "name", type: "String", key: null, description: "Asset name/label" },
      { name: "type", type: "String", key: null, description: "Device type (laptop, monitor, etc.)" },
      { name: "serialNumber", type: "String?", key: null, description: "Manufacturer serial" },
      { name: "assignedToId", type: "UUID?", key: "FK → users", description: "Currently assigned user" },
      { name: "departmentId", type: "UUID?", key: "FK → departments", description: "Owning department" },
    ],
    relations: ["Belongs to a department", "Assigned to a user"],
  },
  {
    name: "KnownIssues",
    table: "known_issues",
    description: "Recurring or widespread issues that can be linked to multiple tickets.",
    color: "text-orange-300",
    border: "border-orange-500/20",
    bg: "bg-orange-500/10",
    fields: [
      { name: "id", type: "UUID", key: "PK", description: "Primary key" },
      { name: "title", type: "String", key: null, description: "Issue summary" },
      { name: "description", type: "Text", key: null, description: "Detailed description" },
      { name: "status", type: "KnownIssueStatus enum", key: null, description: "Active | Resolved" },
    ],
    relations: ["Linked to multiple tickets via bulk-attach"],
  },
  {
    name: "Notifications",
    table: "notifications",
    description: "System-generated notifications for users across all roles.",
    color: "text-pink-300",
    border: "border-pink-500/20",
    bg: "bg-pink-500/10",
    fields: [
      { name: "id", type: "UUID", key: "PK", description: "Primary key" },
      { name: "type", type: "NotificationType enum", key: null, description: "TicketCreated, StatusChanged, Assignment, Escalation, etc." },
      { name: "title", type: "String", key: null, description: "Notification title" },
      { name: "message", type: "String", key: null, description: "Notification body" },
      { name: "userId", type: "UUID", key: "FK → users", description: "Recipient" },
      { name: "seen", type: "Boolean", key: null, description: "Read status" },
      { name: "channel", type: "NotificationChannel", key: null, description: "Email | InApp" },
    ],
    relations: ["Belongs to a user"],
  },
];

export default function DataModelsPage() {
  return (
    <div className="space-y-14">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Prisma ORM
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Data Models
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          The database schema is defined using Prisma ORM with a MySQL database. Below are the
          core models, their fields, and relationships.
        </p>
      </div>          {/* Enums */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/20">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          <List className="h-4 w-4" />
          Enumerations
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "UserRole", values: ["Admin", "ItStaff", "Employee", "DepartmentHead"] },
            { name: "TicketStatus", values: ["Open", "Acknowledged", "InProgress", "PendingUser", "Resolved", "Closed"] },
            { name: "PriorityLevel", values: ["Critical", "High", "Medium", "Low"] },
            { name: "KnownIssueStatus", values: ["Active", "Resolved"] },
            { name: "NotificationType", values: ["TicketCreated", "StatusChanged", "Assignment", "Escalation", "SlaWarning"] },
            { name: "NotificationChannel", values: ["Email", "InApp"] },
          ].map((enum_) => (
            <div key={enum_.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-md hover:shadow-white/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{enum_.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {enum_.values.map((v) => (
                  <span key={v} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-zinc-400">{v}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Model cards */}
      {models.map((model) => (
        <section key={model.name} className="scroll-mt-20 group">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${model.border} ${model.bg} ${model.color} transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:shadow-lg`}>
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{model.name}</h2>
              <p className="text-xs text-zinc-500 font-mono">{model.table}</p>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{model.description}</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Field</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Key</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {model.fields.map((field) => (
                  <tr key={field.name} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-2 font-mono text-xs text-zinc-200">{field.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-400">{field.type}</td>
                    <td className="px-4 py-2">
                      {field.key && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                          {field.key.includes("PK") ? <Key className="h-3 w-3 text-amber-400" /> : field.key.includes("FK") ? <Link2 className="h-3 w-3 text-sky-400" /> : <Hash className="h-3 w-3 text-zinc-500" />}
                          {field.key}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-400">{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {model.relations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {model.relations.map((rel) => (
                <span key={rel} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-zinc-500 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.04] hover:text-zinc-400">
                  <Link2 className="h-3 w-3" />
                  {rel}
                </span>
              ))}
            </div>
          )}
        </section>
      ))}

      {/* ER Diagram text */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/20">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          <Hash className="h-4 w-4" />
          Key Relationships
        </h2>
        <div className="mt-4 space-y-3 text-sm text-zinc-400">
          <p>
            <strong className="text-zinc-200">Ticket → User:</strong> A ticket has a creator
            (createdById) and optionally an assignee (assignedToId). Both are foreign keys to the Users table.
          </p>
          <p>
            <strong className="text-zinc-200">Ticket → Status History:</strong> Every status change
            is recorded in ticket_status_history for auditing and SLA tracking.
          </p>
          <p>
            <strong className="text-zinc-200">Ticket → SLA:</strong> When a ticket is created or updated,
            SLA deadlines are computed based on its priority and the corresponding SlaPolicy.
          </p>
          <p>
            <strong className="text-zinc-200">Ticket → Known Issue:</strong> Tickets can be bulk-attached
            to a known issue via the bulk-attach endpoint, linking them through a join table.
          </p>
          <p>
            <strong className="text-zinc-200">Escalation Rules → Roles:</strong> Each escalation rule
            targets a specific role (Admin or DepartmentHead) and triggers when a ticket exceeds its
            SLA thresholds.
          </p>
        </div>
      </section>
    </div>
  );
}
