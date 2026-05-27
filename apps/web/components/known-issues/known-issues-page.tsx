"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Loader,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchKnownIssues,
  updateKnownIssue,
  deleteKnownIssue,
  updateKnownIssueStatus,
} from "@/lib/api/known-issues";
import { isApiError } from "@/lib/api/client";
import type { KnownIssue } from "@/lib/types/known-issues";
import { cn } from "@/lib/utils";
import CreateKnownIssueModal from "@/components/known-issues/create-known-issue-modal";

const statusColors: Record<string, string> = {
  Active: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  Resolved: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
};

export type KnownIssuesPageProps = {
  /** Title shown in the page header */
  title?: string;
  /** Description shown below the title */
  description?: string;
};

export default function KnownIssuesPage({
  title = "Known Issues",
  description = "Track known system issues for ticket deflection.",
}: KnownIssuesPageProps) {
  const [issues, setIssues] = useState<KnownIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ── Derived ──

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q),
    );
  }, [issues, searchQuery]);

  const activeIssues = useMemo(
    () => filteredIssues.filter((i) => i.status === "Active"),
    [filteredIssues],
  );
  const resolvedIssues = useMemo(
    () => filteredIssues.filter((i) => i.status === "Resolved"),
    [filteredIssues],
  );

  const issueStats = useMemo(() => {
    const total = issues.length;
    const active = issues.filter((i) => i.status === "Active").length;
    const resolved = total - active;
    return { total, active, resolved };
  }, [issues]);

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

  // Escape key closes modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeModal]);

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
        closeModal();
      }
    } catch (err) {
      setError(isApiError(err) ? err.message : "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (id: string) => {
    if (!confirm("Resolve this known issue? All attached open tickets will be auto-resolved.")) return;

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

  const hasContent = filteredIssues.length > 0;

  // ── Render ──

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Ultra-compact header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{title}</h1>
            <p className="text-xs text-zinc-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <StatPill label="Total" value={issueStats.total} />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Active" value={issueStats.active} className="text-amber-400" />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Resolved" value={issueStats.resolved} className="text-emerald-400" />
          </div>
          <button
            onClick={loadIssues}
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
          placeholder="Search known issues by title or description…"
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

      {/* ── Content (fills remaining height, scrolls internally) ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2.5 text-sm text-zinc-500">
            <Loader className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : !hasContent ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <AlertTriangle className="h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">
              {searchQuery ? "No matches" : "No known issues yet"}
            </p>
            <p className="text-xs text-zinc-500">
              {searchQuery ? "Try a different keyword." : "Create your first known issue to help deflect incoming tickets."}
            </p>
            {searchQuery ? (
              <button onClick={() => setSearchQuery("")} className="mt-2 h-8 rounded-lg bg-zinc-800 px-3 text-xs text-zinc-50 hover:bg-zinc-700">
                Clear search
              </button>
            ) : (
              <button onClick={openCreate} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-zinc-950 hover:bg-zinc-100">
                <Plus className="h-3.5 w-3.5" />
                Create issue
              </button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            {/* Active issues */}
            {activeIssues.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/5 bg-zinc-900/95 px-4 py-2 backdrop-blur-sm">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-zinc-400">
                    Active ({activeIssues.length})
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {activeIssues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      onEdit={() => openEdit(issue)}
                      onResolve={() => handleResolve(issue.id)}
                      onDelete={() => handleDelete(issue.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Resolved issues */}
            {resolvedIssues.length > 0 && (
              <div className="opacity-60">
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/5 bg-zinc-900/95 px-4 py-2 backdrop-blur-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-zinc-500">
                    Resolved ({resolvedIssues.length})
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {resolvedIssues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      onEdit={() => openEdit(issue)}
                      onResolve={() => handleResolve(issue.id)}
                      onDelete={() => handleDelete(issue.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Modal (shared) ── */}
      <CreateKnownIssueModal
        open={modal.type === "create"}
        onClose={closeModal}
        onCreated={(issue) => {
          setIssues((prev) => [issue, ...prev]);
        }}
      />

      {/* ── Edit Modal ── */}
      {modal.type === "edit" && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-white">Edit issue</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Update the issue details below.
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-5 py-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Title</Label>
                <Input
                  placeholder="e.g. Login timeout on Safari"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Description</Label>
                <textarea
                  rows={4}
                  placeholder="Describe the issue, affected systems, and known workarounds…"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  disabled={isSubmitting}
                  className="flex w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800 px-5 py-3.5">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="h-9 rounded-lg border border-white/10 px-3.5 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {isSubmitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : null}
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Issue Row ──

function IssueRow({
  issue,
  onEdit,
  onResolve,
  onDelete,
}: {
  issue: KnownIssue;
  onEdit: () => void;
  onResolve: () => void;
  onDelete: () => void;
}) {
  const isResolved = issue.status === "Resolved";
  return (
    <div className="group flex items-center gap-4 bg-white/[0.02] px-4 py-2.5 transition hover:bg-white/[0.05]">
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
        {issue.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
            {issue.description}
          </p>
        )}
      </div>

      {/* Created date */}
      <span className="hidden shrink-0 text-xs text-zinc-500 sm:block">
        {new Date(issue.createdAt).toLocaleDateString()}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        {!isResolved && (
          <button
            onClick={onResolve}
            title="Mark as resolved"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-emerald-500/10 hover:text-emerald-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
        )}
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

function StatPill({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums text-white", className)}>{value}</span>
    </div>
  );
}
