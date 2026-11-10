"use client";
import { ecuadorDate, formatLocalDate, toLocalDateTime } from "@/lib/dates";


import { type Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import type { Event, TicketType } from "@/lib/events";
import { browserClient as supabase } from "@/lib/supabase/browser";
const input = "w-full min-w-0 rounded-xl border border-foreground/15 bg-white px-3.5 py-2.5 text-base shadow-sm transition-colors placeholder:text-foreground/35 hover:border-foreground/30 focus-visible:border-[#719148] focus-visible:outline-2 focus-visible:outline-[#719148]/25 disabled:opacity-60 sm:text-sm";
const button = "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#315444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#719148] disabled:pointer-events-none disabled:opacity-50";
const secondary = "inline-flex cursor-pointer items-center justify-center rounded-xl border border-foreground/15 bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#719148] disabled:pointer-events-none disabled:opacity-50";
const emptyEvent = { title: "", description: "", starts_at: "", venue: "", status: "draft" as "draft" | "published", capacity: "" };

export default function Organizer() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [eventError, setEventError] = useState("");
  const eventTrigger = useRef<HTMLButtonElement | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyEvent);
  const [ticketTypeSheetOpen, setTicketSheetOpen] = useState(false);
  const [ticketTypeError, setTicketError] = useState("");
  const ticketTypeTrigger = useRef<HTMLButtonElement | null>(null);
  const [ticketTypeEvent, setTicketEvent] = useState<string | null>(null);
  const [ticketTypeId, setTicketId] = useState<string | null>(null);
  const [ticketTypeName, setTicketName] = useState("");
  const [ticketTypeCapacity, setTicketCapacity] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    client.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = client.auth.onAuthStateChange((_event, current) => { setSession(current); if (!current) setEvents([]); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    let active = true;
    supabase.from("events").select("id,title,description,starts_at,venue,status,capacity,ticket_types(id,event_id,name,capacity)").eq("owner_id", session.user.id).order("starts_at").then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage(error.message); else setEvents((data ?? []) as Event[]);
    });
    return () => { active = false; };
  }, [session]);

  async function refresh() {
    if (!supabase || !session) return;
    const { data, error } = await supabase.from("events").select("id,title,description,starts_at,venue,status,capacity,ticket_types(id,event_id,name,capacity)").eq("owner_id", session.user.id).order("starts_at");
    if (error) setMessage(error.message); else setEvents((data ?? []) as Event[]);
  }
  async function login(e: FormEvent) {
    e.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage("No se pudo iniciar sesión. Comprueba tu correo y contraseña.");
    setBusy(false);
  }
  async function saveEvent(e: FormEvent) {
    e.preventDefault(); if (!supabase || !session) return;
    const capacity = Number(form.capacity);
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 2147483647 || !form.title.trim() || !form.description.trim() || !form.venue.trim() || !form.starts_at || Number.isNaN(new Date(form.starts_at).getTime())) { setEventError("Completa todos los campos y usa un límite válido."); return; }
    const allocated = events.find(event => event.id === editing)?.ticket_types.reduce((sum, ticketType) => sum + ticketType.capacity, 0) ?? 0;
    if (capacity < allocated) { setEventError(`El límite debe ser al menos ${allocated}, el aforo ya asignado.`); return; }
    setBusy(true); setEventError(""); setMessage("");
    const values = { title: form.title.trim(), description: form.description.trim(), venue: form.venue.trim(), starts_at: new Date(form.starts_at).toISOString(), status: form.status, capacity };
    const { error } = editing ? await supabase.from("events").update(values).eq("id", editing).eq("owner_id", session.user.id) : await supabase.from("events").insert({ ...values, owner_id: session.user.id });
    if (error) setEventError(error.message); else { await refresh(); setSheetOpen(false); setMessage("Evento guardado."); }
    setBusy(false);
  }
  const selectedTicketTypeEvent = events.find(event => event.id === ticketTypeEvent);
  const ticketTypeTypeAvailable = selectedTicketTypeEvent
    ? selectedTicketTypeEvent.capacity - selectedTicketTypeEvent.ticket_types
      .filter(ticketType => ticketType.id !== ticketTypeId)
      .reduce((sum, ticketType) => sum + ticketType.capacity, 0)
    : 0;

  function openTicketType(event: Event, trigger: HTMLButtonElement, ticketType?: TicketType) {
    ticketTypeTrigger.current = trigger;
    setTicketEvent(event.id);
    setTicketId(ticketType?.id ?? null);
    setTicketName(ticketType?.name ?? "");
    setTicketCapacity(ticketType ? String(ticketType.capacity) : "");
    setTicketError("");
    setTicketSheetOpen(true);
  }

  async function saveTicketType(e: FormEvent) {
    e.preventDefault(); if (!supabase || !ticketTypeEvent || busy) return;
    const event = events.find(item => item.id === ticketTypeEvent);
    if (!event) { setTicketError("El evento ya no está disponible."); return; }
    const capacity = Number(ticketTypeCapacity);
    const allocated = event.ticket_types.filter(ticketType => ticketType.id !== ticketTypeId).reduce((sum, ticketType) => sum + ticketType.capacity, 0);
    if (!ticketTypeName.trim() || !Number.isSafeInteger(capacity) || capacity < 1 || capacity > 2147483647) { setTicketError("Indica un nombre y un aforo válido."); return; }
    if (allocated + capacity > event.capacity) { setTicketError(`El aforo disponible para este tipo es ${event.capacity - allocated}.`); return; }
    setBusy(true); setTicketError(""); setMessage("");
    try {
      const values = { name: ticketTypeName.trim(), capacity, event_id: ticketTypeEvent };
      const { error } = ticketTypeId ? await supabase.from("ticket_types").update(values).eq("id", ticketTypeId).eq("event_id", ticketTypeEvent) : await supabase.from("ticket_types").insert(values);
      if (error) { setTicketError(error.message); return; }
      await refresh();
      setTicketSheetOpen(false);
      setMessage("Tipo de entrada guardado.");
    } catch {
      setTicketError("No se pudo guardar el tipo de entrada. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(table: "events" | "ticket_types", id: string) {
    if (!supabase || !window.confirm(table === "events" ? "¿Eliminar este evento y todos sus tipos de entrada?" : "¿Eliminar este tipo de entrada?")) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMessage(error.code == "23503" ? "No se puede eliminar: este evento o tipo de entrada tiene registros de asistentes." : error.message); else { if (table === "events" && editing === id) { setEditing(null); setForm(emptyEvent); } setTicketEvent(null); await refresh(); setMessage("Eliminado correctamente."); }
    setBusy(false);
  }

  return <div className="mx-auto min-h-svh max-w-5xl px-6 py-8 sm:px-10">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#18372c]/15 pb-6"><Link href="/" className="text-xl font-bold">door list<span className="text-[#719148]">.</span></Link>{session && <button className={secondary} onClick={() => { void supabase?.auth.signOut(); }}>Cerrar sesión</button>}</header>
    <main className="py-10"><p className="text-xs font-semibold tracking-[.2em] uppercase text-[#527436]">Espacio del organizador</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Gestiona tus eventos</h1>
      {message && <p role="status" className="mt-6 rounded-lg bg-[#e5edda] p-4 text-sm">{message}</p>}
      {!supabase ? <p className="mt-8">Configura las variables de Supabase para acceder al organizador.</p> : loading ? <p className="mt-8">Cargando sesión…</p> : !session ? <form onSubmit={login} className="mt-8 max-w-md space-y-4 rounded-2xl bg-white p-6"><h2 className="text-xl font-semibold">Iniciar sesión</h2><label className="block text-sm">Correo<input className={`${input} mt-1`} type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label className="block text-sm">Contraseña<input className={`${input} mt-1`} type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={busy} className={button}>Entrar</button></form> : <>
        <Sheet open={sheetOpen} onOpenChange={open => { if (busy) return; setSheetOpen(open); if (!open) setEventError(""); }}>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-white p-5 sm:p-6">
            <div><p className="font-semibold">Cada encuentro empieza aquí</p><p className="mt-1 text-sm text-foreground/60">Crea un evento y organiza sus entradas en un solo lugar.</p></div>
            <SheetTrigger asChild>
              <button disabled={busy} className={button} onClick={e => { eventTrigger.current = e.currentTarget; setEditing(null); setForm(emptyEvent); setEventError(""); }}><span aria-hidden="true" className="text-lg leading-none">+</span> Crear evento</button>
            </SheetTrigger>
          </div>
          <SheetContent showCloseButton={!busy} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy) e.preventDefault(); }} onCloseAutoFocus={e => { e.preventDefault(); eventTrigger.current?.focus(); }}>
            <SheetHeader>
              <p className="text-[11px] font-semibold tracking-[.18em] text-[#527436] uppercase">Tu próximo encuentro</p>
              <SheetTitle>{editing ? "Editar evento" : "Crear evento"}</SheetTitle>
              <SheetDescription>{editing ? "Actualiza los detalles de tu evento y guarda los cambios." : "Dale forma a tu evento. Completa los detalles para empezar a recibir asistentes."}</SheetDescription>
            </SheetHeader>
            <form id="event-form" onSubmit={saveEvent} aria-busy={busy} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8">
              <fieldset disabled={busy} className="min-w-0 space-y-7">
                <legend className="sr-only">Detalles del evento</legend>
                <section aria-labelledby="event-details-heading" className="space-y-4">
                  <h3 id="event-details-heading" className="text-sm font-semibold">Información del evento</h3>
                  <label className="block text-sm font-medium">Nombre del evento<input required className={`${input} mt-2`} placeholder="Ej. Una noche de buenas conexiones" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
                  <label className="block text-sm font-medium">Descripción<textarea required rows={3} className={`${input} mt-2 min-h-24 resize-y`} placeholder="Cuéntales a tus asistentes qué les espera…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
                </section>
                <section aria-labelledby="event-logistics-heading" className="space-y-4 border-t border-foreground/10 pt-6">
                  <h3 id="event-logistics-heading" className="text-sm font-semibold">Cuándo y dónde</h3>
                  <label className="block text-sm font-medium">Lugar<input required className={`${input} mt-2`} placeholder="Nombre del espacio o dirección" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></label>
                  <label className="block text-sm font-medium">Fecha y hora<input required type="datetime-local" className={`${input} mt-2`} value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></label>
                </section>
                <section aria-labelledby="event-settings-heading" className="space-y-4 border-t border-foreground/10 pt-6">
                  <h3 id="event-settings-heading" className="text-sm font-semibold">Aforo y publicación</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">Límite de asistentes<input required type="number" min="1" max="2147483647" aria-describedby="capacity-help" className={`${input} mt-2`} placeholder="Ej. 100" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></label>
                    <label className="block text-sm font-medium">Estado<select className={`${input} mt-2`} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Event["status"] })}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
                  </div>
                  <p id="capacity-help" className="text-xs leading-relaxed text-foreground/60">El aforo total debe cubrir las plazas asignadas a tus tipos de entrada.</p>
                  <p className="rounded-xl bg-[#e9eedf] p-3 text-xs leading-relaxed text-foreground/75">{form.status === "draft" ? "Guárdalo como borrador mientras preparas los detalles de tu encuentro." : "El evento se guardará como publicado."}</p>
                </section>
              </fieldset>
              {eventError && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{eventError}</p>}
            </form>
            <SheetFooter>
              <SheetClose asChild><button type="button" disabled={busy} className={secondary}>Cancelar</button></SheetClose>
              <button type="submit" form="event-form" disabled={busy} className={button}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear evento"}</button>
            </SheetFooter>
          </SheetContent>
        <section className="mt-10"><div className="flex items-center gap-3"><h2 className="text-2xl font-semibold tracking-tight">Tus eventos</h2><span className="rounded-full bg-foreground/5 px-2.5 py-1 text-xs font-semibold">{events.length}</span></div>{events.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-foreground/20 px-6 py-12 text-center"><p className="font-semibold">Tu próximo evento empieza aquí</p><p className="mt-2 text-sm text-foreground/60">Usa «Crear evento» para añadir los detalles de tu primer encuentro.</p></div>}<div className="mt-4 space-y-5">{events.map(event => { const allocated = event.ticket_types.reduce((sum, ticketType) => sum + ticketType.capacity, 0); return <article key={event.id} className="rounded-2xl border border-foreground/10 bg-white p-6 shadow-sm"><div className="flex flex-wrap justify-between gap-4"><div><p className="inline-flex rounded-full bg-[#e9eedf] px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase text-[#527436]">{event.status === "published" ? "Publicado" : "Borrador"}</p><h3 className="mt-1 text-xl font-semibold">{event.title}</h3><p className="mt-1 text-sm">{formatLocalDate(event.starts_at)} · {event.venue}</p><p className="mt-2 text-sm">{event.description}</p><p className="mt-2 text-sm font-medium">Aforo asignado: {allocated} / {event.capacity}</p></div><div className="flex flex-wrap gap-2 self-start">{event.status === "published" && ecuadorDate(event.starts_at) >= ecuadorDate() && <Link className={secondary} href={`/eventos/${event.id}/registro`} target="_blank" rel="noopener noreferrer">Ver página de registro ↗</Link>}<button disabled={busy} className={secondary} onClick={e => { eventTrigger.current = e.currentTarget; setEditing(event.id); setForm({ ...event, starts_at: toLocalDateTime(event.starts_at), capacity: String(event.capacity) }); setEventError(""); setSheetOpen(true); }}>Editar</button><button disabled={busy} className={secondary} onClick={() => void remove("events", event.id)}>Eliminar</button></div></div>
          <div className="mt-6 border-t border-[#18372c]/15 pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-semibold">Tipos de entrada</h4><button disabled={busy} className={secondary} onClick={e => openTicketType(event, e.currentTarget)}>Agregar tipo</button></div>{event.ticket_types.length === 0 ? <p className="mt-3 text-sm">Sin tipos de entrada.</p> : <ul className="mt-3 space-y-2">{event.ticket_types.map(ticketType => <li key={ticketType.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm"><span>{ticketType.name} · {ticketType.capacity} plazas</span><span className="flex gap-2"><button disabled={busy} className={secondary} onClick={e => openTicketType(event, e.currentTarget, ticketType)}>Editar</button><button disabled={busy} className={secondary} onClick={() => void remove("ticket_types", ticketType.id)}>Eliminar</button></span></li>)}</ul>}
          </div></article>; })}</div></section>
        </Sheet>
        <Sheet open={ticketTypeSheetOpen} onOpenChange={open => { if (busy) return; setTicketSheetOpen(open); if (!open) setTicketError(""); }}>
          <SheetContent
            className="sm:max-w-md"
            showCloseButton={!busy}
            onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}
            onPointerDownOutside={e => { if (busy) e.preventDefault(); }}
            onCloseAutoFocus={e => { e.preventDefault(); ticketTypeTrigger.current?.focus(); }}
          >
            <SheetHeader>
              <p className="text-[11px] font-semibold tracking-[.18em] text-[#527436] uppercase">Entradas de tu evento</p>
              <SheetTitle>{ticketTypeId ? "Editar tipo de entrada" : "Agregar tipo de entrada"}</SheetTitle>
              <SheetDescription>{ticketTypeId ? "Actualiza el nombre y las plazas asignadas a este tipo de entrada." : "Define un nombre y cuántas plazas tendrá este tipo de entrada."}</SheetDescription>
            </SheetHeader>
            <form id="ticketType-form" onSubmit={saveTicketType} aria-busy={busy} className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6 sm:p-8">
              <section aria-labelledby="ticketType-event-heading" className="rounded-2xl border border-foreground/10 bg-background p-4">
                <h3 id="ticketType-event-heading" className="text-xs font-medium text-foreground/60">Evento</h3>
                <p className="mt-1 font-semibold wrap-break-word">{selectedTicketTypeEvent?.title}</p>
                <dl className="mt-4 flex items-center justify-between gap-3 border-t border-foreground/10 pt-3 text-sm">
                  <dt className="text-foreground/65">Plazas disponibles para este tipo</dt>
                  <dd className="shrink-0 rounded-full bg-[#e9eedf] px-3 py-1 font-semibold tabular-nums">{Math.max(0, ticketTypeTypeAvailable)}</dd>
                </dl>
              </section>
              <fieldset disabled={busy || ticketTypeTypeAvailable < 1} className="min-w-0 space-y-5">
                <legend className="sr-only">Detalles del tipo de entrada</legend>
                <label className="block text-sm font-medium">Nombre del tipo<input required className={`${input} mt-2`} placeholder="Ej. General, VIP o Estudiantes" value={ticketTypeName} onChange={e => setTicketName(e.target.value)} /></label>
                <label className="block text-sm font-medium">Aforo<input required type="number" min="1" max={Math.max(1, ticketTypeTypeAvailable)} step="1" aria-describedby="ticketType-capacity-help" className={`${input} mt-2`} placeholder="Ej. 50" value={ticketTypeCapacity} onChange={e => setTicketCapacity(e.target.value)} /></label>
                <p id="ticketType-capacity-help" className="text-xs leading-relaxed text-foreground/60">{ticketTypeId ? `Puedes asignar hasta ${Math.max(0, ticketTypeTypeAvailable)} plazas, incluyendo las que ya tiene este tipo.` : `Puedes asignar hasta ${Math.max(0, ticketTypeTypeAvailable)} plazas sin superar el límite del evento.`}</p>
              </fieldset>
              {ticketTypeTypeAvailable < 1 && <p role="status" className="rounded-xl bg-[#e9eedf] p-4 text-sm leading-relaxed">No quedan plazas disponibles. Aumenta el límite del evento o reduce el aforo de otro tipo de entrada.</p>}
              {ticketTypeError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{ticketTypeError}</p>}
            </form>
            <SheetFooter>
              <SheetClose asChild><button type="button" disabled={busy} className={secondary}>Cancelar</button></SheetClose>
              <button type="submit" form="ticketType-form" disabled={busy || !selectedTicketTypeEvent || ticketTypeTypeAvailable < 1} className={button}>{busy ? "Guardando…" : ticketTypeId ? "Guardar cambios" : "Guardar tipo"}</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </>}
    </main></div>;
}
