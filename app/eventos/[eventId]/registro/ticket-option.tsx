import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
// Radio option: the same 12 px radius, focus and accent roles as other controls.
export function TicketOption({ selected, invalid, disabled, className, ...props }: ComponentProps<"label"> & { selected: boolean; invalid: boolean; disabled: boolean }) {
  return <label className={cn("flex min-h-24 items-center gap-4 rounded-xl border p-4 transition-colors focus-within:ring-[3px] focus-within:ring-accent/40", selected ? "border-accent bg-accent-surface" : invalid && !disabled ? "border-red-700 bg-surface" : "border-foreground/20 bg-surface", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-accent hover:bg-accent-surface", className)} {...props} />;
}
