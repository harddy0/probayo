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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-zinc-400">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-5">
          <button
            onClick={onClose}
            className="h-10 rounded-2xl border border-white/10 px-4 text-sm text-zinc-100 transition hover:border-white/20 hover:bg-white/5"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="h-10 rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-black/20 transition hover:bg-zinc-100 disabled:opacity-60"
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
