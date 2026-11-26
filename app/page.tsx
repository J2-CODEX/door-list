import { ecuadorDate } from "@/lib/dates";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { publicClient } from "@/lib/supabase/server";
import { PublicEventCard } from "./public-event-card";
import { projectCoverRow, COVER_METADATA_COLUMNS } from "@/lib/supabase/event-cover-mapping";
import type { ListedEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

function ArrowIcon() {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>;
}

export default async function Home() {
  let events: ListedEvent[] = [];
  let failed = false;

  try {
    const today = ecuadorDate();
    const { data, error } = await publicClient()
      .from("events")
      .select(`id,title,description,starts_at,venue,event_covers(${COVER_METADATA_COLUMNS})`)
      .eq("status", "published")
      .gte("starts_at", `${today}T00:00:00-05:00`)
      .order("starts_at", { ascending: true });
    if (error) failed = true;
    else events = (data ?? []).map(event => ({ ...event, ...projectCoverRow(event.id, true, Array.isArray(event.event_covers) ? event.event_covers[0] : event.event_covers) }));
  } catch {
    failed = true;
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-6 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 py-4 sm:py-6">
        <span className="text-xl font-bold tracking-tight">door list<span className="text-accent">.</span></span>
        <Link href="/dashboard" className={buttonStyles("ghost")}>Organizadores <ArrowIcon /></Link>
      </header>

      <main className="flex-1">
        <section aria-labelledby="welcome-title" className="grid items-center gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_10rem] lg:gap-8 lg:py-8">
          <div className="min-w-0">
            <h1 id="welcome-title" className="max-w-3xl wrap-anywhere text-5xl leading-[1.08] font-semibold tracking-tight sm:text-6xl lg:text-7xl">Tu próximo encuentro empieza aquí<span className="text-accent">.</span></h1>
            <p className="mt-4 max-w-2xl text-base leading-6 text-foreground/75 sm:text-lg sm:leading-relaxed">Descubre eventos, conoce personas y encuentra algo que te mueva.</p>
          </div>
          <div aria-hidden="true" className="hidden overflow-hidden rounded-3xl bg-accent-surface lg:block">
            <div className="relative flex h-32 items-end justify-center overflow-hidden bg-accent-decoration pt-6">
              <svg className="absolute top-6 left-6 text-accent-foreground" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5" /></svg>
              <span className="absolute top-12 right-6 h-8 w-8 rounded-full border border-accent-foreground/40" />
              <div className="relative flex h-full w-32 items-end justify-center rounded-t-full bg-foreground p-3">
                <div className="h-full w-full origin-left -skew-y-12 rounded-t-full border border-accent-decoration/50 bg-primary-hover" />
                <span className="absolute right-6 bottom-12 h-2 w-2 rounded-full bg-accent-decoration" />
              </div>
            </div>
            <p className="px-4 py-4 text-center text-sm leading-5 font-medium">Una puerta abierta a nuevas conexiones.</p>
          </div>
        </section>

        <section id="eventos" aria-labelledby="events-title" className="scroll-mt-8 border-t border-foreground/10 pt-6 pb-16 sm:pt-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 id="events-title" className="text-3xl font-semibold tracking-tight wrap-anywhere sm:text-4xl">Eventos para conectar</h2>
            {!failed && events.length > 0 && <Badge variant="secondary">{events.length} {events.length === 1 ? "encuentro por descubrir" : "encuentros por descubrir"}</Badge>}
          </div>

          {failed ? (
            <Card role="alert" layout="notice">
              <CardContent>
                <h3 className="text-xl font-semibold">No pudimos cargar los eventos</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-muted-foreground">Inténtalo de nuevo en unos momentos. Tu próximo encuentro puede estar muy cerca.</p>
                <form action="/#eventos" method="get" className="mt-6"><Button type="submit" variant="secondary">Volver a intentar <ArrowIcon /></Button></form>
              </CardContent>
            </Card>
          ) : events.length === 0 ? (
            <Card role="status" tone="accent" layout="notice">
              <CardContent>
                <h3 className="text-xl font-semibold">Los buenos encuentros están por venir</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-muted-foreground">Todavía no hay eventos publicados para registrarte. Vuelve pronto para descubrir qué sigue.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {events.map(event => (
                <PublicEventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-6 text-sm leading-5 text-muted-foreground">Door List · Una puerta abierta a nuevas conexiones.</footer>
    </div>
  );
}
