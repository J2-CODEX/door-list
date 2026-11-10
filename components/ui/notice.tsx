import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Notice({ tone = "info", className, ...props }: ComponentProps<"p"> & { tone?: "info" | "error" }) {
  return <p className={cn("rounded-xl p-4 text-sm leading-5 wrap-anywhere", tone === "error" ? "border border-red-700/20 bg-red-50 text-red-800" : "bg-accent-surface text-accent-foreground", className)} {...props} />;
}
