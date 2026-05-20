"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
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
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-amber-200">
          Attachments can be added after the ticket is created.
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-300">Title</Label>
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

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-300">Description</Label>
          <Textarea
            placeholder="Describe what happened and what you need help with"
            value={formState.description}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-300">Category</Label>
          <Select
            value={formState.categoryId}
            onValueChange={(value) =>
              setFormState((current) => ({ ...current, categoryId: value }))
            }
          >
            <SelectTrigger>
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
          {categoryOptions.length === 0 ? (
            <p className="text-xs text-amber-300">
              No active categories available yet.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-300">Priority</Label>
          <Select
            value={formState.priority}
            onValueChange={(value) =>
              setFormState((current) => ({
                ...current,
                priority: value as TicketPriority,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formState.priority === "Critical" ? (
            <p className="text-xs text-amber-300/80">
              Critical means it is serious and should not be selected for small
              issues.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-300">Related asset <span className="text-zinc-500">(optional)</span></Label>
          <Select
            value={formState.assetId}
            onValueChange={(value) =>
              setFormState((current) => ({ ...current, assetId: value }))
            }
          >
            <SelectTrigger>
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
          {assets.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No assigned assets available.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-300">Known issue <span className="text-zinc-500">(optional)</span></Label>
          <Select
            value={formState.knownIssueId}
            onValueChange={(value) =>
              setFormState((current) => ({ ...current, knownIssueId: value }))
            }
          >
            <SelectTrigger>
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
          {knownIssues.length > 0 ? (
            <p className="text-xs text-zinc-500">
              Review active known issues before submitting.
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5">
            <p className="text-xs text-rose-200">{error}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
