"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return <SheetPrimitive.Overlay data-slot="sheet-overlay" className={cn("sheet-overlay fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm", className)} {...props} />;
}

function SheetContent({ className, children, showCloseButton = true, ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn("sheet-content fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col border-l border-foreground/10 bg-surface text-foreground shadow-2xl outline-none sm:max-w-xl", className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="absolute top-4 right-4 flex size-12 cursor-pointer items-center justify-center rounded-xl text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M6 18 18 6" /></svg>
            <span className="sr-only">Cerrar formulario</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex shrink-0 flex-col gap-2 border-b border-foreground/10 p-6 pr-16", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex shrink-0 flex-col-reverse gap-4 border-t border-foreground/10 bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-2xl font-semibold tracking-tight", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm leading-relaxed text-foreground/65", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetPortal, SheetOverlay, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
