import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Default: 24 px padding, 16 px radius. Accent uses the shared highlight surface.
// Table removes the lower padding; notice centers content with 48 px vertical padding.
export function Card({ className, tone = "default", layout = "default", ...props }: ComponentProps<"div"> & { tone?: "default" | "accent"; layout?: "default" | "table" | "notice" }) {
  return <div data-slot="card" className={cn("flex flex-col gap-6 rounded-2xl border border-foreground/10 bg-surface py-6 shadow-sm", tone === "accent" && "bg-accent-surface", layout === "table" && "gap-0 overflow-hidden pb-0", layout === "notice" && "py-12 text-center", className)} {...props} />;
}
export function CardHeader({ className, layout = "default", ...props }: ComponentProps<"div"> & { layout?: "default" | "toolbar" }) {
  return <div data-slot="card-header" className={cn("grid gap-2 px-6", layout === "toolbar" && "gap-4 pb-6", className)} {...props} />;
}
export function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("font-semibold tracking-tight", className)} {...props} />;
}
export function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-sm leading-relaxed text-foreground/60", className)} {...props} />;
}
export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}
