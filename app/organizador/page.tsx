"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Ticket = { id: string; event_id: string; name: string; capacity: number };
type Event = { id: string; title: string; description: string; starts_at: string; venue: string; status: "draft" | "published"; capacity: number; ticket_types: Ticket[] };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url, key) : null;
const input = "w-full rounded-lg border border-[#18372c]/25 bg-white px-3 py-2 text-sm";
const button = "rounded-lg bg-[#18372c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "rounded-lg border border-[#18372c]/30 px-3 py-2 text-sm font-medium";
const emptyEvent = { title: "", description: "", starts_at: "", venue: "", status: "draft" as "draft" | "published", capacity: "" };

function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function Organizer() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyEvent);
  const [ticketEvent, setTicketEvent] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketName, setTicketName] = useState("");
  const [ticketCapacity, setTicketCapacity] = useState("");

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
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 2147483647 || !form.title.trim() || !form.description.trim() || !form.venue.trim() || !form.starts_at || Number.isNaN(new Date(form.starts_at).getTime())) { setMessage("Completa todos los campos y usa un límite válido."); return; }
    const allocated = events.find(event => event.id === editing)?.ticket_types.reduce((sum, ticket) => sum + ticket.capacity, 0) ?? 0;
    if (capacity < allocated) { setMessage(`El límite debe ser al menos ${allocated}, el aforo ya asignado.`); return; }
    setBusy(true); setMessage("");
    const values = { title: form.title.trim(), description: form.description.trim(), venue: form.venue.trim(), starts_at: new Date(form.starts_at).toISOString(), status: form.status, capacity };
    const { error } = editing ? await supabase.from("events").update(values).eq("id", editing).eq("owner_id", session.user.id) : await supabase.from("events").insert({ ...values, owner_id: session.user.id });
    if (error) setMessage(error.message); else { setForm(emptyEvent); setEditing(null); await refresh(); setMessage("Evento guardado."); }
    setBusy(false);
  }
  async function saveTicket(e: FormEvent) {
    e.preventDefault(); if (!supabase || !ticketEvent) return;
    const event = events.find(item => item.id === ticketEvent); if (!event) return;
    const capacity = Number(ticketCapacity);
    const allocated = event.ticket_types.filter(ticket => ticket.id !== ticketId).reduce((sum, ticket) => sum + ticket.capacity, 0);
    if (!ticketName.trim() || !Number.isSafeInteger(capacity) || capacity < 1 || capacity > 2147483647) { setMessage("Indica un nombre y un aforo válido."); return; }
    if (allocated + capacity > event.capacity) { setMessage(`El aforo disponible para este tipo es ${event.capacity - allocated}.`); return; }
    setBusy(true); setMessage("");
    const values = { name: ticketName.trim(), capacity, event_id: ticketEvent };
    const { error } = ticketId ? await supabase.from("ticket_types").update(values).eq("id", ticketId).eq("event_id", ticketEvent) : await supabase.from("ticket_types").insert(values);
    if (error) setMessage(error.message); else { setTicketEvent(null); setTicketId(null); setTicketName(""); setTicketCapacity(""); await refresh(); setMessage("Tipo de entrada guardado."); }
    setBusy(false);
  }
  async function remove(table: "events" | "ticket_types", id: string) {
    if (!supabase || !window.confirm(table === "events" ? "¿Eliminar este evento y todos sus tipos de entrada?" : "¿Eliminar este tipo de entrada?")) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMessage(error.message); else { if (table === "events" && editing === id) { setEditing(null); setForm(emptyEvent); } setTicketEvent(null); await refresh(); setMessage("Eliminado correctamente."); }
    setBusy(false);
  }

  return <div className="mx-auto min-h-svh max-w-5xl px-6 py-8 sm:px-10">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#18372c]/15 pb-6"><Link href="/" className="text-xl font-bold">door list<span className="text-[#719148]">.</span></Link>{session && <button className={secondary} onClick={() => { void supabase?.auth.signOut(); }}>Cerrar sesión</button>}</header>
    <main className="py-10"><p className="text-xs font-semibold tracking-[.2em] uppercase text-[#527436]">Espacio del organizador</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Gestiona tus eventos</h1>
      {message && <p role="status" className="mt-6 rounded-lg bg-[#e5edda] p-4 text-sm">{message}</p>}
      {!supabase ? <p className="mt-8">Configura las variables de Supabase para acceder al organizador.</p> : loading ? <p className="mt-8">Cargando sesión…</p> : !session ? <form onSubmit={login} className="mt-8 max-w-md space-y-4 rounded-2xl bg-white p-6"><h2 className="text-xl font-semibold">Iniciar sesión</h2><label className="block text-sm">Correo<input className={`${input} mt-1`} type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label className="block text-sm">Contraseña<input className={`${input} mt-1`} type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={busy} className={button}>Entrar</button></form> : <>
        <form onSubmit={saveEvent} className="mt-8 grid gap-4 rounded-2xl bg-white p-6 sm:grid-cols-2"><h2 className="text-xl font-semibold sm:col-span-2">{editing ? "Editar evento" : "Crear evento"}</h2>
          <label className="block text-sm">Nombre<input required className={`${input} mt-1`} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label className="block text-sm">Lugar<input required className={`${input} mt-1`} value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></label>
          <label className="block text-sm sm:col-span-2">Descripción<textarea required className={`${input} mt-1`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
          <label className="block text-sm">Fecha y hora<input required type="datetime-local" className={`${input} mt-1`} value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></label>
          <label className="block text-sm">Límite de asistentes<input required type="number" min="1" max="2147483647" className={`${input} mt-1`} value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></label>
          <label className="block text-sm">Estado<select className={`${input} mt-1`} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Event["status"] })}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
          <div className="flex items-end gap-2 sm:col-span-2"><button disabled={busy} className={button}>Guardar evento</button>{editing && <button type="button" className={secondary} onClick={() => { setEditing(null); setForm(emptyEvent); }}>Cancelar</button>}</div>
        </form>
        <section className="mt-10"><h2 className="text-2xl font-semibold">Tus eventos</h2>{events.length === 0 && <p className="mt-4 text-sm">Aún no tienes eventos.</p>}<div className="mt-4 space-y-5">{events.map(event => { const allocated = event.ticket_types.reduce((sum, ticket) => sum + ticket.capacity, 0); return <article key={event.id} className="rounded-2xl border border-[#18372c]/15 p-6"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-[#527436]">{event.status === "published" ? "Publicado" : "Borrador"}</p><h3 className="mt-1 text-xl font-semibold">{event.title}</h3><p className="mt-1 text-sm">{new Date(event.starts_at).toLocaleString("es-EC")} · {event.venue}</p><p className="mt-2 text-sm">{event.description}</p><p className="mt-2 text-sm font-medium">Aforo asignado: {allocated} / {event.capacity}</p></div><div className="flex gap-2 self-start"><button className={secondary} onClick={() => { setEditing(event.id); setForm({ ...event, starts_at: localDate(event.starts_at), capacity: String(event.capacity) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button disabled={busy} className={secondary} onClick={() => void remove("events", event.id)}>Eliminar</button></div></div>
          <div className="mt-6 border-t border-[#18372c]/15 pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-semibold">Tipos de entrada</h4><button className={secondary} onClick={() => { setTicketEvent(event.id); setTicketId(null); setTicketName(""); setTicketCapacity(""); }}>Agregar tipo</button></div>{event.ticket_types.length === 0 ? <p className="mt-3 text-sm">Sin tipos de entrada.</p> : <ul className="mt-3 space-y-2">{event.ticket_types.map(ticket => <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm"><span>{ticket.name} · {ticket.capacity} plazas</span><span className="flex gap-2"><button className={secondary} onClick={() => { setTicketEvent(event.id); setTicketId(ticket.id); setTicketName(ticket.name); setTicketCapacity(String(ticket.capacity)); }}>Editar</button><button disabled={busy} className={secondary} onClick={() => void remove("ticket_types", ticket.id)}>Eliminar</button></span></li>)}</ul>}
          {ticketEvent === event.id && <form onSubmit={saveTicket} className="mt-4 grid gap-3 rounded-lg bg-[#e9eedf] p-4 sm:grid-cols-2"><h5 className="font-semibold sm:col-span-2">{ticketId ? "Editar tipo" : "Nuevo tipo"}</h5><label className="text-sm">Nombre<input required className={`${input} mt-1`} value={ticketName} onChange={e => setTicketName(e.target.value)} /></label><label className="text-sm">Aforo<input required type="number" min="1" max="2147483647" className={`${input} mt-1`} value={ticketCapacity} onChange={e => setTicketCapacity(e.target.value)} /></label><p className="text-xs sm:col-span-2">La suma de los aforos no puede superar el límite del evento.</p><div className="flex gap-2 sm:col-span-2"><button disabled={busy} className={button}>Guardar tipo</button><button type="button" className={secondary} onClick={() => setTicketEvent(null)}>Cancelar</button></div></form>}</div></article>; })}</div></section>
      </>}
    </main></div>;
}
