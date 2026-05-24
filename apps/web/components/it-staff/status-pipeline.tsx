"use client";

import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types/tickets";
import { Check } from "lucide-react";

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
  Closed: "border-zinc-500/40 bg-zinc-500/20 text-zinc-300",
};

export const STATUS_LINE_COLORS: Record<TicketStatus, string> = {
  Open: "bg-emerald-500/50",
  Acknowledged: "bg-sky-500/50",
  PendingUser: "bg-amber-500/50",
  InProgress: "bg-indigo-500/50",
  Resolved: "bg-emerald-500/50",
  Closed: "bg-zinc-500/30",
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
  const isTerminal = currentStatus === "Closed" || currentStatus === "Resolved";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
        Ticket Progression
      </p>
      <div className="relative flex items-center justify-between">
        {/* Connecting lines — drawn behind the circles */}
        <svg
          className="pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2"
          preserveAspectRatio="none"
          viewBox="0 0 100 4"
        >
          {/* Base line (dim) */}
          <line x1="0" y1="2" x2="100" y2="2" stroke="rgba(255,255,255,0.06)" strokeWidth="4" strokeLinecap="round" />
          {/* Active line (up to current step) */}
          {currentIndex > 0 ? (
            <line
              x1="0"
              y1="2"
              x2={`${(currentIndex / (STATUS_ORDER.length - 1)) * 100}`}
              y2="2"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : null}
        </svg>

        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const isClickable = isFuture && isStaff && !isTerminal && onStatusClick;

          return (
            <button
              key={status}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStatusClick(status)}
              className={cn(
                "relative z-10 flex flex-col items-center gap-1.5 transition-all duration-200",
                isClickable
                  ? "cursor-pointer hover:scale-110"
                  : "cursor-default",
                isFuture && !isStaff && "opacity-40",
              )}
            >
              {/* Circle */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted && "border-emerald-500/60 bg-emerald-500/30 text-emerald-300",
                  isCurrent && STATUS_COLORS[currentStatus],
                  isFuture && "border-white/10 bg-white/5 text-zinc-500",
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-[10px] font-bold">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap transition-colors",
                  isCompleted && "text-emerald-300/80",
                  isCurrent && "text-white",
                  isFuture && "text-zinc-600",
                )}
              >
                {STATUS_LABELS[status]}
              </span>

              {/* Current indicator pulse */}
              {isCurrent ? (
                <span className="absolute -inset-1.5 animate-ping rounded-full border border-white/20 opacity-30" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Context hint */}
      {isTerminal ? (
        <p className="mt-3 text-center text-[11px] text-zinc-500">
          This ticket has reached its final status.
        </p>
      ) : isStaff && currentIndex >= 0 && currentIndex < STATUS_ORDER.length - 1 ? (
        <p className="mt-3 text-center text-[11px] text-zinc-500">
          Next: <span className="font-medium text-zinc-300">{STATUS_LABELS[STATUS_ORDER[currentIndex + 1]!]}</span>
          {onStatusClick ? " — click a step above to advance" : ""}
        </p>
      ) : null}
    </div>
  );
}
