import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventDate } from "@/lib/dates";
export function EventSummary({ title, description, startsAt, venue, children }: { title: string; description: string; startsAt: string; venue: string; children?: ReactNode }) {
  return <section aria-labelledby="event-title" className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-center gap-4"><p className="text-xs leading-4 font-semibold tracking-widest text-accent-foreground uppercase">Tu próximo encuentro</p>{children}</div>
    <h1 id="event-title" className="text-4xl font-semibold tracking-tight wrap-anywhere sm:text-5xl">{title}</h1>
    {description && <p className="text-base leading-6 whitespace-pre-wrap text-foreground/60 wrap-anywhere">{description}</p>}
    <Card tone="accent"><CardContent><dl className="grid gap-6 sm:grid-cols-2"><div className="min-w-0"><dt className="text-sm leading-5 text-foreground/60">Cuándo</dt><dd className="mt-2 text-base leading-6 font-medium"><time dateTime={startsAt}>{formatEventDate(startsAt)}</time></dd><dd className="mt-2 text-xs leading-4 text-foreground/60">Ecuador continental · UTC−5</dd></div><div className="min-w-0"><dt className="text-sm leading-5 text-foreground/60">Dónde</dt><dd className="mt-2 text-base leading-6 font-medium wrap-anywhere">{venue}</dd></div></dl></CardContent></Card>
  </section>;
}
