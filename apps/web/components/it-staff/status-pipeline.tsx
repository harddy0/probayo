"use client";

import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types/tickets";
import { ArrowRight, Check } from "lucide-react";

// ── Status Flow Definition ──

export const STATUS_ORDER: TicketStatus[] = [
  "Open",
  "Acknowledged",
  "PendingUser",
  "InProgress",
  "Resolved",
  "Closed",
];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  Open: "Open",
  Acknowledged: "Acknowledged",
  PendingUser: "Pending user",
  InProgress: "In progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  Open: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
  Acknowledged: "border-sky-500/40 bg-sky-500/20 text-sky-300",
  PendingUser: "border-amber-500/40 bg-amber-500/20 text-amber-300",
  InProgress: "border-indigo-500/40 bg-indigo-500/20 text-indigo-300",
  Resolved: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
  Closed: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
};

export const STATUS_LINE_COLORS: Record<TicketStatus, string> = {
  Open: "bg-emerald-500/50",
  Acknowledged: "bg-sky-500/50",
  PendingUser: "bg-amber-500/50",
  InProgress: "bg-indigo-500/50",
  Resolved: "bg-emerald-500/50",
  Closed: "bg-emerald-500/50",
};

// ── Main Pipeline Component ──

export default function StatusPipeline({
  currentStatus,
  onStatusClick,
  isStaff = false,
}: {
  currentStatus: TicketStatus;
  /** Called when user clicks an available (future) status step */
  onStatusClick?: (status: TicketStatus) => void;
  /** Whether the viewer is the assigned staff (can advance status) */
  isStaff?: boolean;
}) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const isTerminal = currentStatus === "Closed";
  const nextStatus: TicketStatus | null = currentIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIndex + 1]! : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
        Ticket Progression
      </p>

      {/* ── Status Stepper ── */}
      <div className="space-y-3">
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const isNextEnabled = isStaff && !isTerminal && onStatusClick && status === nextStatus;

          return (
            <div key={status} className="flex items-center gap-3">
              {/* Step number / check */}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200",
                  isCompleted && "border-emerald-500/60 bg-emerald-500/30 text-emerald-300",
                  isCurrent && STATUS_COLORS[currentStatus],
                  isFuture && "border-white/10 bg-white/5 text-zinc-600",
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isCompleted && "text-emerald-300/80",
                  isCurrent && "text-white",
                  isFuture && "text-zinc-600",
                )}
              >
                {STATUS_LABELS[status]}
              </span>

              {/* Action buttons */}
              {isNextEnabled ? (
                <button
                  type="button"
                  onClick={() => onStatusClick(status)}
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11px] font-medium transition-all duration-150 hover:scale-105 active:scale-95",
                    status === "PendingUser" && "border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
                    status === "InProgress" && "border-indigo-500/40 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25",
                    status === "Resolved" && "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
                    status === "Closed" && "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
                    status === "Acknowledged" && "border-sky-500/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25",
                    status === "Open" && "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/15",
                  )}
                >
                  Advance
                  <ArrowRight className="h-3 w-3" />
                </button>
              ) : null}

              {/* Current indicator */}
              {isCurrent ? (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white">
                  Current
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Context hint */}
      {isTerminal ? (
        <p className="mt-4 text-center text-[11px] text-zinc-500">
          This ticket has reached its final status.
        </p>
      ) : nextStatus && isStaff ? (
        <p className="mt-4 text-center text-[11px] text-zinc-500">
          Click <span className="font-medium text-zinc-300">"Advance"</span> to move to <span className="font-medium text-zinc-300">{STATUS_LABELS[nextStatus]}</span>
        </p>
      ) : null}
    </div>
  );
}
