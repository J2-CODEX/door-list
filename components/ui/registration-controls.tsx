import * as React from "react";
import { cn } from "@/lib/utils";
import { FieldError as SharedFieldError } from "./field";
export { Input } from "./input";
export { Button } from "./button";
export { Field, FieldLabel } from "./field";
const control = "w-full rounded-xl border border-foreground/20 bg-white px-4 py-3 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-[#719148] aria-invalid:border-red-600 disabled:opacity-50";
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) { return <select className={cn(control, className)} {...props} />; }
export function Card({ className, ...props }: React.ComponentProps<"section">) { return <section className={cn("rounded-3xl border border-foreground/10 bg-white p-6 shadow-sm sm:p-8", className)} {...props} />; }
export function FieldError({ id, message }: { id: string; message?: string }) { return <SharedFieldError id={id} errors={[{ message }]} />; }
export function Skeleton({ className }: { className?: string }) { return <div className={cn("animate-pulse rounded-xl bg-foreground/10 motion-reduce:animate-none", className)} />; }
