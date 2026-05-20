"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader,
  Pencil,
  Plus,
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



// ── Page ──

export default function AdminTicketCategoriesPage() {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const activeCategories = categories.filter((c) => c.isActive !== false);
  const inactiveCategories = categories.filter((c) => c.isActive === false);

  // ── Render ──

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10">
              <Tags className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Configuration
            </span>
          </div>
          <h1 className="text-[22px] font-medium tracking-tight text-white">
            Ticket Categories
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create and manage ticket categories used across the system.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100"
        >
          <Plus className="h-4 w-4" />
          New category
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
      ) : categories.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-12">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Tags className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="text-sm font-medium text-zinc-300">
            No categories yet
          </p>
          <p className="text-xs text-zinc-500">
            Create your first category to organize tickets.
          </p>
          <button
            onClick={openCreate}
            className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Create category
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active categories */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-zinc-400">
                Active ({activeCategories.length})
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              {activeCategories.map((cat, idx) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  onEdit={() => openEdit(cat)}
                  onDelete={() => handleDelete(cat.id)}
                  isLast={idx === activeCategories.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Inactive categories */}
          {inactiveCategories.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full border border-zinc-500" />
                <span className="text-xs font-medium text-zinc-500">
                  Inactive ({inactiveCategories.length})
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-zinc-800/60 opacity-60">
                {inactiveCategories.map((cat, idx) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    onEdit={() => openEdit(cat)}
                    onDelete={() => handleDelete(cat.id)}
                    isLast={idx === inactiveCategories.length - 1}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div          className="w-full max-w-[600px] rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
              <div>
                <h2 className="text-base font-medium text-white">
                  {modal.type === "edit"
                    ? "Edit category"
                    : "New category"}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {modal.type === "edit"
                    ? "Update the category details below."
                    : "Add a new category for ticket classification."}
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

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Hardware, Software, Network"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description</Label>
                <textarea
                  id="cat-desc"
                  rows={3}
                  placeholder="Optional description of this category…"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  disabled={isSubmitting}
                  className="flex w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isActive}
                  onClick={() =>
                    setFormData((p) => ({ ...p, isActive: !p.isActive }))
                  }
                  disabled={isSubmitting}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full border border-white/10 transition-colors",
                    formData.isActive
                      ? "bg-emerald-500/80 border-emerald-500/30"
                      : "bg-zinc-700",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      formData.isActive
                        ? "translate-x-[18px]"
                        : "translate-x-0.5",
                    )}
                  />
                </button>
                <span className="text-sm text-zinc-300">
                  Active — visible in ticket creation
                </span>
              </label>
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
                disabled={isSubmitting || !formData.name.trim()}
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

// ── Category Row ──

function CategoryRow({
  category,
  onEdit,
  onDelete,
  isLast,
}: {
  category: TicketCategory;
  onEdit: () => void;
  onDelete: () => void;
  isLast: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 bg-white/[0.02] px-4 py-2.5 transition hover:bg-white/[0.05]",
        !isLast && "border-b border-white/[0.06]",
      )}
    >
      {/* Icon */}
      <Tags className="h-4 w-4 shrink-0 text-zinc-500" />

      {/* Name & description */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">
          {category.name}
        </p>
        {category.description ? (
          <p className="truncate text-xs text-zinc-500">
            {category.description}
          </p>
        ) : null}
      </div>

      {/* Ticket count */}
      {category.ticketCount !== undefined ? (
        <span className="hidden shrink-0 text-xs text-zinc-500 sm:block">
          {category.ticketCount} ticket{category.ticketCount !== 1 ? "s" : ""}
        </span>
      ) : null}



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
