import type { ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventCover } from "@/components/event-cover";
import { EventSummary } from "@/components/event-summary";
import type { PublicEvent } from "@/lib/registration";

export function RegistrationEventDetails({ event, children }: { event: PublicEvent; children?: ReactNode }) {
  return <div className="grid min-w-0 items-start gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-12">
    <div className="min-w-0 lg:col-start-1 lg:row-start-1">
      <EventSummary title={event.title} description="" startsAt={event.starts_at} venue={event.venue} layout="registration" />
      <a href="#detalles-del-evento" className={cn(buttonStyles("ghost"), "mt-3 w-full justify-start lg:hidden")}>Ver detalles del evento <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m-6-6 6 6 6-6" /></svg></a>
    </div>
    {children && <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">{children}</div>}
    <div id="detalles-del-evento" tabIndex={-1} className="min-w-0 scroll-mt-8 space-y-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground lg:col-start-1 lg:row-start-2">
      <EventCover cover={event.cover} title={event.title} loading="eager" />
      {event.description && <section aria-labelledby="event-description-title" className="space-y-3"><h2 id="event-description-title" className="text-xl font-semibold">Sobre el encuentro</h2><p className="text-base leading-6 whitespace-pre-wrap text-muted-foreground wrap-anywhere">{event.description}</p></section>}
      <p className="text-sm leading-5 text-muted-foreground">Puedes registrarte durante todo el día del evento, sujeto a disponibilidad.</p>
      {children && <a href="#registro" className={cn(buttonStyles("secondary"), "w-full lg:hidden")}>Volver al registro</a>}
    </div>
  </div>;
}
