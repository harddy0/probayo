"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const priorityOptions: { value: TicketPriority; label: string }[] = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
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
  categoryId: "",
  assetId: "",
  priority: "Medium",
  knownIssueId: "",
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
    if (!open) {
      return;
    }

    setFormState(emptyFormState);
    setError(null);
  }, [open]);

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.isActive !== false),
    [categories],
  );

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
    if (!formState.categoryId) {
      setError("Category is required.");
      return;
    }

    const payload: CreateTicketRequest = {
      title,
      description,
      categoryId: formState.categoryId,
      priority: formState.priority,
    };

    if (formState.assetId) {
      payload.assetId = formState.assetId;
    }

    if (formState.knownIssueId) {
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="New ticket"
      description="Provide clear context so IT staff can respond quickly."
      confirmLabel="Create ticket"
      loading={isSubmitting}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-400">
          Attachments can be added after the ticket is created.
        </div>

        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            placeholder="Short summary of the issue"
            value={formState.title}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Describe what happened and what you need help with"
            value={formState.description}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <select
            value={formState.categoryId}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                categoryId: event.target.value,
              }))
            }
            className="flex h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-zinc-50 outline-none transition hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
          >
            <option value="">Select a category</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {categoryOptions.length === 0 ? (
            <p className="text-xs text-amber-300">
              No active categories available yet.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <select
            value={formState.priority}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                priority: event.target.value as TicketPriority,
              }))
            }
            className="flex h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-zinc-50 outline-none transition hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {formState.priority === "Critical" ? (
            <p className="text-xs text-amber-300">
              Critical means it is serious and should not be selected for small
              issues.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Related asset (optional)</Label>
          <select
            value={formState.assetId}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                assetId: event.target.value,
              }))
            }
            className="flex h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-zinc-50 outline-none transition hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
          >
            <option value="">No asset linked</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {formatAssetLabel(asset)}
              </option>
            ))}
          </select>
          {assets.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No assigned assets available.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Known issue (optional)</Label>
          <select
            value={formState.knownIssueId}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                knownIssueId: event.target.value,
              }))
            }
            className="flex h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-zinc-50 outline-none transition hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
          >
            <option value="">No known issue</option>
            {knownIssues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                {issue.title}
              </option>
            ))}
          </select>
          {knownIssues.length > 0 ? (
            <p className="text-xs text-zinc-500">
              Review active known issues before submitting.
            </p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </Modal>
  );
}
