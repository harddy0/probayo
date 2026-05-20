"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Loader,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchKnownIssues,
  createKnownIssue,
  updateKnownIssue,
  deleteKnownIssue,
  updateKnownIssueStatus,
} from "@/lib/api/known-issues";
import { isApiError } from "@/lib/api/client";
import type { KnownIssue } from "@/lib/types/known-issues";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  Active: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  Resolved: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
};

// ── Page ──

export default function AdminKnownIssuesPage() {
  const [issues, setIssues] = useState<KnownIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state
  const [modal, setModal] = useState<{
    type: "create" | "edit" | null;
    issue: KnownIssue | null;
  }>({ type: null, issue: null });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  // ── Load data ──

  const loadIssues = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchKnownIssues();
      setIssues(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load known issues.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIssues();
  }, [loadIssues]);

  // ── Handlers ──

  const openCreate = () => {
    setFormData({ title: "", description: "" });
    setModal({ type: "create", issue: null });
    setError(null);
  };

  const openEdit = (issue: KnownIssue) => {
    setFormData({
      title: issue.title,
      description: issue.description ?? "",
    });
    setModal({ type: "edit", issue });
    setError(null);
  };

  const closeModal = () => {
    setModal({ type: null, issue: null });
    setFormData({ title: "", description: "" });
    setError(null);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (modal.type === "edit" && modal.issue) {
        const updated = await updateKnownIssue(modal.issue.id, {
          title: formData.title.trim(),
          description: formData.description.trim(),
        });
        setIssues((prev) =>
          prev.map((i) => (i.id === modal.issue!.id ? updated : i)),
        );
      } else {
        const created = await createKnownIssue({
          title: formData.title.trim(),
          description: formData.description.trim(),
        });
        setIssues((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (id: string) => {
    if (!confirm("Resolve this known issue? It will be moved to the resolved section.")) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const resolved = await updateKnownIssueStatus(id, { status: "Resolved" });
      setIssues((prev) =>
        prev.map((i) => (i.id === id ? resolved : i)),
      );
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to resolve issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this known issue? This cannot be undone.")) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteKnownIssue(id);
      setIssues((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Delete failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeIssues = issues.filter((i) => i.status === "Active");
  const resolvedIssues = issues.filter((i) => i.status === "Resolved");

  // ── Render ──

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10">
              <AlertTriangle className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Maintenance
            </span>
          </div>
          <h1 className="text-[22px] font-medium tracking-tight text-white">
            Known Issues
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track and manage known system issues for ticket deflection.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100"
        >
          <Plus className="h-4 w-4" />
          New issue
        </button>
      </div>

      {/* Error */}
      {error ? (
        <div className="flex items-center gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      ) : null}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="h-4 w-4 rounded bg-white/10" />
              <div className="h-4 w-48 rounded bg-white/10" />
              <div className="ml-auto h-4 w-20 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : issues.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-12">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <AlertTriangle className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="text-sm font-medium text-zinc-300">
            No known issues yet
          </p>
          <p className="text-xs text-zinc-500">
            Create your first known issue to help deflect incoming tickets.
          </p>
          <button
            onClick={openCreate}
            className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Create issue
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active issues */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-zinc-400">
                Active ({activeIssues.length})
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              {activeIssues.map((issue, idx) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  onEdit={() => openEdit(issue)}
                  onResolve={() => handleResolve(issue.id)}
                  onDelete={() => handleDelete(issue.id)}
                  isLast={idx === activeIssues.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Resolved issues */}
          {resolvedIssues.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-zinc-500">
                  Resolved ({resolvedIssues.length})
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-zinc-800/60 opacity-60">
                {resolvedIssues.map((issue, idx) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onEdit={() => openEdit(issue)}
                    onResolve={() => handleResolve(issue.id)}
                    onDelete={() => handleDelete(issue.id)}
                    isLast={idx === resolvedIssues.length - 1}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal.type ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-[600px] rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
              <div>
                <h2 className="text-base font-medium text-white">
                  {modal.type === "edit" ? "Edit issue" : "New known issue"}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {modal.type === "edit"
                    ? "Update the issue details below."
                    : "Document a new known issue for ticket deflection."}
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-5 py-4">
              {error ? (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <p className="text-sm text-rose-200">{error}</p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="ki-title">Title</Label>
                <Input
                  id="ki-title"
                  placeholder="e.g. Login timeout on Safari"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, title: e.target.value }))
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ki-desc">Description</Label>
                <textarea
                  id="ki-desc"
                  rows={4}
                  placeholder="Describe the issue, affected systems, and known workarounds…"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  disabled={isSubmitting}
                  className="flex w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-5 py-3.5">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="h-8 rounded-lg border border-white/10 px-3 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !formData.title.trim() ||
                  !formData.description.trim()
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {modal.type === "edit" ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ── Issue Row ──

function IssueRow({
  issue,
  onEdit,
  onResolve,
  onDelete,
  isLast,
}: {
  issue: KnownIssue;
  onEdit: () => void;
  onResolve: () => void;
  onDelete: () => void;
  isLast: boolean;
}) {
  const isResolved = issue.status === "Resolved";
  return (
    <div
      className={cn(
        "group flex items-center gap-4 bg-white/[0.02] px-4 py-2.5 transition hover:bg-white/[0.05]",
        !isLast && "border-b border-white/[0.06]",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          isResolved
            ? "border-emerald-500/20 bg-emerald-500/10"
            : "border-amber-500/20 bg-amber-500/10",
        )}
      >
        {isResolved ? (
          <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        )}
      </div>

      {/* Title & description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-100">
            {issue.title}
          </p>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
              statusColors[issue.status] || "border-white/10 bg-white/5 text-zinc-400",
            )}
          >
            {issue.status}
          </span>
        </div>
        {issue.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
            {issue.description}
          </p>
        ) : null}
      </div>

      {/* Created date */}
      <span className="hidden shrink-0 text-xs text-zinc-500 sm:block">
        {new Date(issue.createdAt).toLocaleDateString()}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        {!isResolved ? (
          <button
            onClick={onResolve}
            title="Mark as resolved"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-emerald-500/10 hover:text-emerald-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
