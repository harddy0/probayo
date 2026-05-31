"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader, Plus, Ticket as TicketIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { isApiError } from "@/lib/api/client";
import { createTicket } from "@/lib/api/tickets";
import type { Asset } from "@/lib/types/assets";
import type {
  CreateTicketRequest,
  KnownIssue,
  Ticket,
  TicketCategory,
  TicketPriority,
} from "@/lib/types/tickets";

const priorityOptions: { value: TicketPriority; label: string; labelColor: string }[] = [
  { value: "Low", label: "Low", labelColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" },
  { value: "Medium", label: "Medium", labelColor: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
  { value: "High", label: "High", labelColor: "border-orange-500/30 bg-orange-500/10 text-orange-200" },
  { value: "Critical", label: "Critical", labelColor: "border-rose-500/30 bg-rose-500/10 text-rose-200" },
];

type TicketCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
  categories: TicketCategory[];
  assets: Asset[];
  knownIssues: KnownIssue[];
};

type FormState = {
  title: string;
  description: string;
  categoryId: string;
  assetId: string;
  priority: TicketPriority;
  knownIssueId: string;
};

const emptyFormState: FormState = {
  title: "",
  description: "",
  categoryId: "__none__",
  assetId: "__none__",
  priority: "Medium",
  knownIssueId: "__none__",
};

const formatAssetLabel = (asset: Asset) => {
  const tag = asset.assetTag ? `#${asset.assetTag}` : "";
  const descriptor = asset.model || asset.brand || asset.deviceType;
  return tag ? `${descriptor} ${tag}` : descriptor;
};

export default function TicketCreateModal({
  open,
  onClose,
  onCreated,
  categories,
  assets,
  knownIssues,
}: TicketCreateModalProps) {
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (!open) return;
    setFormState(emptyFormState);
    setError(null);
  }, [open]);

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.isActive !== false),
    [categories],
  );

  const canSubmit =
    formState.title.trim().length > 0 &&
    formState.description.trim().length > 0 &&
    formState.categoryId !== "__none__";

  const handleConfirm = async () => {
    const title = formState.title.trim();
    const description = formState.description.trim();

    if (!title) {
      setError("Title is required.");
      return;
    }
    if (!description) {
      setError("Description is required.");
      return;
    }
    if (!formState.categoryId || formState.categoryId === "__none__") {
      setError("Category is required.");
      return;
    }

    const payload: CreateTicketRequest = {
      title,
      description,
      categoryId: formState.categoryId,
      priority: formState.priority,
    };

    if (formState.assetId && formState.assetId !== "__none__") {
      payload.assetId = formState.assetId;
    }

    if (formState.knownIssueId && formState.knownIssueId !== "__none__") {
      payload.knownIssueId = formState.knownIssueId;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createTicket(payload);
      push({
        title: "Ticket created",
        description: "Your request has been sent to IT staff.",
        variant: "success",
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to create ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      <div
        className="mx-auto flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <TicketIcon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-white">New ticket</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Provide clear context so IT staff can respond quickly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0 rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
          {/* Attachments info */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400">
            <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>You can add files like screenshots or documents after the ticket is created.</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Row 1: Title + Category */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Title</Label>
              <Input
                placeholder="Short summary of the issue"
                value={formState.title}
                onChange={(e) => updateField("title", e.target.value)}
                disabled={isSubmitting}
                className="h-9 rounded-lg text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Category</Label>
              <Select
                value={formState.categoryId}
                onValueChange={(value) => updateField("categoryId", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select a category</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryOptions.length === 0 && (
                <p className="text-xs text-amber-300">No active categories available yet.</p>
              )}
            </div>
          </div>

          {/* Row 2: Priority + Related asset */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Priority</Label>
              <Select
                value={formState.priority}
                onValueChange={(value) => updateField("priority", value as TicketPriority)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${option.labelColor}`}>
                          {option.label}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formState.priority === "Critical" && (
                <p className="text-xs text-amber-300/80">
                  Critical means it is serious and should not be selected for small issues.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">
                Related asset <span className="text-zinc-600">(optional)</span>
              </Label>
              <Select
                value={formState.assetId}
                onValueChange={(value) => updateField("assetId", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="No asset linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No asset linked</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {formatAssetLabel(asset)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assets.length === 0 && (
                <p className="text-xs text-zinc-500">No assigned assets available.</p>
              )}
            </div>
          </div>

          {/* Row 3: Description (full width) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Description</Label>
            <Textarea
              placeholder="Describe what happened and what you need help with"
              value={formState.description}
              onChange={(e) => updateField("description", e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="rounded-lg text-sm"
            />
          </div>

          {/* Row 4: Known issue (full width, optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">
              Known issue <span className="text-zinc-600">(optional)</span>
            </Label>
            <Select
              value={formState.knownIssueId}
              onValueChange={(value) => updateField("knownIssueId", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-9 rounded-lg text-sm">
                <SelectValue placeholder="No known issue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No known issue</SelectItem>
                {knownIssues.map((issue) => (
                  <SelectItem key={issue.id} value={issue.id}>
                    {issue.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {knownIssues.length > 0 && (
              <p className="text-xs text-zinc-500">
                Review active known issues before submitting.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-zinc-800 px-5 py-3.5">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 rounded-lg border border-white/10 px-3.5 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !canSubmit}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Create ticket
          </button>
        </div>
      </div>
    </div>
  );
}
