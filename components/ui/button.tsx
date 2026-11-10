import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
/** Shared 48 px controls. Use these styles on links for navigation; Button for actions. */
export function buttonStyles(variant: ButtonVariant = "primary") {
  return cn(
    "inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm leading-5 font-semibold text-center shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    variant === "primary" ? "bg-foreground text-white hover:bg-primary-hover" : variant === "secondary" ? "border border-foreground/20 bg-surface text-foreground hover:bg-foreground/5" : "text-foreground hover:bg-foreground/5 shadow-none",
  );
}
export function Button({ className, variant = "primary", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button data-slot="button" className={cn(buttonStyles(variant), className)} {...props} />;
}
