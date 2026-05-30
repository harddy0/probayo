"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Edit,
  KeyRound,
  Loader,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiError } from "@/lib/api/client";
import {
  fetchAllUsers,
  updateUserProfile,
  updateUserStatus,
  resetUserPassword,
  createUser,
} from "@/lib/api/users";
import type { SimpleUser, CreateUserPayload } from "@/lib/types/users";
import { fetchAllDepartments } from "@/lib/api/departments";
import type { Department } from "@/lib/types/departments";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: { value: CreateUserPayload["role"]; label: string }[] = [
  { value: "Employee", label: "Employee" },
  { value: "ItStaff", label: "IT Staff" },
  { value: "DepartmentHead", label: "Dept. Head" },
  { value: "Admin", label: "Admin" },
];

const ROLE_STYLES: Record<string, string> = {
  Admin: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  ItStaff: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  Employee: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  DepartmentHead: "bg-violet-500/15 text-violet-300 border-violet-500/20",
};

const formatRole = (role: string) => {
  switch (role) {
    case "ItStaff": return "IT Staff";
    case "DepartmentHead": return "Dept. Head";
    default: return role;
  }
};

const DEFAULT_PASSWORD = "12345678password";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<SimpleUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "" });
  const { push: pushToast } = useToast();

  // ── Create user modal state ──
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    passwordHash: DEFAULT_PASSWORD,
    firstName: "",
    lastName: "",
    role: "Employee" as CreateUserPayload["role"],
  departmentId: "none",
  isActive: true,
});

  // ── Loaders ──

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      setError(isApiError(err) ? `${err.message} (${err.status})` : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const data = await fetchAllDepartments();
      setDepartments(data);
    } catch {
      // non-critical — departments dropdown will just be empty
    }
  }, []);

  useEffect(() => { void loadUsers(); void loadDepartments(); }, [loadUsers, loadDepartments]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const userStats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    return { total, active, inactive: total - active, roleCount: new Set(users.map((u) => u.role)).size };
  }, [users]);

  // ── Status toggle ──

  const handleToggleStatus = async (user: SimpleUser) => {
    setIsSubmitting(true);
    setError(null);
    const newStatus = !user.isActive;
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u)));
    try {
      await updateUserStatus(user.id, { isActive: newStatus });
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !newStatus } : u)));
      setError(isApiError(err) ? `${err.message} (${err.status})` : "Failed to update user status");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reset password ──

  const handleResetPassword = async (user: SimpleUser) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await resetUserPassword(user.id);
      pushToast({
        title: "Password reset",
        description: `Password for ${user.firstName ?? user.email} reset to default.`,
        variant: "success",
      });
      setError(null);
    } catch (err) {
      setError(isApiError(err) ? `${err.message} (${err.status})` : "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit modal ──

  const openEdit = (user: SimpleUser) => {
    setEditingUser(user);
    setEditForm({ firstName: user.firstName ?? "", lastName: user.lastName ?? "" });
    setError(null);
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm({ firstName: "", lastName: "" });
    setError(null);
  };

  // Escape key closes edit modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEdit();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeEdit]);

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const payload: Record<string, string> = {};
    const f = editForm.firstName.trim();
    const l = editForm.lastName.trim();
    if (f && f !== (editingUser.firstName ?? "")) payload.firstName = f;
    if (l && l !== (editingUser.lastName ?? "")) payload.lastName = l;
    if (Object.keys(payload).length === 0) { closeEdit(); return; }

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await updateUserProfile(editingUser.id, payload);
      setUsers((prev) => prev.map((u) =>
        u.id === editingUser.id ? { ...u, firstName: updated.firstName ?? u.firstName, lastName: updated.lastName ?? u.lastName } : u,
      ));
      closeEdit();
    } catch (err) {
      setError(isApiError(err) ? `${err.message} (${err.status})` : "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Create modal ──

  const openCreate = () => {
    setCreateForm({
      email: "",
      passwordHash: DEFAULT_PASSWORD,
      firstName: "",
      lastName: "",
      role: "Employee",
      departmentId: "none",
      isActive: true,
    });
    setError(null);
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setError(null);
  };

  // Escape key closes create modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCreate();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeCreate]);

  const handleCreateUser = async () => {
    const { email, passwordHash, firstName, lastName, role, departmentId, isActive } = createForm;
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setError("Email, first name, and last name are required.");
      return;
    }
    if (!passwordHash) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateUserPayload = {
        email: email.trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        isActive,
      };
      if (departmentId && departmentId !== "none") payload.departmentId = departmentId;

      await createUser(payload);
      await loadUsers();
      pushToast({
        title: "User created",
        description: `${firstName.trim()} ${lastName.trim()} has been added.`,
        variant: "success",
      });
      closeCreate();
    } catch (err) {
      setError(isApiError(err) ? `${err.message} (${err.status})` : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Ultra-compact header row ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Users</h1>
            <p className="text-xs text-zinc-500">
              Manage accounts, names, and access.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Compact stats pills */}
          <div className="hidden items-center gap-2 sm:flex">
            <StatPill label="Total" value={userStats.total} />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Active" value={userStats.active} className="text-emerald-400" />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Inactive" value={userStats.inactive} className="text-zinc-400" />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Roles" value={userStats.roleCount} />
          </div>
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            <Plus className="h-3.5 w-3.5" />
            New user
          </button>
          <button
            onClick={loadUsers}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Compact search bar ── */}
      <div className="relative flex shrink-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or role…"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="shrink-0 rounded-md p-0.5 text-zinc-500 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Table (fills remaining height, scrolls if needed) ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2.5 text-sm text-zinc-500">
            <Loader className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <Users className="h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">
              {searchQuery ? "No matches" : "No users found"}
            </p>
            <p className="text-xs text-zinc-500">
              {searchQuery ? "Try a different keyword." : "Users appear here once they register."}
            </p>
            {searchQuery ? (
              <Button onClick={() => setSearchQuery("")} className="mt-2 h-8 bg-zinc-800 px-3 text-xs text-zinc-50 hover:bg-zinc-700">
                Clear search
              </Button>
            ) : (
              <Button onClick={openCreate} className="mt-2 h-8 bg-zinc-800 px-3 text-xs text-zinc-50 hover:bg-zinc-700">
                Create first user
              </Button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full min-w-[800px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-950/95 text-[10px] uppercase tracking-[0.25em] text-zinc-500 backdrop-blur">
                <tr>
                  <th className="border-b border-white/10 px-4 py-2.5 font-medium">Name</th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">Email</th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">Role</th>
                  <th className="border-b border-white/10 px-3 py-2.5 font-medium">Status</th>
                  <th className="border-b border-white/10 px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="group transition hover:bg-white/[0.04]">
                    <td className="border-b border-white/5 px-4 py-2.5">
                      <p className="truncate font-medium text-white">
                        {user.firstName || user.lastName
                          ? `${user.firstName ?? ""} ${user.lastName ?? ""}`
                          : "—"}
                      </p>
                      <p className="truncate text-[11px] text-zinc-600">{user.id.slice(0, 8)}…</p>
                    </td>
                    <td className="max-w-[180px] truncate border-b border-white/5 px-3 py-2.5 text-zinc-300">
                      {user.email}
                    </td>
                    <td className="border-b border-white/5 px-3 py-2.5">
                      <span className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        ROLE_STYLES[user.role] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/20",
                      )}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="border-b border-white/5 px-3 py-2.5">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={isSubmitting}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                          user.isActive
                            ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", user.isActive ? "bg-emerald-400" : "bg-zinc-500")} />
                        {user.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="border-b border-white/5 px-4 py-2.5">
                      <div className="flex justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-amber-500/15 hover:text-amber-300 disabled:opacity-50"
                        >
                          <KeyRound className="h-3 w-3" />
                          Reset pwd
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editingUser && (() => {
        const currentUser = users.find((u) => u.id === editingUser.id) ?? editingUser;
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={closeEdit}
          >
            <div
              className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
                <div>
                  <h2 className="text-base font-semibold text-white">Edit user</h2>
                  <p className="mt-0.5 text-xs text-zinc-400">{currentUser.firstName ?? currentUser.email}</p>
                </div>
                <button onClick={closeEdit} disabled={isSubmitting} className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 px-5 py-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">First name</Label>
                    <Input
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                      placeholder="First name"
                      disabled={isSubmitting}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Last name</Label>
                    <Input
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                      placeholder="Last name"
                      disabled={isSubmitting}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Email</Label>
                  <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-500">
                    {currentUser.email}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Status</Label>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleToggleStatus(currentUser)}
                      disabled={isSubmitting}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
                        currentUser.isActive
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-zinc-500/10 text-zinc-400",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", currentUser.isActive ? "bg-emerald-400" : "bg-zinc-500")} />
                      {currentUser.isActive ? "Active" : "Inactive"}
                    </button>
                    <span className="text-[11px] text-zinc-500">Click to toggle</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Reset password</Label>
                  <button
                    onClick={() => handleResetPassword(currentUser)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Reset to default
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800 px-5 py-3.5">
                <button
                  onClick={closeEdit}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border border-white/10 px-3.5 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
                >
                  {isSubmitting && <Loader className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Create User Modal ── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeCreate}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-white">Create user</h2>
                <p className="mt-0.5 text-xs text-zinc-400">Add a new account to the system.</p>
              </div>
              <button onClick={closeCreate} disabled={isSubmitting} className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">First name *</Label>
                  <Input
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Jane"
                    disabled={isSubmitting}
                    className="h-9 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Last name *</Label>
                  <Input
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Doe"
                    disabled={isSubmitting}
                    className="h-9 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Email *</Label>
                <Input
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="jane.doe@example.com"
                  type="email"
                  disabled={isSubmitting}
                  className="h-9 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Role *</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(v) => setCreateForm((p) => ({ ...p, role: v as CreateUserPayload["role"] }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-9 rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Department</Label>
                  <Select
                    value={createForm.departmentId}
                    onValueChange={(v) => setCreateForm((p) => ({ ...p, departmentId: v }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-9 rounded-lg text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Password</Label>
                <Input
                  value={createForm.passwordHash}
                  onChange={(e) => setCreateForm((p) => ({ ...p, passwordHash: e.target.value }))}
                  type="text"
                  disabled={isSubmitting}
                  className="h-9 rounded-lg text-sm font-mono text-amber-300"
                />
                <p className="text-[10px] text-zinc-500">Default password is pre-filled. Change if desired.</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/10 px-3.5 py-2.5">
                <Label className="text-xs text-zinc-400">Account active</Label>
                <button
                  type="button"
                  onClick={() => setCreateForm((p) => ({ ...p, isActive: !p.isActive }))}
                  disabled={isSubmitting}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50",
                    createForm.isActive ? "bg-emerald-500" : "bg-zinc-600",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                      createForm.isActive ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800 px-5 py-3.5">
              <button
                onClick={closeCreate}
                disabled={isSubmitting}
                className="h-9 rounded-lg border border-white/10 px-3.5 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isSubmitting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {isSubmitting && <Loader className="h-3.5 w-3.5 animate-spin" />}
                Create user
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Tiny stat pill ──

function StatPill({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums text-white", className)}>{value}</span>
    </div>
  );
}
