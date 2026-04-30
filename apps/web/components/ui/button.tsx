/* eslint-disable react/prop-types */
import * as React from "react";

import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const buttonVariants = {
  default: "bg-zinc-50 text-zinc-950 hover:bg-zinc-200",
  secondary: "bg-zinc-800 text-zinc-50 hover:bg-zinc-700",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-12 items-center justify-center rounded-2xl px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50",
          "bg-gradient-to-r from-white via-zinc-100 to-zinc-200 text-zinc-950 shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:from-zinc-50 hover:to-white",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
