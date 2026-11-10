import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Field composition with native labels and explicit input associations.
export function Field({ className, ...props }: ComponentProps<"div">) {
  return <div role="group" data-slot="field" className={cn("group/field flex w-full flex-col gap-2 data-[invalid=true]:text-red-800", className)} {...props} />;
}
export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return <label data-slot="field-label" className={cn("text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50", className)} {...props} />;
}
export function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("text-xs leading-relaxed text-foreground/60", className)} {...props} />;
}
export function FieldError({ className, children, errors, ...props }: ComponentProps<"div"> & { errors?: Array<{ message?: string } | undefined> }) {
  const messages = [...new Set(errors?.map(error => error?.message).filter(Boolean))];
  const content = children ?? (messages.length === 1 ? messages[0] : messages.length > 1 ? <ul className="ml-4 list-disc space-y-1">{messages.map(message => <li key={message}>{message}</li>)}</ul> : null);
  if (!content) return null;
  return <div role="alert" data-slot="field-error" className={cn("text-sm leading-relaxed text-red-800", className)} {...props}>{content}</div>;
}
