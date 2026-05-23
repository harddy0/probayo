"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  Loader,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiError } from "@/lib/api/client";
import {
  fetchEscalationRules,
  updateEscalationRule,
} from "@/lib/api/sla-escalation-rules";
import type {
  EscalationPriority,
  EscalationRule,
  NotifyRole,
  SlaEscalationType,
} from "@/lib/types/sla-escalation-rules";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

const priorityOptions: EscalationPriority[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

const slaTypeOptions: SlaEscalationType[] = ["Acknowledgement", "Resolution"];

const notifyRoleOptions: { value: NotifyRole; label: string }[] = [
  { value: "Admin", label: "Admin" },
  { value: "DepartmentHead", label: "Department Head" },
];

const priorityStyles: Record<EscalationPriority, string> = {
  Critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  High: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Medium: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

const slaTypeStyles: Record<SlaEscalationType, string> = {
  Acknowledgement: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  Resolution: "border-blue-500/30 bg-blue-500/10 text-blue-300",
};

const notifyRoleLabels: Record<NotifyRole, string> = {
  Admin: "Admin",
  DepartmentHead: "Dept. Head",
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

export default function AdminSlaEscalationRulesPage() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { push: pushToast } = useToast();

  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [editForm, setEditForm] = useState({
    escalationLevel: "",
    triggerAfterMinutes: "",
    notifyRole: "" as NotifyRole | "",
  });

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEscalationRules();
      setRules(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to load escalation rules.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const sortedRules = useMemo(() => {
    const priorityOrder: Record<EscalationPriority, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };
    return [...rules].sort((a, b) => {
      const pOrder = priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];
      if (pOrder !== 0) return pOrder;
      if (a.slaType !== b.slaType) return a.slaType === "Acknowledgement" ? -1 : 1;
      return a.escalationLevel - b.escalationLevel;
    });
  }, [rules]);

  const filteredRules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedRules;
    return sortedRules.filter((rule) => {
      const priority = rule.priorityLevel.toLowerCase();
      const slaType = rule.slaType.toLowerCase();
      const role = notifyRoleLabels[rule.notifyRole].toLowerCase();
      const trigger = String(rule.triggerAfterMinutes);
      return [priority, slaType, role, trigger].some((v) => v.includes(q));
    });
  }, [sortedRules, searchQuery]);

  const stats = useMemo(() => {
    const total = rules.length;
    const uniquePriorities = new Set(rules.map((r) => r.priorityLevel)).size;
    const maxTrigger = rules.reduce(
      (acc, r) => Math.max(acc, r.triggerAfterMinutes),
      0,
    );
    return { total, uniquePriorities, maxTrigger };
  }, [rules]);

  const openEdit = (rule: EscalationRule) => {
    setEditingRule(rule);
    setEditForm({
      escalationLevel: String(rule.escalationLevel),
      triggerAfterMinutes: String(rule.triggerAfterMinutes),
      notifyRole: rule.notifyRole,
    });
    setError(null);
  };

  const closeEdit = () => {
    setEditingRule(null);
    setEditForm({ escalationLevel: "", triggerAfterMinutes: "", notifyRole: "" });
    setError(null);
  };

  // Escape key closes modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEdit();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeEdit]);

  const handleSaveEdit = async () => {
    if (!editingRule) return;

    const escalationValue = parsePositiveInt(editForm.escalationLevel);
    const triggerValue = parsePositiveInt(editForm.triggerAfterMinutes);

    if (!escalationValue || !triggerValue) {
      setError("Escalation level and trigger minutes must be greater than 0.");
      return;
    }

    if (!editForm.notifyRole) {
      setError("Notify role is required.");
      return;
    }

    const payload: Record<string, unknown> = {};
    if (escalationValue !== editingRule.escalationLevel) {
      payload.escalationLevel = escalationValue;
    }
    if (triggerValue !== editingRule.triggerAfterMinutes) {
      payload.triggerAfterMinutes = triggerValue;
    }
    if (editForm.notifyRole !== editingRule.notifyRole) {
      payload.notifyRole = editForm.notifyRole;
    }

    if (Object.keys(payload).length === 0) {
      closeEdit();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await updateEscalationRule(editingRule.id, payload);
      setRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? updated : r)),
      );
      pushToast({
        title: "Escalation rule updated",
        description: `${editingRule.priorityLevel} ${editingRule.slaType} — Level ${editingRule.escalationLevel} has been updated.`,
        variant: "success",
      });
      closeEdit();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to update escalation rule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Compact header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <Bell className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">SLA Escalation Rules</h1>
            <p className="text-xs text-zinc-500">
              Configure escalation steps when SLA deadlines are breached.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <StatPill label="Total" value={stats.total} />
            <div className="h-4 w-px bg-white/10" />
            <StatPill
              label="Priorities"
              value={stats.uniquePriorities}
              className="text-violet-400"
            />
            <div className="h-4 w-px bg-white/10" />
            <StatPill
              label="Max trigger"
              value={stats.maxTrigger ? formatMinutes(stats.maxTrigger) : "—"}
            />
          </div>
          <button
            onClick={loadRules}
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
          placeholder="Search by priority, type, role, or minutes…"
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

      {/* ── Content ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2.5 text-sm text-zinc-500">
            <Loader className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <Bell className="h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">
              {searchQuery ? "No matches" : "No escalation rules yet"}
            </p>
            <p className="text-xs text-zinc-500">
              {searchQuery
                ? "Try a different keyword."
                : "Escalation rules define what happens when SLA deadlines are breached."}
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
            <table className="w-full min-w-[700px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-950/95 text-[10px] uppercase tracking-[0.25em] text-zinc-500 backdrop-blur">
                <tr>
                  <th className="border-b border-white/10 px-4 py-2.5 font-medium">Priority</th>
                  <th className="border-b border-white/10 px-4 py-2.5 font-medium">SLA Type</th>
                  <th className="border-b border-white/10 px-4 py-2.5 font-medium">Level</th>
                  <th className="border-b border-white/10 px-4 py-2.5 font-medium">Trigger After</th>
                  <th className="border-b border-white/10 px-4 py-2.5 font-medium">Notify</th>
                  <th className="border-b border-white/10 px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="group transition hover:bg-white/[0.04]"
                  >
                    <td className="border-b border-white/5 px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          priorityStyles[rule.priorityLevel],
                        )}
                      >
                        {rule.priorityLevel}
                      </span>
                    </td>
                    <td className="border-b border-white/5 px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          slaTypeStyles[rule.slaType],
                        )}
                      >
                        {rule.slaType}
                      </span>
                    </td>
                    <td className="border-b border-white/5 px-4 py-2.5 text-zinc-300">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold tabular-nums text-zinc-100">
                        {rule.escalationLevel}
                      </span>
                    </td>
                    <td className="border-b border-white/5 px-4 py-2.5 font-medium tabular-nums text-zinc-100">
                      {formatMinutes(rule.triggerAfterMinutes)}
                    </td>
                    <td className="border-b border-white/5 px-4 py-2.5 text-zinc-300">
                      {notifyRoleLabels[rule.notifyRole]}
                    </td>
                    <td className="border-b border-white/5 px-4 py-2.5">
                      <div className="flex justify-end opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(rule)}
                          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editingRule && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
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
                  Edit escalation rule
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {editingRule.priorityLevel} — {editingRule.slaType} — Level {editingRule.escalationLevel}
                </p>
              </div>
              <button
                onClick={closeEdit}
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

              {/* Read-only info badges */}
              <div className="flex items-center justify-center gap-3 py-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                    priorityStyles[editingRule.priorityLevel],
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  {editingRule.priorityLevel}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                    slaTypeStyles[editingRule.slaType],
                  )}
                >
                  {editingRule.slaType}
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold tabular-nums text-zinc-100">
                  {editingRule.escalationLevel}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Escalation Level
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 2"
                    value={editForm.escalationLevel}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        escalationLevel: e.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="h-9 rounded-lg text-sm"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Step order for this priority &amp; SLA type.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Trigger After (minutes)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 30"
                    value={editForm.triggerAfterMinutes}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        triggerAfterMinutes: e.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="h-9 rounded-lg text-sm"
                  />
                  <p className="text-[11px] text-zinc-500">
                    {editForm.triggerAfterMinutes
                      ? `~${formatMinutes(Number(editForm.triggerAfterMinutes))} after SLA deadline`
                      : "Minutes after SLA breach."}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Notify Role</Label>
                <Select
                  value={editForm.notifyRole}
                  onValueChange={(v) =>
                    setEditForm((p) => ({
                      ...p,
                      notifyRole: v as NotifyRole,
                    }))
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-9 rounded-lg text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {notifyRoleOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800 px-5 py-3.5">
              <button
                onClick={closeEdit}
                disabled={isSubmitting}
                className="h-9 rounded-lg border border-white/10 px-3.5 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={
                  isSubmitting ||
                  !editForm.escalationLevel.trim() ||
                  !editForm.triggerAfterMinutes.trim() ||
                  !editForm.notifyRole
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Tiny stat pill ──

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
