import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Native-button composition of shadcn/ui; no Slot or extra dependency is needed.
export function Button({ className, ...props }: ComponentProps<"button">) {
  return <button data-slot="button" className={cn(
    "inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#18372c] px-5 py-3 text-sm font-semibold whitespace-nowrap text-white shadow-xs transition-all outline-none hover:bg-[#315444] focus-visible:ring-[3px] focus-visible:ring-[#719148]/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    className,
  )} {...props} />;
}
