import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { EventCover } from "@/components/event-cover";
import { formatEventDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ListedEvent } from "@/lib/events";

export function PublicEventCard({ event }: { event: ListedEvent }) {
  return <article className="h-full min-w-0">
    <Card className="h-full">
      <CardHeader className="flex min-h-16 flex-wrap items-start gap-4">
        <h3 className="min-w-0 flex-1 basis-32 text-xl leading-snug font-semibold tracking-tight text-balance wrap-anywhere sm:text-2xl">{event.title}</h3>
        <div className="w-28 max-w-[35%] shrink-0"><EventCover cover={event.cover} title={event.title} sizes="112px" variant="thumbnail" /></div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <dl className="space-y-3 text-sm leading-5">
          <div><dt className="text-xs text-muted-foreground">Fecha · Hora de Ecuador</dt><dd className="mt-1 font-medium"><time dateTime={event.starts_at}>{formatEventDate(event.starts_at)}</time></dd></div>
          <div><dt className="text-xs text-muted-foreground">Lugar</dt><dd className="mt-1 font-medium wrap-anywhere">{event.venue}</dd></div>
        </dl>
        <p className="mt-4 mb-6 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground wrap-anywhere">{event.description}</p>
        <Link href={`/eventos/${event.id}/registro`} aria-label={`Registrarme en ${event.title}`} className={cn(buttonStyles(), "mt-auto w-full justify-between")}>
          <span className="min-w-0 wrap-anywhere">Registrarme</span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
        </Link>
      </CardContent>
    </Card>
  </article>;
}
