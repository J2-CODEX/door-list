import { formatEventDate, formatEventDay, formatEventMonth, ecuadorDate } from "@/lib/dates";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { publicClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ListedEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

function ArrowIcon({ direction = "up-right" }: { direction?: "up-right" | "down" }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={direction === "down" ? "M12 4v16m-6-6 6 6 6-6" : "M6 18 18 6M6 6h12v12"} /></svg>;
}

export default async function Home() {
  let events: ListedEvent[] = [];
  let failed = false;

  try {
    const today = ecuadorDate();
    const { data, error } = await publicClient()
      .from("events")
      .select("id,title,description,starts_at,venue")
      .eq("status", "published")
      .gte("starts_at", `${today}T00:00:00-05:00`)
      .order("starts_at", { ascending: true });
    if (error) failed = true;
    else events = data ?? [];
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
        <section aria-labelledby="welcome-title" className="grid items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12 lg:py-12">
          <div className="min-w-0">
            <h1 id="welcome-title" className="max-w-3xl text-5xl leading-[1.08] font-semibold tracking-tight sm:text-6xl lg:text-7xl">Tu próximo encuentro empieza aquí<span className="text-accent">.</span></h1>
            <p className="mt-4 max-w-2xl text-base leading-6 text-foreground/75 sm:text-lg sm:leading-relaxed">¡Qué bueno tenerte aquí! Descubre eventos, conoce personas y encuentra algo que te mueva. Hay una puerta abierta para ti.</p>
            <a href="#eventos" className={cn(buttonStyles(), "mt-6")}>Explorar eventos <ArrowIcon direction="down" /></a>
          </div>
          <div aria-hidden="true" className="hidden overflow-hidden rounded-3xl bg-accent-surface lg:block">
            <div className="relative flex h-48 items-end justify-center overflow-hidden bg-accent-decoration pt-6">
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
            <h2 id="events-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Eventos para conectar</h2>
            {!failed && events.length > 0 && <Badge variant="secondary">{events.length} {events.length === 1 ? "encuentro por descubrir" : "encuentros por descubrir"}</Badge>}
          </div>

          {failed ? (
            <Card role="alert" layout="notice">
              <CardContent>
                <h3 className="text-xl font-semibold">No pudimos cargar los eventos</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-foreground/60">Inténtalo de nuevo en unos momentos. Tu próximo encuentro puede estar muy cerca.</p>
                <form action="/#eventos" method="get" className="mt-6"><Button type="submit" variant="secondary">Volver a intentar <ArrowIcon /></Button></form>
              </CardContent>
            </Card>
          ) : events.length === 0 ? (
            <Card role="status" tone="accent" layout="notice">
              <CardContent>
                <h3 className="text-xl font-semibold">Los buenos encuentros están por venir</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-foreground/60">Todavía no hay eventos publicados para registrarte. Vuelve pronto para descubrir qué sigue.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {events.map(event => (
                <article key={event.id} className="min-w-0">
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div aria-hidden="true" className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-accent-surface px-2 py-3 text-accent-foreground">
                          <span className="text-3xl leading-none font-semibold tabular-nums">{formatEventDay(event.starts_at)}</span>
                          <span className="mt-1 text-xs font-semibold uppercase">{formatEventMonth(event.starts_at)}</span>
                        </div>
                        <h3 className="min-w-0 text-2xl leading-tight font-semibold tracking-tight wrap-anywhere">{event.title}</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                      <dl className="space-y-3 text-sm leading-5">
                        <div><dt className="text-xs text-foreground/60">Fecha · Hora de Ecuador</dt><dd className="mt-1 font-medium"><time dateTime={event.starts_at}>{formatEventDate(event.starts_at)}</time></dd></div>
                        <div><dt className="text-xs text-foreground/60">Lugar</dt><dd className="mt-1 font-medium wrap-anywhere">{event.venue}</dd></div>
                      </dl>
                      <p className="mt-4 mb-6 text-sm leading-relaxed whitespace-pre-wrap text-foreground/75 wrap-anywhere">{event.description}</p>
                      <Link href={`/eventos/${event.id}/registro`} aria-label={`Registrarme en ${event.title}`} className={cn(buttonStyles(), "mt-auto w-full justify-between")}>Registrarme <ArrowIcon /></Link>
                    </CardContent>
                  </Card>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-6 text-sm leading-5 text-foreground/65">Door List · Una puerta abierta a nuevas conexiones.</footer>
    </div>
  );
}
