"use client";

import { useEffect, useState } from "react";
import { Download, X, ZoomIn, ZoomOut } from "lucide-react";

type ImageLightboxProps = {
  src: string | null;
  fileName?: string;
  onClose: () => void;
};

export default function ImageLightbox({ src, fileName, onClose }: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!src) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [src, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (!src) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [src]);

  if (!src) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = fileName || "image";
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Toolbar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
        <span className="text-xs text-zinc-400">
          {fileName || "Image preview"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomed((prev) => !prev)}
            className="rounded-lg bg-white/10 p-2 text-zinc-300 transition hover:bg-white/20 hover:text-white"
            title={zoomed ? "Zoom out" : "Zoom in"}
          >
            {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg bg-white/10 p-2 text-zinc-300 transition hover:bg-white/20 hover:text-white"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 p-2 text-zinc-300 transition hover:bg-white/20 hover:text-white"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex max-h-full max-w-full items-center justify-center p-4 pt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={fileName || "Preview"}
          className={zoomed ? "max-h-none max-w-none scale-150 cursor-zoom-out" : "max-h-[85vh] max-w-full cursor-zoom-in"}
          style={{
            transition: "transform 0.2s ease",
            objectFit: zoomed ? "none" : "contain",
          }}
          onClick={() => setZoomed((prev) => !prev)}
        />
      </div>
    </div>
  );
}
