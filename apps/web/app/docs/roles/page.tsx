import { Shield, ShieldCheck, UserCog, UserRound } from "lucide-react";

const roles = [
  {
    icon: ShieldCheck,
    name: "Admin",
    color: "text-rose-300",
    border: "border-rose-500/20",
    bg: "bg-rose-500/10",
    description:
      "Full system access. Admins can manage users, departments, assets, ticket categories, SLA policies, escalation rules, and view all tickets. They can assign tickets to IT staff but cannot claim or resolve tickets directly.",
    capabilities: [
      "Create, update, and delete users",
      "Manage departments and assign department heads",
      "Create and manage ticket categories",
      "Configure SLA policies and escalation rules",
      "View and manage all tickets (assign/unassign only)",
      "View and manage all assets",
      "View system notifications",
    ],
  },
  {
    icon: UserCog,
    name: "IT Staff",
    color: "text-sky-300",
    border: "border-sky-500/20",
    bg: "bg-sky-500/10",
    description:
      "Ticket handling and asset management. IT staff can claim, acknowledge, resolve, and close tickets. They can also manage assets and view relevant notifications.",
    capabilities: [
      "Claim, acknowledge, and resolve tickets",
      "Self-assign open tickets",
      "Add comments and attachments to tickets",
      "Create and manage assets",
      "View and manage known issues",
      "Batch attach tickets to known issues",
      "View notifications and mark as seen",
    ],
  },
  {
    icon: UserRound,
    name: "Employee (Client)",
    color: "text-emerald-300",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
    description:
      "Self-service ticket creation and tracking. Employees can create tickets, view their own tickets, and track status updates.",
    capabilities: [
      "Create new support tickets",
      "View own tickets and their status",
      "Track ticket resolution progress",
      "View notifications",
    ],
  },
];

const guardMatrix = [
  { endpoint: "POST /auth/login", Admin: "—", "IT Staff": "—", Employee: "—" },
  { endpoint: "GET /auth/profile", Admin: "✓", "IT Staff": "✓", Employee: "✓" },
  { endpoint: "POST /auth/change-password", Admin: "✓", "IT Staff": "✓", Employee: "✓" },
  { endpoint: "GET /users", Admin: "✓", "IT Staff": "✗", Employee: "✗" },
  { endpoint: "POST /users", Admin: "✓", "IT Staff": "✗", Employee: "✗" },
  { endpoint: "PATCH /users/:id", Admin: "✓", "IT Staff": "✗", Employee: "✗" },
  { endpoint: "DELETE /users/:id", Admin: "✓", "IT Staff": "✗", Employee: "✗" },
  { endpoint: "GET /tickets", Admin: "✓", "IT Staff": "✓", Employee: "✓*" },
  { endpoint: "POST /tickets", Admin: "✓", "IT Staff": "✓", Employee: "✓" },
  { endpoint: "PATCH /tickets/:id", Admin: "✓**", "IT Staff": "✓", Employee: "✗" },
  { endpoint: "DELETE /tickets/:id", Admin: "✓", "IT Staff": "✓", Employee: "✗" },
  { endpoint: "POST /tickets/:id/assign/:userId", Admin: "✓", "IT Staff": "✓***", Employee: "✗" },
  { endpoint: "GET /departments", Admin: "✓", "IT Staff": "✗", Employee: "✗" },
  { endpoint: "POST /departments", Admin: "✓", "IT Staff": "✗", Employee: "✗" },
  { endpoint: "GET /assets", Admin: "✓", "IT Staff": "✓", Employee: "✗" },
  { endpoint: "POST /assets", Admin: "✓", "IT Staff": "✓", Employee: "✗" },
  { endpoint: "GET /sla-policies", Admin: "✓", "IT Staff": "✗", Employee: "✗" },
  { endpoint: "POST /sla-policies", Admin: "✓", "IT Staff": "✗", Employee: "✗" },
  { endpoint: "GET /sla-escalation-rules", Admin: "✓", "IT Staff": "✗", Employee: "✗" },
];

const legend = [
  { symbol: "✓", label: "Full access" },
  { symbol: "✓*", label: "Employees see only own tickets" },
  { symbol: "✓**", label: "Admin can update only assignment, not status" },
  { symbol: "✓***", label: "IT Staff can only self-assign" },
  { symbol: "✗", label: "No access" },
];

export default function RolesPage() {
  return (
    <div className="space-y-14">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          Authorization
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Roles &amp; Permissions
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Probayo has three user roles, each with a dedicated dashboard and specific
          capabilities. Access control is enforced at both the route level (NestJS guards)
          and the UI level (separate layouts and pages).
        </p>
      </div>

      {/* Role cards */}
      <section className="grid gap-6 md:grid-cols-3">
        {roles.map((role) => (
          <div
            key={role.name}
            className={`rounded-2xl border ${role.border} ${role.bg} p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-white/5`}
          >
            <div className="flex items-center gap-3">
              <role.icon className={`h-5 w-5 ${role.color}`} />
              <h2 className={`text-base font-semibold ${role.color}`}>{role.name}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {role.description}
            </p>
            <ul className="mt-4 space-y-2">
              {role.capabilities.map((cap) => (
                <li key={cap} className="flex items-start gap-2 text-sm text-zinc-400">
                  <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${role.color}`} />
                  {cap}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Access matrix */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          <Shield className="h-4 w-4" />
          API Access Matrix
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 transition-all duration-200 hover:border-white/20 hover:shadow-md hover:shadow-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Endpoint
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-rose-400">
                    Admin
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-sky-400">
                    IT Staff
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Employee
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {guardMatrix.map((row) => (
                  <tr key={row.endpoint} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
                      {row.endpoint}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-zinc-400">
                      {row.Admin}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-zinc-400">
                      {"IT Staff"}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-zinc-400">
                      {row.Employee}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          {legend.map((item) => (
            <span key={item.symbol} className="flex items-center gap-1.5 text-xs text-zinc-500">
              <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-zinc-400">
                {item.symbol}
              </code>
              {item.label}
            </span>
          ))}
        </div>
      </section>

      {/* How auth works */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/20">
        <h2 className="text-sm font-semibold text-white">How Authorization Works</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-400">
          <p>
            Authentication uses <strong className="text-zinc-200">JWT tokens</strong> stored in
            localStorage. On login, the backend returns an access token along with user profile
            details (role, department, etc.). Every subsequent API request includes the token in
            the <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-zinc-300">Authorization: Bearer &lt;token&gt;</code> header.
          </p>
          <p>
            The backend enforces access control through two guard layers:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-zinc-400">
            <li>
              <strong className="text-zinc-200">JwtAuthGuard</strong> — validates the token and
              extracts the user identity.
            </li>
            <li>
              <strong className="text-zinc-200">RolesGuard</strong> — checks whether the user&apos;s
              role matches the required roles defined on the endpoint with the{" "}
              <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-zinc-300">@Roles()</code> decorator.
            </li>
          </ul>
          <p>
            The frontend mirrors this by having three separate layout groups (Admin, IT Staff,
            Employee). Each layout validates the session role on mount and redirects unauthorized
            users to their appropriate dashboard.
          </p>
        </div>
      </section>
    </div>
  );
}
