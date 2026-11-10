import { formatEventDate, formatEventDay, formatEventMonth, ecuadorDate } from "@/lib/dates";
import Link from "next/link";
import { publicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

import type { ListedEvent } from "@/lib/events";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#719148]";

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
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/15 py-7">
        <span className="text-xl font-bold tracking-tight">door list<span className="text-[#719148]">.</span></span>
        <Link href="/organizador" className={`rounded-sm text-xs tracking-widest uppercase hover:underline ${focus}`}>Organizadores ↗</Link>
      </header>

      <main className="flex-1">
        <section aria-labelledby="welcome-title" className="grid items-center gap-10 py-12 sm:py-16 md:grid-cols-[1.4fr_1fr] md:gap-16 md:py-20">
          <div>
            <p className="mb-5 text-xs font-semibold tracking-[0.2em] text-[#527436] uppercase">Personas, ideas y buenos momentos</p>
            <h1 id="welcome-title" className="max-w-2xl text-5xl leading-[1.08] font-semibold tracking-tight sm:text-6xl lg:text-7xl">Tu próximo encuentro empieza aquí<span className="text-[#719148]">.</span></h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/75">¡Qué bueno tenerte aquí! Descubre eventos, conoce personas y encuentra algo que te mueva. Hay una puerta abierta para ti.</p>
            <a href="#eventos" className={`mt-8 inline-flex items-center gap-4 rounded-xl bg-foreground px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#315444] motion-reduce:transition-none ${focus}`}>Explorar eventos <span aria-hidden="true">↓</span></a>
          </div>
          <div className="overflow-hidden rounded-3xl bg-[#e9eedf]">
            <div aria-hidden="true" className="relative flex h-56 items-end justify-center overflow-hidden bg-[#d8e8a4] pt-8 sm:h-72">
              <span className="absolute top-8 left-8 text-4xl text-[#527436]">✳</span>
              <span className="absolute top-16 right-8 h-12 w-12 rounded-full border border-[#527436]/40" />
              <div className="relative flex h-full w-40 items-end justify-center rounded-t-full bg-[#18372c] p-3 sm:w-48">
                <div className="h-full w-full origin-left -skew-y-12 rounded-t-full border border-[#d8e8a4]/50 bg-[#315444]" />
                <span className="absolute right-8 bottom-20 h-2 w-2 rounded-full bg-[#d8e8a4]" />
              </div>
            </div>
            <p className="px-6 py-5 text-center text-sm font-medium">Una puerta abierta a nuevas conexiones.</p>
          </div>
        </section>

        <section id="eventos" aria-labelledby="events-title" className="scroll-mt-8 border-t border-foreground/15 pt-10 pb-16 sm:pb-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[#527436] uppercase">Encuentra tu próximo plan</p>
              <h2 id="events-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Eventos para conectar</h2>
            </div>
            {!failed && events.length > 0 && <p className="rounded-full bg-[#e9eedf] px-4 py-2 text-sm font-medium">{events.length} {events.length === 1 ? "encuentro por descubrir" : "encuentros por descubrir"}</p>}
          </div>

          {failed ? (
            <div role="alert" className="rounded-2xl border border-foreground/15 bg-white px-6 py-10">
              <h3 className="text-xl font-semibold">No pudimos cargar los eventos</h3>
              <p className="mt-3 text-foreground/70">Inténtalo de nuevo en unos momentos. Tu próximo encuentro puede estar muy cerca.</p>
              <form action="/" method="get" className="mt-5"><button type="submit" className={`cursor-pointer rounded-sm text-sm font-semibold underline underline-offset-4 ${focus}`}>Volver a intentar ↗</button></form>
            </div>
          ) : events.length === 0 ? (
            <div role="status" className="rounded-2xl border border-dashed border-foreground/20 bg-[#e9eedf]/50 px-6 py-12 text-center">
              <h3 className="text-xl font-semibold">Los buenos encuentros están por venir</h3>
              <p className="mx-auto mt-3 max-w-md leading-relaxed text-foreground/70">Todavía no hay eventos publicados para registrarte. Vuelve pronto para descubrir qué sigue.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {events.map(event => (
                <article key={event.id} className="flex min-w-0 flex-col rounded-2xl border border-foreground/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md motion-reduce:transition-none sm:p-7">
                  <div className="flex items-start gap-4">
                    <div aria-hidden="true" className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-[#e9eedf] px-2 py-3 text-[#527436]">
                      <span className="text-3xl leading-none font-semibold tabular-nums">{formatEventDay(event.starts_at)}</span>
                      <span className="mt-1 text-xs font-semibold uppercase">{formatEventMonth(event.starts_at)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold tracking-widest text-[#527436] uppercase">Nos vemos aquí</p>
                      <h3 className="mt-1 text-2xl leading-tight font-semibold tracking-tight wrap-break-word">{event.title}</h3>
                    </div>
                  </div>
                  <dl className="mt-6 space-y-3 text-sm">
                    <div><dt className="text-xs text-foreground/60">Fecha · Hora de Ecuador</dt><dd className="mt-1 font-medium"><time dateTime={event.starts_at}>{formatEventDate(event.starts_at)}</time></dd></div>
                    <div><dt className="text-xs text-foreground/60">Lugar</dt><dd className="mt-1 font-medium wrap-break-word">{event.venue}</dd></div>
                  </dl>
                  <p className="mt-5 mb-7 text-sm leading-relaxed whitespace-pre-wrap text-foreground/75 wrap-break-word">{event.description}</p>
                  <Link href={`/eventos/${event.id}/registro`} aria-label={`Registrarme en ${event.title}`} className={`mt-auto flex items-center justify-between gap-3 rounded-xl bg-foreground px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#315444] motion-reduce:transition-none ${focus}`}>Registrarme <span aria-hidden="true">↗</span></Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-foreground/15 py-6 text-sm text-foreground/65">Door List · Una puerta abierta a nuevas conexiones.</footer>
    </div>
  );
}
