import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  startsAt: string;
  venue: string;
  children?: ReactNode;
  layout?: "default" | "registration";
};

export function EventSummary({ title, description, startsAt, venue, children, layout = "default" }: Props) {
  const facts = <dl className={layout === "registration" ? "space-y-3" : "grid gap-6 sm:grid-cols-2"}>
    <div className="min-w-0"><dt className="text-sm leading-5 text-muted-foreground">Cuándo</dt><dd className="mt-1 text-base leading-6 font-medium"><time dateTime={startsAt}>{formatEventDate(startsAt)}</time></dd><dd className="mt-1 text-xs leading-4 text-muted-foreground">Ecuador continental · UTC−5</dd></div>
    <div className="min-w-0"><dt className="text-sm leading-5 text-muted-foreground">Dónde</dt><dd className="mt-1 text-base leading-6 font-medium wrap-anywhere">{venue}</dd></div>
  </dl>;
  return <section aria-labelledby="event-title" className="min-w-0 space-y-6">
    {children && <div className="flex flex-wrap items-center gap-4">{children}</div>}
    <h1 id="event-title" className={cn("text-4xl font-semibold tracking-tight wrap-anywhere sm:text-5xl", layout === "registration" && "text-balance")}>{title}</h1>
    {description && <p className="text-base leading-6 whitespace-pre-wrap text-muted-foreground wrap-anywhere">{description}</p>}
    {layout === "registration" ? facts : <Card tone="accent"><CardContent>{facts}</CardContent></Card>}
  </section>;
}
