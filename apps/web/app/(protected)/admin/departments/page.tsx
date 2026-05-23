"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Edit,
  Loader,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UserSelect from "@/components/ui/user-select";
import {
  fetchAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  fetchDepartmentById,
} from "@/lib/api/departments";
import { isApiError } from "@/lib/api/client";
import type { Department } from "@/lib/types/departments";
import { cn } from "@/lib/utils";

type ModalState = {
  type: "create" | "edit" | "members" | null;
  department: Department | null;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState>({
    type: null,
    department: null,
  });
  const [formData, setFormData] = useState({ name: "", headUserId: "" });

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllDepartments();
      setDepartments(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load departments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadDepartments(); }, [loadDepartments]);

  const filteredDepts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      (d.headUser && `${d.headUser.firstName} ${d.headUser.lastName}`.toLowerCase().includes(q)),
    );
  }, [departments, searchQuery]);

  const deptStats = useMemo(() => {
    const total = departments.length;
    const withHead = departments.filter((d) => d.headUserId).length;
    const memberCount = departments.reduce((acc, d) => acc + (d.members?.length ?? 0), 0);
    return { total, withHead, memberCount };
  }, [departments]);

  const handleCreateEdit = async () => {
    if (!formData.name.trim()) { setError("Department name is required"); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      if (modal.type === "edit" && modal.department) {
        const updated = await updateDepartment(modal.department.id, {
          name: formData.name,
          headUserId: formData.headUserId || null,
        });
        setDepartments((prev) => prev.map((d) => (d.id === modal.department!.id ? updated : d)));
      } else {
        const newDept = await createDepartment({
          name: formData.name,
          headUserId: formData.headUserId || undefined,
        });
        setDepartments((prev) => [newDept, ...prev]);
      }
      closeModal();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Delete failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreate = () => {
    setFormData({ name: "", headUserId: "" });
    setModal({ type: "create", department: null });
    setError(null);
  };

  const openEdit = (dept: Department) => {
    setFormData({ name: dept.name, headUserId: dept.headUserId || "" });
    setModal({ type: "edit", department: dept });
    setError(null);
  };

  const openMembers = async (dept: Department) => {
    setIsLoading(true);
    setError(null);
    try {
      const fullDept = await fetchDepartmentById(dept.id);
      setModal({ type: "members", department: fullDept });
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setModal({ type: null, department: null });
    setFormData({ name: "", headUserId: "" });
    setError(null);
  };

  // Escape key closes modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeModal]);

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Ultra-compact header row ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Departments</h1>
            <p className="text-xs text-zinc-500">
              Manage teams, heads, and member assignments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <StatPill label="Total" value={deptStats.total} />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Headed" value={deptStats.withHead} className="text-violet-400" />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Members" value={deptStats.memberCount} className="text-sky-400" />
          </div>
          <button
            onClick={loadDepartments}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>
      </div>

      {/* ── Compact search bar ── */}
      <div className="relative flex shrink-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search departments by name or head…"
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

      {/* ── Card list (fills remaining height, scrolls if needed) ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2.5 text-sm text-zinc-500">
            <Loader className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <Building2 className="h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">
              {searchQuery ? "No matches" : "No departments yet"}
            </p>
            <p className="text-xs text-zinc-500">
              {searchQuery ? "Try a different keyword." : "Create your first department to get started."}
            </p>
            {searchQuery ? (
              <button onClick={() => setSearchQuery("")} className="mt-2 h-8 rounded-lg bg-zinc-800 px-3 text-xs text-zinc-50 hover:bg-zinc-700">
                Clear search
              </button>
            ) : (
              <button onClick={openCreate} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-zinc-950 hover:bg-zinc-100">
                <Plus className="h-3.5 w-3.5" />
                Create Department
              </button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <div className="divide-y divide-white/5">
              {filteredDepts.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-white/[0.04]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{dept.name}</p>
                      {dept.headUser ? (
                        <p className="truncate text-[11px] text-zinc-500">
                          Head: {dept.headUser.firstName} {dept.headUser.lastName}
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-600">No head assigned</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => openMembers(dept)}
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      <Users className="mr-1 inline h-3 w-3" />
                      {dept.members?.length ?? 0}
                    </button>
                    <button
                      onClick={() => openEdit(dept)}
                      className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      disabled={isSubmitting}
                      className="rounded-lg border border-red-500/20 p-1.5 text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Create/Edit Modal ── */}
      {(modal.type === "create" || modal.type === "edit") && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {modal.type === "edit" ? "Edit department" : "New department"}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {modal.type === "edit" ? "Update name or head." : "Add a team to the organization."}
                </p>
              </div>
              <button onClick={closeModal} disabled={isSubmitting} className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
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
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Department name</Label>
                <Input
                  placeholder="Engineering, Sales…"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <UserSelect
                  label="Head user"
                  value={formData.headUserId}
                  onChange={(id) => setFormData((p) => ({ ...p, headUserId: id }))}
                  placeholder="Search users by name or email"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800 px-5 py-3.5">
              <button onClick={closeModal} disabled={isSubmitting} className="h-9 rounded-lg border border-white/10 px-3.5 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50">Cancel</button>
              <button onClick={handleCreateEdit} disabled={isSubmitting || !formData.name.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50">
                {isSubmitting && <Loader className="h-3.5 w-3.5 animate-spin" />}
                {modal.type === "edit" ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Members Modal ── */}
      {modal.type === "members" && modal.department && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-white">{modal.department.name}</h2>
                <p className="mt-0.5 text-xs text-zinc-400">Team members</p>
              </div>
              <button onClick={closeModal} className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
                  <Loader className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : !modal.department.members || modal.department.members.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Users className="h-6 w-6 text-zinc-600" />
                  <p className="text-sm text-zinc-500">No members assigned yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {modal.department.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{member.firstName} {member.lastName}</p>
                        <p className="truncate text-xs text-zinc-500">{member.email}</p>
                      </div>
                      <div className="ml-3 flex items-center gap-2.5">
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300">{member.role}</span>
                        <span className={cn("h-2 w-2 rounded-full", member.isActive ? "bg-emerald-500" : "bg-zinc-600")} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StatPill({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums text-white", className)}>{value}</span>
    </div>
  );
}
