"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  Loader,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isApiError } from "@/lib/api/client";
import {
  createSlaPolicy,
  fetchSlaPolicies,
  updateSlaPolicy,
} from "@/lib/api/sla-policies";
import type { SlaPolicy, SlaPolicyPriority } from "@/lib/types/sla-policies";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

const priorityOptions: SlaPolicyPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

const priorityLabels: Record<SlaPolicyPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityStyles: Record<SlaPolicyPriority, string> = {
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  medium: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

const priorityOrder: Record<SlaPolicyPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const normalizePriorityLevel = (
  value: string | null | undefined,
): SlaPolicyPriority | null => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized in priorityLabels) {
    return normalized as SlaPolicyPriority;
  }
  return null;
};

const formatMinutes = (minutes: number) => {
  if (!Number.isFinite(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
};

const parsePositiveInt = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0) return null;
  return Math.round(parsed);
};

export default function AdminSlaPoliciesPage() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { push: pushToast } = useToast();

  const [formData, setFormData] = useState({
    acknowledgementMinutes: "",
    resolutionMinutes: "",
  });
  const [modal, setModal] = useState<{
    priority: SlaPolicyPriority | null;
    policy: SlaPolicy | null;
  }>({ priority: null, policy: null });

  const loadPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSlaPolicies();
      const normalized = data.map((policy) => {
        const fixedPriority = normalizePriorityLevel(policy.priorityLevel);
        if (!fixedPriority) return policy;
        if (fixedPriority === policy.priorityLevel) return policy;
        return { ...policy, priorityLevel: fixedPriority };
      });
      setPolicies(normalized);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load SLA policies.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  const sortedPolicies = useMemo(() => {
    return [...policies].sort(
      (a, b) => priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel],
    );
  }, [policies]);

  const policyByPriority = useMemo(() => {
    return new Map(
      sortedPolicies.map((policy) => [policy.priorityLevel, policy]),
    );
  }, [sortedPolicies]);

  const filteredPolicies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = priorityOptions.map((priority) => {
      const policy = policyByPriority.get(priority) ?? null;
      return { priority, policy };
    });
    if (!q) return rows;
    return rows.filter(({ priority, policy }) => {
      const label = priorityLabels[priority]?.toLowerCase() ?? priority;
      const ack = policy ? String(policy.acknowledgementMinutes) : "";
      const res = policy ? String(policy.resolutionMinutes) : "";
      return [label, ack, res].some((value) => value.includes(q));
    });
  }, [policyByPriority, searchQuery]);

  const stats = useMemo(() => {
    const total = policies.length;
    const configured = new Set(policies.map((p) => p.priorityLevel)).size;
    const maxResolution = policies.reduce(
      (acc, p) => Math.max(acc, p.resolutionMinutes),
      0,
    );
    return { total, configured, maxResolution };
  }, [policies]);

  const unknownPriorities = useMemo(() => {
    return policies
      .map((policy) => policy.priorityLevel)
      .filter((level) => !normalizePriorityLevel(level));
  }, [policies]);

  const openEdit = (priority: SlaPolicyPriority, policy?: SlaPolicy) => {
    setFormData({
      acknowledgementMinutes: policy
        ? String(policy.acknowledgementMinutes)
        : "",
      resolutionMinutes: policy ? String(policy.resolutionMinutes) : "",
    });
    setModal({ priority, policy: policy ?? null });
    setError(null);
  };

  const closeModal = () => {
    setModal({ priority: null, policy: null });
    setError(null);
  };

  // Escape key closes modal
  useEffect(() => {
    if (!modal.priority) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modal.priority, closeModal]);

  const handleSubmit = async () => {
    const ackValue = parsePositiveInt(formData.acknowledgementMinutes);
    const resValue = parsePositiveInt(formData.resolutionMinutes);

    if (!ackValue || !resValue) {
      setError(
        "Acknowledgement and resolution minutes must be greater than 0.",
      );
      return;
    }

    if (resValue < ackValue) {
      setError(
        "Resolution minutes must be greater than or equal to acknowledgement minutes.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!modal.priority) {
        setError("Priority is required.");
        return;
      }

      if (modal.policy) {
        const updated = await updateSlaPolicy(modal.policy.id, {
          acknowledgementMinutes: ackValue,
          resolutionMinutes: resValue,
        });
        setPolicies((prev) =>
          prev.map((p) => (p.id === modal.policy!.id ? updated : p)),
        );
        pushToast({
          title: "SLA updated",
          description: `${priorityLabels[modal.priority]} policy has been updated.`,
          variant: "success",
        });
      } else {
        const created = await createSlaPolicy({
          priorityLevel: modal.priority,
          acknowledgementMinutes: ackValue,
          resolutionMinutes: resValue,
        });
        setPolicies((prev) => [created, ...prev]);
        pushToast({
          title: "SLA created",
          description: `${priorityLabels[modal.priority]} policy has been created.`,
          variant: "success",
        });
      }
      closeModal();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = filteredPolicies.length > 0;

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Compact header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">SLA Policies</h1>
            <p className="text-xs text-zinc-500">
              Configure acknowledgement and resolution targets by priority.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <StatPill label="Total" value={stats.total} />
            <div className="h-4 w-px bg-white/10" />
            <StatPill
              label="Configured"
              value={stats.configured}
              className="text-emerald-400"
            />
            <div className="h-4 w-px bg-white/10" />
            <StatPill
              label="Longest"
              value={
                stats.maxResolution ? formatMinutes(stats.maxResolution) : "—"
              }
            />
          </div>
          <button
            onClick={loadPolicies}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Compact search bar ── */}
      <div className="relative flex shrink-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by priority or minutes…"
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

      {unknownPriorities.length > 0 && (
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            {unknownPriorities.length === 1
              ? "An SLA policy has an unknown priority value."
              : "Some SLA policies have unknown priority values."}
          </span>
        </div>
      )}

      {/* ── Content ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2.5 text-sm text-zinc-500">
            <Loader className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : !hasContent ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <ShieldCheck className="h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">
              {searchQuery ? "No matches" : "No SLA policies yet"}
            </p>
            <p className="text-xs text-zinc-500">
              {searchQuery
                ? "Try a different keyword."
                : "Create policies to enforce response and resolution targets."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 h-8 rounded-lg bg-zinc-800 px-3 text-xs text-zinc-50 hover:bg-zinc-700"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <div className="divide-y divide-white/5">
              {filteredPolicies.map(({ priority, policy }) => (
                <PolicyRow
                  key={priority}
                  priority={priority}
                  policy={policy ?? undefined}
                  onEdit={() => openEdit(priority, policy ?? undefined)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal.priority && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {modal.policy ? "Edit SLA policy" : "Set SLA policy"}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {modal.policy
                    ? "Update the timings for this priority."
                    : "Set acknowledgement and resolution targets by priority."}
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

              {/* Priority badge — read-only, styled by level */}
              <div className="flex items-center justify-center py-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold uppercase tracking-wider",
                    priorityStyles[modal.priority],
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                  {priorityLabels[modal.priority]}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Acknowledgement (minutes)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 30"
                    value={formData.acknowledgementMinutes}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        acknowledgementMinutes: e.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="h-9 rounded-lg text-sm"
                  />
                  <p className="text-[11px] text-zinc-500">
                    {formData.acknowledgementMinutes
                      ? `Approx. ${formatMinutes(Number(formData.acknowledgementMinutes))}`
                      : "Set time to acknowledge a ticket."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Resolution (minutes)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 240"
                    value={formData.resolutionMinutes}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        resolutionMinutes: e.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="h-9 rounded-lg text-sm"
                  />
                  <p className="text-[11px] text-zinc-500">
                    {formData.resolutionMinutes
                      ? `Approx. ${formatMinutes(Number(formData.resolutionMinutes))}`
                      : "Set time to resolve a ticket."}
                  </p>
                </div>
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
                disabled={
                  isSubmitting ||
                  !formData.acknowledgementMinutes.trim() ||
                  !formData.resolutionMinutes.trim()
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {modal.policy ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PolicyRow({
  priority,
  policy,
  onEdit,
}: {
  priority: SlaPolicyPriority;
  policy?: SlaPolicy;
  onEdit: () => void;
}) {
  const date = policy?.updatedAt ?? policy?.createdAt;
  const label = priorityLabels[priority] ?? "Priority";
  const style =
    priorityStyles[priority] ?? "border-white/10 bg-white/5 text-zinc-400";
  return (
    <div className="group flex items-center gap-4 bg-white/[0.02] px-4 py-2.5 transition hover:bg-white/[0.05]">
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          style,
        )}
      >
        <Clock className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-zinc-100">{label}</p>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
              style,
            )}
          >
            {priority}
          </span>
          <span className="text-[11px] text-zinc-400">
            Ack: {policy ? formatMinutes(policy.acknowledgementMinutes) : "—"}
          </span>
          <span className="text-[11px] text-zinc-400">
            Resolve: {policy ? formatMinutes(policy.resolutionMinutes) : "—"}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          Target response and resolution for {label.toLowerCase()} tickets.
        </p>
      </div>

      {date && (
        <span className="hidden shrink-0 text-xs text-zinc-500 sm:block">
          {new Date(date).toLocaleDateString()}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums text-white",
          className,
        )}
      >
        {value}
      </span>
    </div>
  );
}
