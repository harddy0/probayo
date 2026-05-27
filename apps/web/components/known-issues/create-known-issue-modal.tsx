"use client";

import { useState } from "react";
import { Loader, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createKnownIssue } from "@/lib/api/known-issues";
import { isApiError } from "@/lib/api/client";
import type { KnownIssue } from "@/lib/types/known-issues";

type CreateKnownIssueModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (issue: KnownIssue) => void;
  /** Pre-fill the title field */
  initialTitle?: string;
  /** Pre-fill the description field */
  initialDescription?: string;
};

export default function CreateKnownIssueModal({
  open,
  onClose,
  onCreated,
  initialTitle = "",
  initialDescription = "",
}: CreateKnownIssueModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const t = title.trim();
    const d = description.trim();
    if (!t) { setError("Title is required."); return; }
    if (!d) { setError("Description is required."); return; }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createKnownIssue({ title: t, description: d });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to create known issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold text-white">New known issue</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Document a new known issue for ticket deflection.
            </p>
          </div>
          <button
            onClick={onClose}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-lg text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Description</Label>
            <textarea
              rows={4}
              placeholder="Describe the issue, affected systems, and known workarounds…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="flex w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800 px-5 py-3.5">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 rounded-lg border border-white/10 px-3.5 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {isSubmitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
