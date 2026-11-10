import * as React from "react";
import { cn } from "@/lib/utils";
import { FieldError as SharedFieldError } from "./field";
export { Input } from "./input";
export { Button } from "./button";
export { Field, FieldLabel } from "./field";
const control = "min-h-12 w-full min-w-0 rounded-xl border border-foreground/20 bg-surface px-4 py-3 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/25 aria-invalid:border-red-700 aria-invalid:ring-red-700/20 disabled:opacity-50 sm:text-sm";
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) { return <select className={cn(control, className)} {...props} />; }
export function Card({ className, ...props }: React.ComponentProps<"section">) { return <section className={cn("rounded-3xl border border-foreground/10 bg-white p-6 shadow-sm sm:p-8", className)} {...props} />; }
export function FieldError({ id, message }: { id: string; message?: string }) { return <SharedFieldError id={id} errors={[{ message }]} />; }
export function Skeleton({ className }: { className?: string }) { return <div className={cn("animate-pulse rounded-xl bg-foreground/10 motion-reduce:animate-none", className)} />; }
