import { Code2, Lock, Globe, CheckCircle } from "lucide-react";

interface EndpointItem {
  method: string;
  path: string;
  auth: boolean;
  roles?: string[];
  description: string;
  body?: Record<string, string> | string;
  response?: Record<string, string> | string;
}

interface EndpointGroup {
  tag: string;
  color: string;
  border: string;
  bg: string;
  items: EndpointItem[];
}

const endpoints: EndpointGroup[] = [
  {
    tag: "Auth",
    color: "text-violet-300",
    border: "border-violet-500/20",
    bg: "bg-violet-500/10",
    items: [
      {
        method: "POST", path: "/auth/login", auth: false,
        description: "Authenticate with email and password. Returns a JWT access token and user profile.",
        body: { email: "string", password: "string" },
        response: { accessToken: "string", user: "UserProfile" },
      },
      {
        method: "POST", path: "/auth/logout", auth: true,
        description: "Invalidate the current JWT session.",
      },
      {
        method: "GET", path: "/auth/profile", auth: true,
        description: "Retrieve the currently authenticated user's profile.",
        response: { id: "UUID", email: "string", firstName: "string", lastName: "string", role: "UserRole" },
      },
      {
        method: "POST", path: "/auth/change-password", auth: true,
        description: "Change the current user's password. Requires the current password for verification.",
        body: { currentPassword: "string", newPassword: "string" },
      },
    ],
  },
  {
    tag: "Users",
    color: "text-rose-300",
    border: "border-rose-500/20",
    bg: "bg-rose-500/10",
    items: [
      { method: "GET", path: "/users", auth: true, roles: ["Admin"], description: "List all users." },
      { method: "POST", path: "/users", auth: true, roles: ["Admin"], description: "Create a new user.", body: { email: "string", password: "string", firstName: "string", lastName: "string", role: "UserRole", departmentId: "UUID?" } },
      { method: "GET", path: "/users/:id", auth: true, roles: ["Admin"], description: "Get a user by UUID." },
      { method: "PATCH", path: "/users/:id", auth: true, roles: ["Admin"], description: "Update a user's details." },
      { method: "DELETE", path: "/users/:id", auth: true, roles: ["Admin"], description: "Delete a user." },
      { method: "POST", path: "/users/:id/reset-password", auth: true, roles: ["Admin"], description: "Reset a user's password to default." },
      { method: "PATCH", path: "/users/:id/status", auth: true, roles: ["Admin"], description: "Activate or deactivate a user." },
    ],
  },
  {
    tag: "Tickets",
    color: "text-amber-300",
    border: "border-amber-500/20",
    bg: "bg-amber-500/10",
    items: [
      { method: "GET", path: "/tickets", auth: true, description: "List tickets. Employees see only their own; Admins/IT see all. Supports query filters: status, priority, assignedToUserId, departmentId, categoryId." },
      { method: "POST", path: "/tickets", auth: true, description: "Create a new support ticket.", body: { title: "string", description: "string", priority: "PriorityLevel", categoryId: "UUID?", departmentId: "UUID?" } },
      { method: "GET", path: "/tickets/:id", auth: true, description: "Get a single ticket by UUID with full details including comments and status history." },
      { method: "PATCH", path: "/tickets/:id", auth: true, roles: ["Admin", "ItStaff"], description: "Update ticket fields (status, priority, etc.). Admin can only update assignment." },
      { method: "DELETE", path: "/tickets/:id", auth: true, roles: ["Admin", "ItStaff"], description: "Close or delete a ticket." },
      { method: "POST", path: "/tickets/:id/assign/:userId", auth: true, roles: ["Admin", "ItStaff"], description: "Assign ticket to IT staff. Admin can assign any; IT can only self-assign." },
      { method: "POST", path: "/tickets/:id/unassign", auth: true, roles: ["Admin", "ItStaff"], description: "Remove assignment from a ticket." },
      { method: "POST", path: "/tickets/bulk-attach-issue", auth: true, roles: ["Admin", "ItStaff"], description: "Attach multiple tickets to a known issue.", body: { ticketIds: "UUID[]", knownIssueId: "UUID" } },
    ],
  },
  {
    tag: "Comments",
    color: "text-sky-300",
    border: "border-sky-500/20",
    bg: "bg-sky-500/10",
    items: [
      { method: "POST", path: "/tickets/:ticketId/comments", auth: true, description: "Add a comment to a ticket.", body: { content: "string" } },
      { method: "GET", path: "/tickets/:ticketId/comments", auth: true, description: "Get all comments for a ticket." },
      { method: "PATCH", path: "/tickets/comments/:commentId", auth: true, description: "Update a comment (own comments only)." },
      { method: "DELETE", path: "/tickets/comments/:commentId", auth: true, description: "Delete a comment (own comments only)." },
    ],
  },
  {
    tag: "Attachments",
    color: "text-pink-300",
    border: "border-pink-500/20",
    bg: "bg-pink-500/10",
    items: [
      { method: "POST", path: "/attachments/tickets/:ticketId", auth: true, description: "Upload a file to a ticket (async processing via Bull queue).", body: "multipart/form-data { file }" },
      { method: "GET", path: "/attachments/tickets/:ticketId", auth: true, description: "List all attachments for a ticket." },
      { method: "POST", path: "/attachments/comments/:commentId", auth: true, description: "Upload a file to a comment (async).", body: "multipart/form-data { file }" },
      { method: "GET", path: "/attachments/comments/:commentId", auth: true, description: "List attachments for a comment." },
    ],
  },
  {
    tag: "Departments",
    color: "text-emerald-300",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
    items: [
      { method: "GET", path: "/departments", auth: false, description: "List all departments (no auth required)." },
      { method: "POST", path: "/departments", auth: true, roles: ["Admin"], description: "Create a new department." },
      { method: "GET", path: "/departments/:id", auth: false, description: "Get department by UUID." },
      { method: "PATCH", path: "/departments/:id", auth: true, roles: ["Admin"], description: "Update a department." },
      { method: "DELETE", path: "/departments/:id", auth: true, roles: ["Admin"], description: "Delete a department." },
    ],
  },
  {
    tag: "Assets",
    color: "text-cyan-300",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/10",
    items: [
      { method: "GET", path: "/assets", auth: true, description: "List all assets." },
      { method: "POST", path: "/assets", auth: true, roles: ["Admin", "ItStaff"], description: "Create a new asset." },
      { method: "GET", path: "/assets/:id", auth: true, description: "Get asset by UUID." },
      { method: "PATCH", path: "/assets/:id", auth: true, roles: ["Admin", "ItStaff"], description: "Update an asset." },
      { method: "DELETE", path: "/assets/:id", auth: true, roles: ["Admin", "ItStaff"], description: "Delete an asset." },
    ],
  },
  {
    tag: "Ticket Categories",
    color: "text-indigo-300",
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/10",
    items: [
      { method: "GET", path: "/ticket-categories", auth: true, description: "List all categories." },
      { method: "POST", path: "/ticket-categories", auth: true, roles: ["Admin"], description: "Create a new category." },
      { method: "GET", path: "/ticket-categories/:id", auth: true, description: "Get category by UUID." },
      { method: "PATCH", path: "/ticket-categories/:id", auth: true, roles: ["Admin"], description: "Update a category." },
      { method: "DELETE", path: "/ticket-categories/:id", auth: true, roles: ["Admin"], description: "Soft delete a category." },
    ],
  },
  {
    tag: "SLA Policies",
    color: "text-orange-300",
    border: "border-orange-500/20",
    bg: "bg-orange-500/10",
    items: [
      { method: "GET", path: "/sla-policies", auth: true, description: "List all SLA policies." },
      { method: "POST", path: "/sla-policies", auth: true, roles: ["Admin"], description: "Create a new SLA policy." },
      { method: "GET", path: "/sla-policies/:id", auth: true, description: "Get policy by UUID." },
      { method: "PATCH", path: "/sla-policies/:id", auth: true, roles: ["Admin"], description: "Update an SLA policy." },
      { method: "DELETE", path: "/sla-policies/:id", auth: true, roles: ["Admin"], description: "Delete an SLA policy." },
      { method: "GET", path: "/sla-policies/priority/:priority", auth: true, description: "Get SLA policy by priority level." },
    ],
  },
  {
    tag: "SLA Escalation Rules",
    color: "text-rose-300",
    border: "border-rose-500/20",
    bg: "bg-rose-500/10",
    items: [
      { method: "GET", path: "/sla-escalation-rules", auth: true, description: "List all escalation rules." },
      { method: "GET", path: "/sla-escalation-rules/:id", auth: true, description: "Get rule by UUID." },
      { method: "PATCH", path: "/sla-escalation-rules/:id", auth: true, roles: ["Admin"], description: "Update an escalation rule." },
    ],
  },
  {
    tag: "Known Issues",
    color: "text-yellow-300",
    border: "border-yellow-500/20",
    bg: "bg-yellow-500/10",
    items: [
      { method: "GET", path: "/known-issues", auth: true, description: "List all known issues." },
      { method: "POST", path: "/known-issues", auth: true, roles: ["Admin", "ItStaff"], description: "Create a known issue." },
      { method: "GET", path: "/known-issues/:id", auth: true, description: "Get known issue by UUID." },
      { method: "PATCH", path: "/known-issues/:id", auth: true, roles: ["Admin", "ItStaff"], description: "Update a known issue." },
      { method: "DELETE", path: "/known-issues/:id", auth: true, roles: ["Admin", "ItStaff"], description: "Delete a known issue." },
    ],
  },
  {
    tag: "Notifications",
    color: "text-pink-300",
    border: "border-pink-500/20",
    bg: "bg-pink-500/10",
    items: [
      { method: "GET", path: "/notifications", auth: true, description: "List all notifications for the current user." },
      { method: "GET", path: "/notifications/unread-count", auth: true, description: "Get unread notification count." },
      { method: "GET", path: "/notifications/:id", auth: true, description: "Get notification by UUID." },
      { method: "PUT", path: "/notifications/:id/seen", auth: true, description: "Mark a notification as seen." },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-sky-400",
  PATCH: "text-amber-400",
  PUT: "text-violet-400",
  DELETE: "text-rose-400",
};

const statusCodes = [
  { code: "200", label: "Success", desc: "Request completed successfully" },
  { code: "201", label: "Created", desc: "Resource created successfully" },
  { code: "400", label: "Bad Request", desc: "Invalid input or validation error" },
  { code: "401", label: "Unauthorized", desc: "Missing or invalid JWT token" },
  { code: "403", label: "Forbidden", desc: "Insufficient role permissions" },
  { code: "404", label: "Not Found", desc: "Resource does not exist" },
];

export default function ApiReferencePage() {
  return (
    <div className="space-y-14">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3.5 py-1 text-xs font-medium text-sky-300 transition hover:border-sky-500/40 hover:bg-sky-500/15">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          REST API
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
          API Reference
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Complete REST API documentation auto-generated from the NestJS Swagger/OpenAPI spec.
          The API is served at <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-zinc-300">http://localhost:3001</code>.
        </p>
      </div>

      {/* How to use */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/20 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          <Globe className="h-4 w-4" />
          Using the API
        </h2>
        <div className="mt-4 space-y-4 text-sm text-zinc-400">
          <p>
            All endpoints except <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-zinc-300">POST /auth/login</code> and public
            department endpoints require a JWT token in the <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-zinc-300">Authorization</code> header:
          </p>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-200 hover:border-white/30 hover:shadow-lg hover:shadow-white/5">
            <pre className="overflow-x-auto p-4 text-sm text-zinc-300"><code>{`Authorization: Bearer <your_jwt_token>

# Example request
curl -X GET http://localhost:3001/tickets \\
  -H "Authorization: Bearer eyJhbGciOi..." \\
  -H "Content-Type: application/json"`}</code></pre>
          </div>
          <p>
            The API also supports Swagger UI at <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-zinc-300">http://localhost:3001/api</code> for interactive exploration.
          </p>
        </div>
      </section>

      {/* Endpoint groups */}
      {endpoints.map((group) => (
        <section key={group.tag} className="scroll-mt-20">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${group.border} ${group.bg} ${group.color} transition-all duration-200 hover:scale-110`}>
              <Code2 className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-white">{group.tag}</h2>
          </div>

          <div className="mt-4 space-y-3">
            {group.items.map((ep) => (
              <div
                key={`${ep.method}-${ep.path}`}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-white/5"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className={`shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs font-semibold transition-all duration-200 hover:scale-105 ${methodColors[ep.method] || "text-zinc-400"}`}>
                    {ep.method}
                  </span>
                  <code className="flex-1 font-mono text-sm text-zinc-200 transition-colors duration-200 hover:text-white">
                    {ep.path}
                  </code>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {ep.auth && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 transition-all duration-200 hover:bg-white/10 hover:text-zinc-400">
                        <Lock className="h-3 w-3" />
                        Auth
                      </span>
                    )}
                    {ep.roles?.map((role) => (
                      <span key={role} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500 transition-all duration-200 hover:bg-white/10 hover:text-zinc-400">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{ep.description}</p>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
                  {ep.body && (
                    <div className="flex items-start gap-1.5">
                      <span className="font-medium text-zinc-400">Body:</span>
                      <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-zinc-300">
                        {typeof ep.body === "string" ? ep.body : JSON.stringify(ep.body, null, 0).replace(/[{}\",]/g, " ").trim().replace(/\s+/g, " ")}
                      </code>
                    </div>
                  )}
                  {ep.response && (
                    <div className="flex items-start gap-1.5">
                      <span className="font-medium text-zinc-400">Response:</span>
                      <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-zinc-300">
                        {typeof ep.response === "string" ? ep.response : JSON.stringify(ep.response, null, 0).replace(/[{}\",]/g, " ").trim().replace(/\s+/g, " ")}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Status codes */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/20 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
          <CheckCircle className="h-4 w-4" />
          Common Status Codes
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statusCodes.map((status) => (
            <div
              key={status.code}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-md hover:shadow-white/5"
            >
              <span className="font-mono text-sm font-semibold text-zinc-200">{status.code}</span>
              <p className="mt-0.5 text-xs font-medium text-zinc-400">{status.label}</p>
              <p className="text-[11px] text-zinc-600">{status.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
