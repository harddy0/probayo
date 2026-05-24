"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bug, Check, Loader, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchActiveKnownIssues, fetchKnownIssues } from "@/lib/api/known-issues";
import { isApiError } from "@/lib/api/client";
import type { KnownIssue } from "@/lib/types/known-issues";
import { cn } from "@/lib/utils";

export default function BatchAttachModal({
  open,
  onClose,
  onAttach,
  selectedCount,
}: {
  open: boolean;
  onClose: () => void;
  onAttach: (knownIssueId: string) => Promise<void>;
  selectedCount: number;
}) {
  const [knownIssues, setKnownIssues] = useState<KnownIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = showResolved
        ? await fetchKnownIssues()
        : await fetchActiveKnownIssues();
      setKnownIssues(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load known issues.");
    } finally {
      setIsLoading(false);
    }
  }, [showResolved]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setSearch("");
      setError(null);
    }
  }, [open]);

  const filtered = knownIssues.filter((ki) =>
    ki.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = async () => {
    if (!selectedId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onAttach(selectedId);
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to attach.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Attach to known issue</h2>
            <p className="text-xs text-zinc-500">{selectedCount} ticket{selectedCount !== 1 ? "s" : ""} selected</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search + toggle */}
        <div className="border-b border-white/[0.06] px-5 py-3 space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search known issues…"
              className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-xs text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-white/20"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded border-white/20 bg-white/5"
            />
            Include resolved
          </label>
        </div>

        {/* List */}
        <div className="max-h-64 overflow-y-auto px-5 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <Bug className="h-5 w-5 text-zinc-600" />
              <p className="text-xs text-zinc-500">
                {search ? "No known issues match your search." : "No active known issues."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((ki) => (
                <button
                  key={ki.id}
                  type="button"
                  onClick={() => setSelectedId(ki.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                    selectedId === ki.id
                      ? "bg-white/10"
                      : "hover:bg-white/5",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                      selectedId === ki.id
                        ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                        : "border-white/10 bg-white/5",
                    )}
                  >
                    {selectedId === ki.id ? <Check className="h-3 w-3" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{ki.title}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {ki.status === "Resolved" ? "Resolved" : "Active"}
                    </p>
                  </div>
                  {ki.status === "Resolved" ? (
                    <span className="shrink-0 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 text-[9px] text-zinc-400">
                      Resolved
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
          <Button
            className="h-9 bg-white/10 px-4 text-xs text-zinc-200 hover:bg-white/15"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="h-9 px-4 text-xs"
            onClick={() => void handleSubmit()}
            disabled={!selectedId || isSubmitting}
          >
            {isSubmitting ? (
              <Loader className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bug className="mr-1.5 h-3.5 w-3.5" />
            )}
            Attach {selectedCount} ticket{selectedCount !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
