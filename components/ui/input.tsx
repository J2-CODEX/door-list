import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Input, adapted to Door List's colors and control sizing.
export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(
    "flex h-12 w-full min-w-0 rounded-xl border border-foreground/20 bg-white px-4 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-foreground/40 selection:bg-[#d8e8a4] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
    "focus-visible:border-[#719148] focus-visible:ring-[3px] focus-visible:ring-[#719148]/25 aria-invalid:border-red-700 aria-invalid:ring-red-700/20",
    className,
  )} {...props} />;
}
