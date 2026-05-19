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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-800/50 px-4 py-3">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-zinc-400">{description}</p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-4">{children}</div>

        <div className="flex items-center gap-3 justify-end border-t border-zinc-800/50 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-white"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
