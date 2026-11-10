import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, variant = "default", ...props }: ComponentProps<"span"> & { variant?: "default" | "secondary" | "outline" }) {
  return <span data-slot="badge" className={cn("inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", variant === "default" ? "border-transparent bg-[#e9eedf] text-[#436329]" : variant === "secondary" ? "border-transparent bg-foreground/5 text-foreground/65" : "border-foreground/15", className)} {...props} />;
}
