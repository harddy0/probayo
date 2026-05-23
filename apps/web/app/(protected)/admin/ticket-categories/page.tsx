"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchTicketCategories,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory,
} from "@/lib/api/ticket-categories";
import { isApiError } from "@/lib/api/client";
import type { TicketCategory } from "@/lib/types/ticket-categories";
import { cn } from "@/lib/utils";

export default function AdminTicketCategoriesPage() {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    type: "create" | "edit" | null;
    category: TicketCategory | null;
  }>({ type: null, category: null });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  // ── Load data ──

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTicketCategories(true);
      setCategories(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // ── Derived ──

  const filteredCats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)),
    );
  }, [categories, searchQuery]);

  const activeCategories = useMemo(
    () => filteredCats.filter((c) => c.isActive !== false),
    [filteredCats],
  );
  const inactiveCategories = useMemo(
    () => filteredCats.filter((c) => c.isActive === false),
    [filteredCats],
  );

  const catStats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.isActive !== false).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [categories]);

  // ── Handlers ──

  const openCreate = () => {
    setFormData({ name: "", description: "", isActive: true });
    setModal({ type: "create", category: null });
    setError(null);
  };

  const openEdit = (cat: TicketCategory) => {
    setFormData({
      name: cat.name,
      description: cat.description ?? "",
      isActive: cat.isActive ?? true,
    });
    setModal({ type: "edit", category: cat });
    setError(null);
  };

  const closeModal = () => {
    setModal({ type: null, category: null });
    setFormData({ name: "", description: "", isActive: true });
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
    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (modal.type === "edit" && modal.category) {
        const updated = await updateTicketCategory(modal.category.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          isActive: formData.isActive,
        });
        setCategories((prev) =>
          prev.map((c) => (c.id === modal.category!.id ? updated : c)),
        );
      } else {
        const created = await createTicketCategory({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          isActive: formData.isActive,
        });
        setCategories((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? This cannot be undone.")) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteTicketCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(isApiError(err) ? err.message : "Delete failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = filteredCats.length > 0;

  // ── Render ──

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Ultra-compact header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <Tags className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Ticket Categories</h1>
            <p className="text-xs text-zinc-500">Create and manage ticket categories.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <StatPill label="Total" value={catStats.total} />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Active" value={catStats.active} className="text-emerald-400" />
            <div className="h-4 w-px bg-white/10" />
            <StatPill label="Inactive" value={catStats.inactive} className="text-zinc-500" />
          </div>
          <button
            onClick={loadCategories}
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
          placeholder="Search categories by name or description…"
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
            <Tags className="h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">
              {searchQuery ? "No matches" : "No categories yet"}
            </p>
            <p className="text-xs text-zinc-500">
              {searchQuery ? "Try a different keyword." : "Create your first category to organize tickets."}
            </p>
            {searchQuery ? (
              <button onClick={() => setSearchQuery("")} className="mt-2 h-8 rounded-lg bg-zinc-800 px-3 text-xs text-zinc-50 hover:bg-zinc-700">
                Clear search
              </button>
            ) : (
              <button onClick={openCreate} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-zinc-950 hover:bg-zinc-100">
                <Plus className="h-3.5 w-3.5" />
                Create category
              </button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            {/* Active categories */}
            {activeCategories.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/5 bg-zinc-900/95 px-4 py-2 backdrop-blur-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-zinc-400">
                    Active ({activeCategories.length})
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {activeCategories.map((cat) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      onEdit={() => openEdit(cat)}
                      onDelete={() => handleDelete(cat.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive categories */}
            {inactiveCategories.length > 0 && (
              <div className="opacity-60">
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/5 bg-zinc-900/95 px-4 py-2 backdrop-blur-sm">
                  <div className="h-3.5 w-3.5 rounded-full border border-zinc-500" />
                  <span className="text-xs font-medium text-zinc-500">
                    Inactive ({inactiveCategories.length})
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {inactiveCategories.map((cat) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      onEdit={() => openEdit(cat)}
                      onDelete={() => handleDelete(cat.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal.type && (
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
                <h2 className="text-base font-semibold text-white">
                  {modal.type === "edit" ? "Edit category" : "New category"}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {modal.type === "edit"
                    ? "Update the category details below."
                    : "Add a new category for ticket classification."}
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
                <Label className="text-xs text-zinc-400">Name</Label>
                <Input
                  placeholder="e.g. Hardware, Software, Network"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Description</Label>
                <textarea
                  rows={3}
                  placeholder="Optional description of this category…"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  disabled={isSubmitting}
                  className="flex w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Active toggle */}
              <label className="flex cursor-pointer items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isActive}
                  onClick={() => setFormData((p) => ({ ...p, isActive: !p.isActive }))}
                  disabled={isSubmitting}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full border border-white/10 transition-colors",
                    formData.isActive
                      ? "border-emerald-500/30 bg-emerald-500/80"
                      : "bg-zinc-700",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      formData.isActive ? "translate-x-[18px]" : "translate-x-0.5",
                    )}
                  />
                </button>
                <span className="text-sm text-zinc-300">Active — visible in ticket creation</span>
              </label>
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
                disabled={isSubmitting || !formData.name.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {isSubmitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : null}
                {modal.type === "edit" ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Category Row ──

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: TicketCategory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-4 bg-white/[0.02] px-4 py-2.5 transition hover:bg-white/[0.05]">
      {/* Icon */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <Tags className="h-3.5 w-3.5 text-zinc-400" />
      </div>

      {/* Name & description */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">
          {category.name}
        </p>
        {category.description && (
          <p className="truncate text-xs text-zinc-500">{category.description}</p>
        )}
      </div>

      {/* Ticket count */}
      {category.ticketCount !== undefined && (
        <span className="hidden shrink-0 text-xs text-zinc-500 sm:block">
          {category.ticketCount} ticket{category.ticketCount !== 1 ? "s" : ""}
        </span>
      )}

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
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
