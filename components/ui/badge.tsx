import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, variant = "default", ...props }: ComponentProps<"span"> & { variant?: "default" | "secondary" | "outline" }) {
  return <span data-slot="badge" className={cn("inline-flex max-w-full w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-xs leading-4 font-medium wrap-anywhere", variant === "default" ? "border-transparent bg-accent-surface text-accent-foreground" : variant === "secondary" ? "border-transparent bg-foreground/5 text-foreground/65" : "border-foreground/15", className)} {...props} />;
}
