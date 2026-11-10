import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("min-h-24 w-full min-w-0 resize-y rounded-xl border border-foreground/20 bg-surface px-4 py-3 text-base shadow-xs outline-none placeholder:text-foreground/40 focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/25 aria-invalid:border-red-700 disabled:opacity-50 sm:text-sm", className)} {...props} />;
}
