import * as React from "react";
import { cn } from "@/lib/utils";
const control = "w-full rounded-xl border border-foreground/20 bg-white px-4 py-3 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-[#719148] aria-invalid:border-red-600 disabled:opacity-50";
export function Input({ className, ...props }: React.ComponentProps<"input">) { return <input className={cn(control, className)} {...props} />; }
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) { return <select className={cn(control, className)} {...props} />; }
export function Button({ className, ...props }: React.ComponentProps<"button">) { return <button className={cn("inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#18372c] px-5 py-3 font-semibold text-white hover:bg-[#315444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#719148] disabled:pointer-events-none disabled:opacity-50", className)} {...props} />; }
export function Card({ className, ...props }: React.ComponentProps<"section">) { return <section className={cn("rounded-3xl border border-foreground/10 bg-white p-6 shadow-sm sm:p-8", className)} {...props} />; }
export function Field(props: React.ComponentProps<"div">) { return <div className="space-y-2" data-slot="field" {...props} />; }
export function FieldLabel(props: React.ComponentProps<"label">) { return <label className="block text-sm font-medium" {...props} />; }
export function FieldError({ id, message }: { id: string; message?: string }) { return message ? <p id={id} role="alert" className="text-sm text-red-800">{message}</p> : null; }
export function Skeleton({ className }: { className?: string }) { return <div className={cn("animate-pulse rounded-xl bg-foreground/10 motion-reduce:animate-none", className)} />; }
