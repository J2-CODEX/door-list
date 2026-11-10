import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Alert's destructive variant, adapted without a variant dependency.
export function LoginAlert({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert" role="alert" className={cn("relative grid w-full gap-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus-visible:ring-2 focus-visible:ring-red-700/30", className)} {...props} />;
}
export function LoginAlertTitle({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("min-h-4 font-medium tracking-tight", className)} {...props} />;
}
export function LoginAlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-sm leading-relaxed text-red-800/90", className)} {...props} />;
}
