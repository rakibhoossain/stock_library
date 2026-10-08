import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-indigo-600 text-white",
    secondary: "border-transparent bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
    destructive: "border-transparent bg-rose-500 text-white",
    outline: "text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800",
    success: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
    warning: "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
