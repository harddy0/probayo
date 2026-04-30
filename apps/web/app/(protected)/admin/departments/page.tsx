"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit, Building2, Users, X, Loader, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  fetchDepartmentById,
} from "@/lib/api/departments";
import { isApiError } from "@/lib/api/client";
import type { Department } from "@/lib/types/departments";

type ModalState = {
  type: "create" | "edit" | "members" | null;
  department: Department | null;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modal, setModal] = useState<ModalState>({ type: null, department: null });
  const [formData, setFormData] = useState({ name: "", headUserId: "" });

  // Load departments on mount
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllDepartments();
      setDepartments(data);
    } catch (err) {
      const message = isApiError(err) ? err.message : "Failed to load departments";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEdit = async () => {
    if (!formData.name.trim()) {
      setError("Department name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (modal.type === "edit" && modal.department) {
        // Update existing
        const updated = await updateDepartment(modal.department.id, {
          name: formData.name,
          headUserId: formData.headUserId || null,
        });
        setDepartments((prev) =>
          prev.map((d) => (d.id === modal.department!.id ? updated : d))
        );
      } else {
        // Create new
        const newDept = await createDepartment({
          name: formData.name,
          headUserId: formData.headUserId || undefined,
        });
        setDepartments((prev) => [newDept, ...prev]);
      }

      setModal({ type: null, department: null });
      setFormData({ name: "", headUserId: "" });
    } catch (err) {
      const message = isApiError(err) ? err.message : "Operation failed";
      setError(message);
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
      const message = isApiError(err) ? err.message : "Delete failed";
      setError(message);
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
      const message = isApiError(err) ? err.message : "Failed to load members";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setModal({ type: null, department: null });
    setFormData({ name: "", headUserId: "" });
    setError(null);
  };

  return (
    <section className="space-y-6 pb-24">
      {/* Header */}
      <div className="mt-2">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Organization
          </span>
        </div>
        <h1 className="text-5xl font-bold text-white">Departments</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Manage and organize your company departments and team structures.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex gap-3 rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-red-500/5 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading && !modal.type ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 py-16">
          <Loader className="h-5 w-5 animate-spin text-zinc-500" />
          <p className="text-sm text-zinc-500">Loading departments...</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900 p-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/50">
              <Building2 className="h-8 w-8 text-zinc-600" />
            </div>
          </div>
          <p className="mb-2 text-sm font-medium text-zinc-300">No departments yet</p>
          <p className="mb-6 text-xs text-zinc-500">
            Create your first department to get started.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            <Plus className="h-4 w-4" />
            Create Department
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-900/60 to-zinc-900/30 transition hover:border-zinc-700 hover:from-zinc-900/80 hover:to-zinc-900/50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="relative flex items-center justify-between p-5">
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-white/20 to-white/5">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate text-base">{dept.name}</h3>
                    {dept.headUser && (
                      <p className="text-xs text-zinc-500 truncate mt-1">
                        Head: {dept.headUser.firstName} {dept.headUser.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openMembers(dept)}
                    className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20 backdrop-blur-sm"
                  >
                    <Users className="h-4 w-4" />
                    Members
                  </button>
                  <button
                    onClick={() => openEdit(dept)}
                    className="rounded-lg bg-white/10 p-2 text-zinc-400 transition hover:bg-white/20 hover:text-white backdrop-blur-sm"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    disabled={isSubmitting}
                    className="rounded-lg bg-red-500/10 p-2 text-red-500 transition hover:bg-red-500/20 disabled:opacity-50 backdrop-blur-sm"
                  >
                    {isSubmitting ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition hover:scale-110 active:scale-95"
      >
        <Plus className="h-6 w-6 text-zinc-950 font-bold" />
      </button>

      {/* Create/Edit Modal */}
      {(modal.type === "create" || modal.type === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800/50 px-6 py-5">
              <h2 className="text-lg font-semibold text-white">
                {modal.type === "edit" ? "Edit Department" : "New Department"}
              </h2>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="text-zinc-500 transition hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {error && (
                <div className="flex gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-300">Department Name</Label>
                <Input
                  placeholder="Engineering, Sales, Operations..."
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={isSubmitting}
                  className="rounded-lg border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-600 focus:border-white/20 focus:ring-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-300">Head User ID (Optional)</Label>
                <Input
                  placeholder="UUID of department head"
                  value={formData.headUserId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, headUserId: e.target.value }))
                  }
                  disabled={isSubmitting}
                  className="rounded-lg border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-600 focus:border-white/20 focus:ring-white/10"
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-zinc-800/50 px-6 py-4">
              <button
                onClick={handleCreateEdit}
                disabled={isSubmitting || !formData.name.trim()}
                className="flex-1 rounded-lg bg-white py-2.5 font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin inline" />}
                {modal.type === "edit" ? "Update" : "Create"}
              </button>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {modal.type === "members" && modal.department && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800/50 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">{modal.department.name}</h2>
                <p className="text-xs text-zinc-500 mt-1">Team members</p>
              </div>
              <button
                onClick={closeModal}
                className="text-zinc-500 transition hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader className="h-5 w-5 animate-spin text-zinc-500" />
                  <p className="text-sm text-zinc-500">Loading members...</p>
                </div>
              ) : !modal.department.members || modal.department.members.length === 0 ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-800/20 py-8 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
                  <p className="text-sm text-zinc-500">No members assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {modal.department.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/30 px-4 py-3 hover:bg-zinc-800/50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                        <span className="rounded-md bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-200">
                          {member.role}
                        </span>
                        <div
                          className={`h-2 w-2 rounded-full ${
                            member.isActive ? "bg-green-500" : "bg-zinc-600"
                          }`}
                        />
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
