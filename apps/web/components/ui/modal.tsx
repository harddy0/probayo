"use client";

import * as React from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirm?: () => Promise<void> | void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: string;
  children?: React.ReactNode;
  loading?: boolean;
};

export function Modal({
  open,
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  children,
  loading,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-4 my-6 w-full max-w-lg sm:mx-auto">
        <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-start justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="min-w-0 flex-1 pr-4">
              {title && (
                <h3 className="text-lg font-semibold tracking-tight text-white">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

          <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] px-6 py-4">
            <button
              onClick={onClose}
              className="h-10 rounded-2xl border border-white/10 px-4 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="h-10 rounded-2xl bg-white px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-black/20 transition hover:bg-zinc-100 disabled:opacity-60"
            >
              {loading ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
