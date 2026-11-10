"use client";
import { ecuadorDate, formatLocalDate, toLocalDateTime } from "@/lib/dates";


import { type Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, Skeleton } from "@/components/ui/registration-controls";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { EventStatus } from "@/components/dashboard-ui";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import type { Event, TicketType } from "@/lib/events";
import { browserClient as supabase } from "@/lib/supabase/browser";
const emptyEvent = { title: "", description: "", starts_at: "", venue: "", status: "draft" as "draft" | "published", capacity: "" };

export default function Organizer() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [eventsRevision, setEventsRevision] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [eventError, setEventError] = useState("");
  const eventTrigger = useRef<HTMLButtonElement | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyEvent);
  const [ticketTypeSheetOpen, setTicketTypeSheetOpen] = useState(false);
  const [ticketTypeError, setTicketTypeError] = useState("");
  const ticketTypeTrigger = useRef<HTMLButtonElement | null>(null);
  const [ticketTypeEvent, setTicketTypeEvent] = useState<string | null>(null);
  const [ticketTypeId, setTicketTypeId] = useState<string | null>(null);
  const [ticketTypeName, setTicketTypeName] = useState("");
  const [ticketTypeCapacity, setTicketTypeCapacity] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    client.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); }).catch(() => { setMessage("No pudimos cargar tu sesión. Inténtalo de nuevo."); setLoading(false); });
    const { data } = client.auth.onAuthStateChange((_event, current) => { setSession(current); if (!current) { setEvents([]); setEventsLoaded(false); setEventsLoading(true); } });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    let active = true;
    Promise.resolve(supabase.from("events").select("id,title,description,starts_at,venue,status,capacity,ticket_types(id,event_id,name,capacity)").eq("owner_id", session.user.id).order("starts_at")).then(({ data, error }) => {
      if (!active) return;
      if (error) setEventsError("No pudimos cargar los eventos. Inténtalo de nuevo."); else { setEvents((data ?? []) as Event[]); setEventsLoaded(true); setEventsError(""); }
    }).catch(() => { if (active) setEventsError("No pudimos cargar los eventos. Inténtalo de nuevo."); }).finally(() => { if (active) setEventsLoading(false); });
    return () => { active = false; };
  }, [session, eventsRevision]);

  function refresh() {
    setEventsLoading(true);
    setEventsError("");
    setEventsRevision(value => value + 1);
  }
  async function login(e: FormEvent) {
    e.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage("");
    try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage("No se pudo iniciar sesión. Comprueba tu correo y contraseña.");
    } catch { setMessage("No se pudo iniciar sesión. Inténtalo de nuevo."); } finally { setBusy(false); }
  }
  async function saveEvent(e: FormEvent) {
    e.preventDefault(); if (!supabase || !session) return;
    const capacity = Number(form.capacity);
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 2147483647 || !form.title.trim() || !form.description.trim() || !form.venue.trim() || !form.starts_at || Number.isNaN(new Date(form.starts_at).getTime())) { setEventError("Completa todos los campos y usa un límite válido."); return; }
    const allocated = events.find(event => event.id === editing)?.ticket_types.reduce((sum, ticketType) => sum + ticketType.capacity, 0) ?? 0;
    if (capacity < allocated) { setEventError(`El límite debe ser al menos ${allocated}, el aforo ya asignado.`); return; }
    setBusy(true); setEventError(""); setMessage("");
    try {
    const values = { title: form.title.trim(), description: form.description.trim(), venue: form.venue.trim(), starts_at: new Date(form.starts_at).toISOString(), status: form.status, capacity };
    const { error } = editing ? await supabase.from("events").update(values).eq("id", editing).eq("owner_id", session.user.id) : await supabase.from("events").insert({ ...values, owner_id: session.user.id });
    if (error) setEventError(error.code === "23514" ? "El aforo no es válido o es menor que las plazas asignadas. Revisa los datos." : "No pudimos guardar el evento. Inténtalo de nuevo."); else { refresh(); setSheetOpen(false); setMessage("Evento guardado."); }
    } catch { setEventError("No pudimos guardar el evento. Inténtalo de nuevo."); } finally { setBusy(false); }
  }
  const selectedTicketTypeEvent = events.find(event => event.id === ticketTypeEvent);
  const ticketTypeAvailable = selectedTicketTypeEvent
    ? selectedTicketTypeEvent.capacity - selectedTicketTypeEvent.ticket_types
      .filter(ticketType => ticketType.id !== ticketTypeId)
      .reduce((sum, ticketType) => sum + ticketType.capacity, 0)
    : 0;

  function openTicketType(event: Event, trigger: HTMLButtonElement, ticketType?: TicketType) {
    ticketTypeTrigger.current = trigger;
    setTicketTypeEvent(event.id);
    setTicketTypeId(ticketType?.id ?? null);
    setTicketTypeName(ticketType?.name ?? "");
    setTicketTypeCapacity(ticketType ? String(ticketType.capacity) : "");
    setTicketTypeError("");
    setTicketTypeSheetOpen(true);
  }

  async function saveTicketType(e: FormEvent) {
    e.preventDefault(); if (!supabase || !ticketTypeEvent || busy) return;
    const event = events.find(item => item.id === ticketTypeEvent);
    if (!event) { setTicketTypeError("El evento ya no está disponible."); return; }
    const capacity = Number(ticketTypeCapacity);
    const allocated = event.ticket_types.filter(ticketType => ticketType.id !== ticketTypeId).reduce((sum, ticketType) => sum + ticketType.capacity, 0);
    if (!ticketTypeName.trim() || !Number.isSafeInteger(capacity) || capacity < 1 || capacity > 2147483647) { setTicketTypeError("Indica un nombre y un aforo válido."); return; }
    if (allocated + capacity > event.capacity) { setTicketTypeError(`El aforo disponible para este tipo es ${event.capacity - allocated}.`); return; }
    setBusy(true); setTicketTypeError(""); setMessage("");
    try {
      const values = { name: ticketTypeName.trim(), capacity, event_id: ticketTypeEvent };
      const { error } = ticketTypeId ? await supabase.from("ticket_types").update(values).eq("id", ticketTypeId).eq("event_id", ticketTypeEvent) : await supabase.from("ticket_types").insert(values);
      if (error) { setTicketTypeError(error.code === "23514" ? "El aforo supera el disponible para este evento. Revisa los datos." : "No pudimos guardar el tipo de entrada. Inténtalo de nuevo."); return; }
      refresh();
      setTicketTypeSheetOpen(false);
      setMessage("Tipo de entrada guardado.");
    } catch {
      setTicketTypeError("No se pudo guardar el tipo de entrada. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(table: "events" | "ticket_types", id: string) {
    if (!supabase || !window.confirm(table === "events" ? "¿Eliminar este evento y todos sus tipos de entrada?" : "¿Eliminar este tipo de entrada?")) return;
    setBusy(true); setMessage("");
    try {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMessage(error.code == "23503" ? "No se puede eliminar: este evento o tipo de entrada tiene registros de asistentes." : "No pudimos eliminarlo. Inténtalo de nuevo."); else { if (table === "events" && editing === id) { setEditing(null); setForm(emptyEvent); } setTicketTypeEvent(null); refresh(); setMessage("Eliminado correctamente."); }
    } catch { setMessage("No pudimos eliminarlo. Inténtalo de nuevo."); } finally { setBusy(false); }
  }

  return <div className="flex min-h-svh flex-col">
    <SiteHeader>{session && <nav aria-label="Organizador" className="flex flex-wrap items-center gap-4"><Link href="/dashboard" className="rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">Mis eventos</Link><Button variant="secondary" onClick={() => { void supabase?.auth.signOut().then(({ error }) => { if (error) setMessage("No pudimos cerrar la sesión. Inténtalo de nuevo."); }).catch(() => setMessage("No pudimos cerrar la sesión. Inténtalo de nuevo.")); }}>Cerrar sesión</Button></nav>}</SiteHeader>
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10"><p className="text-xs font-semibold tracking-widest uppercase text-accent-foreground">Espacio del organizador</p><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Gestiona tus eventos</h1>
      {message && <Notice role="status" className="mt-6">{message}</Notice>}
      {!supabase ? <p className="mt-8">Configura las variables de Supabase para acceder al organizador.</p> : loading ? <div role="status" className="mt-12 space-y-6"><span className="sr-only">Cargando sesión…</span><Skeleton className="h-24" /><Skeleton className="h-64" /></div> : !session ? <Card className="mt-12 max-w-md"><CardContent><form onSubmit={login} aria-busy={busy} className="space-y-4"><h2 className="text-xl font-semibold">Iniciar sesión</h2><Field><FieldLabel htmlFor="organizer-email">Correo</FieldLabel><Input id="organizer-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field><Field><FieldLabel htmlFor="organizer-password">Contraseña</FieldLabel><Input id="organizer-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></Field><Button disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button></form></CardContent></Card> : <>
        <Sheet open={sheetOpen} onOpenChange={open => { if (busy) return; setSheetOpen(open); if (!open) setEventError(""); }}>
          <Card className="mt-12"><CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><p className="font-semibold">Cada encuentro empieza aquí</p><p className="mt-1 text-sm text-foreground/60">Crea un evento y organiza sus entradas en un solo lugar.</p></div>
            <SheetTrigger asChild>
              <Button disabled={busy} onClick={e => { eventTrigger.current = e.currentTarget; setEditing(null); setForm(emptyEvent); setEventError(""); }}><span aria-hidden="true" className="text-lg leading-none">+</span> Crear evento</Button>
            </SheetTrigger>
          </CardContent></Card>
          <SheetContent showCloseButton={!busy} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy) e.preventDefault(); }} onCloseAutoFocus={e => { e.preventDefault(); eventTrigger.current?.focus(); }}>
            <SheetHeader>
              <p className="text-xs font-semibold tracking-widest text-accent-foreground uppercase">Tu próximo encuentro</p>
              <SheetTitle>{editing ? "Editar evento" : "Crear evento"}</SheetTitle>
              <SheetDescription>{editing ? "Actualiza los detalles de tu evento y guarda los cambios." : "Dale forma a tu evento. Completa los detalles para empezar a recibir asistentes."}</SheetDescription>
            </SheetHeader>
            <form id="event-form" onSubmit={saveEvent} aria-busy={busy} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              <fieldset disabled={busy} className="min-w-0 space-y-6">
                <legend className="sr-only">Detalles del evento</legend>
                <section aria-labelledby="event-details-heading" className="space-y-4">
                  <h3 id="event-details-heading" className="text-sm font-semibold">Información del evento</h3>
                  <Field><FieldLabel htmlFor="event-title">Nombre del evento</FieldLabel><Input id="event-title" required placeholder="Ej. Una noche de buenas conexiones" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
                  <Field><FieldLabel htmlFor="event-description">Descripción</FieldLabel><Textarea id="event-description" required rows={3} placeholder="Cuéntales a tus asistentes qué les espera…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
                </section>
                <section aria-labelledby="event-logistics-heading" className="space-y-4 border-t border-foreground/10 pt-6">
                  <h3 id="event-logistics-heading" className="text-sm font-semibold">Cuándo y dónde</h3>
                  <Field><FieldLabel htmlFor="event-venue">Lugar</FieldLabel><Input id="event-venue" required placeholder="Nombre del espacio o dirección" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></Field>
                  <Field><FieldLabel htmlFor="event-starts-at">Fecha y hora</FieldLabel><Input id="event-starts-at" required type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></Field>
                </section>
                <section aria-labelledby="event-settings-heading" className="space-y-4 border-t border-foreground/10 pt-6">
                  <h3 id="event-settings-heading" className="text-sm font-semibold">Aforo y publicación</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field><FieldLabel htmlFor="event-capacity">Límite de asistentes</FieldLabel><Input id="event-capacity" required type="number" min="1" max="2147483647" aria-describedby="capacity-help" placeholder="Ej. 100" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></Field>
                    <Field><FieldLabel htmlFor="event-status">Estado</FieldLabel><NativeSelect id="event-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Event["status"] })}><option value="draft">Borrador</option><option value="published">Publicado</option></NativeSelect></Field>
                  </div>
                  <FieldDescription id="capacity-help">El aforo total debe cubrir las plazas asignadas a tus tipos de entrada.</FieldDescription>
                  <Notice>{form.status === "draft" ? "Guárdalo como borrador mientras preparas los detalles de tu encuentro." : "El evento se guardará como publicado."}</Notice>
                </section>
              </fieldset>
              {eventError && <Notice role="alert" tone="error" className="mt-6">{eventError}</Notice>}
            </form>
            <SheetFooter>
              <SheetClose asChild><Button type="button" disabled={busy} variant="secondary">Cancelar</Button></SheetClose>
              <Button type="submit" form="event-form" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear evento"}</Button>
            </SheetFooter>
          </SheetContent>
        <section aria-labelledby="organizer-events-title" className="mt-12 space-y-6"><div className="flex items-center gap-4"><h2 id="organizer-events-title" className="text-2xl font-semibold tracking-tight">Tus eventos</h2>{eventsLoaded && <Badge variant="secondary">{events.length}</Badge>}</div>
          <p role="status" className={eventsLoading ? "text-sm text-foreground/60" : "sr-only"}>{eventsLoading ? eventsLoaded ? "Actualizando eventos…" : "Cargando eventos…" : ""}</p>
          {eventsError && <div role="alert" className="space-y-4"><Notice tone="error">{eventsLoaded ? "No pudimos actualizar los eventos. Mostramos la última información disponible." : eventsError}</Notice><Button variant="secondary" onClick={refresh}>Volver a intentar</Button></div>}
          <div aria-busy={eventsLoading} className="space-y-6">{!eventsLoaded && eventsLoading ? <><Skeleton className="h-64" /><Skeleton className="h-64" /></> : eventsLoaded && events.length === 0 ? <Card layout="notice"><CardContent><h3 className="text-xl font-semibold">Tu próximo evento empieza aquí</h3><p className="mt-2 text-sm leading-5 text-foreground/60">Usa «Crear evento» para añadir los detalles de tu primer encuentro.</p></CardContent></Card> : events.map(event => { const allocated = event.ticket_types.reduce((sum, ticketType) => sum + ticketType.capacity, 0); return <article key={event.id} aria-labelledby={`event-${event.id}`}><Card><CardContent><div className="flex flex-wrap justify-between gap-6"><div className="min-w-0 flex-1 space-y-4"><EventStatus status={event.status} /><h3 id={`event-${event.id}`} className="text-xl font-semibold wrap-anywhere">{event.title}</h3><p className="text-sm leading-5 text-foreground/60 wrap-anywhere"><time dateTime={event.starts_at}>{formatLocalDate(event.starts_at)}</time> · {event.venue}</p><p className="text-sm leading-5 whitespace-pre-wrap text-foreground/60 wrap-anywhere">{event.description}</p><p className="text-sm font-medium tabular-nums">Aforo asignado: {allocated} / {event.capacity}</p></div><div className="flex w-full flex-col flex-wrap gap-4 sm:flex-row">{event.status === "published" && ecuadorDate(event.starts_at) >= ecuadorDate() && <Link className={buttonStyles("secondary")} href={`/eventos/${event.id}/registro`} target="_blank" rel="noopener noreferrer">Ver página de registro ↗</Link>}<Button disabled={busy} variant="secondary" onClick={e => { eventTrigger.current = e.currentTarget; setEditing(event.id); setForm({ ...event, starts_at: toLocalDateTime(event.starts_at), capacity: String(event.capacity) }); setEventError(""); setSheetOpen(true); }}>Editar evento</Button><Button disabled={busy} variant="secondary" onClick={() => void remove("events", event.id)}>Eliminar evento</Button></div></div>
          <div className="mt-6 border-t border-foreground/10 pt-6"><div className="flex flex-wrap items-center justify-between gap-4"><h4 className="text-xl font-semibold">Tipos de entrada</h4><Button disabled={busy} variant="secondary" onClick={e => openTicketType(event, e.currentTarget)}>Agregar tipo</Button></div>{event.ticket_types.length === 0 ? <p className="mt-4 text-sm text-foreground/60">Sin tipos de entrada.</p> : <ul className="mt-4 divide-y divide-foreground/10">{event.ticket_types.map(ticketType => <li key={ticketType.id} className="flex flex-col justify-between gap-4 py-4 text-sm sm:flex-row sm:items-center"><span className="min-w-0 wrap-anywhere">{ticketType.name} · {ticketType.capacity} plazas</span><span className="flex shrink-0 flex-wrap gap-4"><Button disabled={busy} variant="secondary" onClick={e => openTicketType(event, e.currentTarget, ticketType)}>Editar</Button><Button disabled={busy} variant="secondary" onClick={() => void remove("ticket_types", ticketType.id)}>Eliminar</Button></span></li>)}</ul>}</div></CardContent></Card></article>; })}</div></section>
        </Sheet>
        <Sheet open={ticketTypeSheetOpen} onOpenChange={open => { if (busy) return; setTicketTypeSheetOpen(open); if (!open) setTicketTypeError(""); }}>
          <SheetContent
            className="sm:max-w-md"
            showCloseButton={!busy}
            onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}
            onPointerDownOutside={e => { if (busy) e.preventDefault(); }}
            onCloseAutoFocus={e => { e.preventDefault(); ticketTypeTrigger.current?.focus(); }}
          >
            <SheetHeader>
              <p className="text-xs font-semibold tracking-widest text-accent-foreground uppercase">Entradas de tu evento</p>
              <SheetTitle>{ticketTypeId ? "Editar tipo de entrada" : "Agregar tipo de entrada"}</SheetTitle>
              <SheetDescription>{ticketTypeId ? "Actualiza el nombre y las plazas asignadas a este tipo de entrada." : "Define un nombre y cuántas plazas tendrá este tipo de entrada."}</SheetDescription>
            </SheetHeader>
            <form id="ticketType-form" onSubmit={saveTicketType} aria-busy={busy} className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6">
              <section aria-labelledby="ticketType-event-heading" className="rounded-2xl border border-foreground/10 bg-background p-4">
                <h3 id="ticketType-event-heading" className="text-xs font-medium text-foreground/60">Evento</h3>
                <p className="mt-1 font-semibold wrap-anywhere">{selectedTicketTypeEvent?.title}</p>
                <dl className="mt-4 flex items-center justify-between gap-4 border-t border-foreground/10 pt-3 text-sm">
                  <dt className="text-foreground/65">Plazas disponibles para este tipo</dt>
                  <dd className="shrink-0 rounded-full bg-accent-surface px-3 py-1 font-semibold tabular-nums">{Math.max(0, ticketTypeAvailable)}</dd>
                </dl>
              </section>
              <fieldset disabled={busy || ticketTypeAvailable < 1} className="min-w-0 space-y-4">
                <legend className="sr-only">Detalles del tipo de entrada</legend>
                <Field><FieldLabel htmlFor="ticket-type-name">Nombre del tipo</FieldLabel><Input id="ticket-type-name" required placeholder="Ej. General, VIP o Estudiantes" value={ticketTypeName} onChange={e => setTicketTypeName(e.target.value)} /></Field>
                <Field><FieldLabel htmlFor="ticket-type-capacity">Aforo</FieldLabel><Input id="ticket-type-capacity" required type="number" min="1" max={Math.max(1, ticketTypeAvailable)} step="1" aria-describedby="ticketType-capacity-help" placeholder="Ej. 50" value={ticketTypeCapacity} onChange={e => setTicketTypeCapacity(e.target.value)} /></Field>
                <FieldDescription id="ticketType-capacity-help">{ticketTypeId ? `Puedes asignar hasta ${Math.max(0, ticketTypeAvailable)} plazas, incluyendo las que ya tiene este tipo.` : `Puedes asignar hasta ${Math.max(0, ticketTypeAvailable)} plazas sin superar el límite del evento.`}</FieldDescription>
              </fieldset>
              {ticketTypeAvailable < 1 && <Notice role="status">No quedan plazas disponibles. Aumenta el límite del evento o reduce el aforo de otro tipo de entrada.</Notice>}
              {ticketTypeError && <Notice role="alert" tone="error">{ticketTypeError}</Notice>}
            </form>
            <SheetFooter>
              <SheetClose asChild><Button type="button" disabled={busy} variant="secondary">Cancelar</Button></SheetClose>
              <Button type="submit" form="ticketType-form" disabled={busy || !selectedTicketTypeEvent || ticketTypeAvailable < 1}>{busy ? "Guardando…" : ticketTypeId ? "Guardar cambios" : "Guardar tipo"}</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </>}
    </main><SiteFooter><span>Espacio privado del organizador</span></SiteFooter></div>;
}
