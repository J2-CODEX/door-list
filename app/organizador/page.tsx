"use client";
import { ecuadorDate, formatLocalDate, toLocalDateTime } from "@/lib/dates";


import { type Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, loginErrorMessage, type LoginInput } from "@/lib/login";
import { createEventFormSchema, createTicketTypeFormSchema, type EventFormInput, type EventFormValues, type TicketTypeFormInput, type TicketTypeFormValues } from "@/lib/organizer-forms";
import { OrganizerLoginFields } from "./organizer-login-fields";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, Skeleton } from "@/components/ui/registration-controls";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { EventStatus } from "@/components/dashboard-ui";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import type { Event, TicketType } from "@/lib/events";
import { getTicketTypeSaveError, ticketTypeSaveErrors } from "@/lib/ticket-type-errors";
import EventCoverEditor, { type CoverEditorTransport } from "./event-cover-editor";
import { browserClient as supabase } from "@/lib/supabase/browser";
import { OrganizerEventCover } from '@/components/organizer-event-cover';
import { COVER_METADATA_COLUMNS, projectCoverRow } from '@/lib/supabase/event-cover-mapping';
const coverTransport: CoverEditorTransport = {
  request: (input, init) => fetch(input, init),
  async transfer(permission, file) {
    if (!supabase) throw new Error("Subida no disponible");
    const { error } = await supabase.storage.from(permission.uploadBucket).uploadToSignedUrl(permission.uploadPath, permission.uploadToken, file, { contentType: file.type });
    if (error) throw new Error("Subida no disponible");
  },
};
const emptyEvent = { title: "", description: "", startsAt: "", venue: "", status: "draft" as "draft" | "published", capacity: "" };

export default function Organizer() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [eventsRevision, setEventsRevision] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [coverPending, setCoverPending] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverEditorKey, setCoverEditorKey] = useState(0);
  const eventTrigger = useRef<HTMLButtonElement | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [ticketTypeSheetOpen, setTicketTypeSheetOpen] = useState(false);
  const ticketTypeTrigger = useRef<HTMLButtonElement | null>(null);
  const [ticketTypeEvent, setTicketTypeEvent] = useState<string | null>(null);
  const [ticketTypeId, setTicketTypeId] = useState<string | null>(null);

  const mutationPending = useRef(false);
  const selectedTicketTypeEvent = events.find(event => event.id === ticketTypeEvent);
  const ticketTypeAvailable = selectedTicketTypeEvent
    ? selectedTicketTypeEvent.capacity - selectedTicketTypeEvent.ticket_types
      .filter(ticketType => ticketType.id !== ticketTypeId)
      .reduce((sum, ticketType) => sum + ticketType.capacity, 0)
    : 0;
  const allocatedCapacity = events.find(event => event.id === editing)?.ticket_types.reduce((sum, type) => sum + type.capacity, 0) ?? 0;
  const loginForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" }, mode: "onTouched", reValidateMode: "onChange" });
  const eventForm = useForm<EventFormInput, unknown, EventFormValues>({ resolver: zodResolver(createEventFormSchema(allocatedCapacity)), defaultValues: emptyEvent, mode: "onTouched", reValidateMode: "onChange" });
  const ticketTypeForm = useForm<TicketTypeFormInput, unknown, TicketTypeFormValues>({ resolver: zodResolver(createTicketTypeFormSchema(ticketTypeAvailable)), defaultValues: { name: "", capacity: "" }, mode: "onTouched", reValidateMode: "onChange" });
  const eventTitle = useWatch({ control: eventForm.control, name: "title" });
  const eventStatus = useWatch({ control: eventForm.control, name: "status" });
  const eventError = eventForm.formState.errors.root?.save?.message;
  const ticketTypeError = ticketTypeForm.formState.errors.root?.save?.message;

  useEffect(() => {
    // Server rejections arrive while controls are disabled. Focus after unlocking.
    if (busy) return;
    if (sheetOpen && eventForm.getFieldState("capacity").error?.type === "server") eventForm.setFocus("capacity");
    if (ticketTypeSheetOpen && ticketTypeForm.getFieldState("capacity").error?.type === "server") ticketTypeForm.setFocus("capacity");
  }, [busy, sheetOpen, ticketTypeSheetOpen, eventForm, ticketTypeForm]);

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
    Promise.resolve(supabase.from("events").select(`id,title,description,starts_at,venue,status,capacity,event_covers(${COVER_METADATA_COLUMNS}),ticket_types(id,event_id,name,capacity)`).eq("owner_id", session.user.id).order("starts_at")).then(({ data, error }) => {
      if (!active) return;
      if (error) setEventsError("No pudimos cargar los eventos. Inténtalo de nuevo."); else { setEvents((data ?? []).map(event => ({ ...event, ...projectCoverRow(event.id, event.status === 'published', Array.isArray(event.event_covers) ? event.event_covers[0] : event.event_covers) })) as Event[]); setEventsLoaded(true); setEventsError(""); }
    }).catch(() => { if (active) setEventsError("No pudimos cargar los eventos. Inténtalo de nuevo."); }).finally(() => { if (active) setEventsLoading(false); });
    return () => { active = false; };
  }, [session, eventsRevision]);

  function refresh() {
    setEventsLoading(true);
    setEventsError("");
    setEventsRevision(value => value + 1);
  }
  async function login(values: LoginInput) {
    if (!supabase || mutationPending.current) return;
    mutationPending.current = true;
    setBusy(true); loginForm.clearErrors("root");
    try {
      const { data, error } = await supabase.auth.signInWithPassword(values);
      if (error || !data.session) loginForm.setError("root.auth", { message: loginErrorMessage(error?.status) });
      else loginForm.resetField("password");
    } catch { loginForm.setError("root.auth", { message: loginErrorMessage() }); }
    finally { mutationPending.current = false; setBusy(false); }
  }
  async function saveEvent(input: EventFormValues) {
    if (!supabase || !session || mutationPending.current || coverBusy) return;
    mutationPending.current = true;
    setBusy(true); eventForm.clearErrors("root"); setMessage("");
    try {
      const { startsAt, ...details } = input;
      const values = { ...details, starts_at: new Date(startsAt).toISOString() };
      const wasCreating = !editing;
      const { data, error } = editing
        ? await supabase.from("events").update(values).eq("id", editing).eq("owner_id", session.user.id).select("id").single()
        : await supabase.from("events").insert({ ...values, owner_id: session.user.id }).select("id").single();
      if (error || !data) {
        if (error?.code === "23514") eventForm.setError("capacity", { type: "server", message: "El aforo no es válido o es menor que las plazas asignadas. Revisa los datos." }, { shouldFocus: true });
        else eventForm.setError("root.save", { message: "No pudimos guardar el evento. Inténtalo de nuevo." });
      } else {
        setEditing(data.id); refresh();
        if (coverPending) setMessage(wasCreating ? "Evento creado. Guarda ahora la portada." : "Evento guardado. Queda pendiente guardar la portada.");
        else { setSheetOpen(false); setMessage("Evento guardado."); }
      }
    } catch { eventForm.setError("root.save", { message: "No pudimos guardar el evento. Inténtalo de nuevo." }); }
    finally { mutationPending.current = false; setBusy(false); }
  }

  function openTicketType(event: Event, trigger: HTMLButtonElement, ticketType?: TicketType) {
    ticketTypeTrigger.current = trigger;
    setTicketTypeEvent(event.id);
    setTicketTypeId(ticketType?.id ?? null);
    ticketTypeForm.reset({ name: ticketType?.name ?? "", capacity: ticketType ? String(ticketType.capacity) : "" });
    setTicketTypeSheetOpen(true);
  }

  async function saveTicketType(input: TicketTypeFormValues) {
    if (!supabase || !ticketTypeEvent || mutationPending.current) return;
    if (!selectedTicketTypeEvent) { ticketTypeForm.setError("root.save", { message: "El evento ya no está disponible." }); return; }
    mutationPending.current = true;
    setBusy(true); ticketTypeForm.clearErrors("root"); setMessage("");
    try {
      const values = { ...input, event_id: ticketTypeEvent };
      const { error } = ticketTypeId ? await supabase.from("ticket_types").update(values).eq("id", ticketTypeId).eq("event_id", ticketTypeEvent) : await supabase.from("ticket_types").insert(values);
      if (error) {
        const message = getTicketTypeSaveError(error);
        if (message === ticketTypeSaveErrors.minimumCapacity || message === ticketTypeSaveErrors.maximumCapacity) ticketTypeForm.setError("capacity", { type: "server", message }, { shouldFocus: true });
        else ticketTypeForm.setError("root.save", { message });
        return;
      }
      refresh(); setTicketTypeSheetOpen(false); setMessage("Tipo de entrada guardado.");
    } catch { ticketTypeForm.setError("root.save", { message: ticketTypeSaveErrors.unknown }); }
    finally { mutationPending.current = false; setBusy(false); }
  }
  async function remove(table: "events" | "ticket_types", id: string) {
    if (!supabase || !window.confirm(table === "events" ? "¿Eliminar este evento y todos sus tipos de entrada?" : "¿Eliminar este tipo de entrada?")) return;
    setBusy(true); setMessage("");
    try {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMessage(error.code == "23503" ? "No se puede eliminar: este evento o tipo de entrada tiene registros de asistentes." : "No pudimos eliminarlo. Inténtalo de nuevo."); else { if (table === "events" && editing === id) { setEditing(null); eventForm.reset(emptyEvent); } setTicketTypeEvent(null); refresh(); setMessage("Eliminado correctamente."); }
    } catch { setMessage("No pudimos eliminarlo. Inténtalo de nuevo."); } finally { setBusy(false); }
  }

  return <div className="flex min-h-svh flex-col">
    <SiteHeader>{session && <nav aria-label="Organizador" className="flex flex-wrap items-center gap-4"><Link href="/dashboard" className="rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">Mis eventos</Link><Button variant="secondary" onClick={() => { void supabase?.auth.signOut().then(({ error }) => { if (error) setMessage("No pudimos cerrar la sesión. Inténtalo de nuevo."); }).catch(() => setMessage("No pudimos cerrar la sesión. Inténtalo de nuevo.")); }}>Cerrar sesión</Button></nav>}</SiteHeader>
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10"><p className="text-xs font-semibold tracking-widest uppercase text-accent-foreground">Espacio del organizador</p><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Gestiona tus eventos</h1>
      {message && !sheetOpen && <Notice role="status" className="mt-6">{message}</Notice>}
      {!supabase ? <p className="mt-8">Configura las variables de Supabase para acceder al organizador.</p> : loading ? <div role="status" className="mt-12 space-y-6"><span className="sr-only">Cargando sesión…</span><Skeleton className="h-24" /><Skeleton className="h-64" /></div> : !session && !sheetOpen ? <Card className="mt-12 max-w-md"><CardContent><form noValidate onSubmit={event => { void loginForm.handleSubmit(login)(event); }} aria-busy={busy} className="space-y-4" onChangeCapture={() => loginForm.clearErrors("root")}><h2 className="text-xl font-semibold">Iniciar sesión</h2><OrganizerLoginFields form={loginForm} busy={busy} idPrefix="organizer" /><Button type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button></form></CardContent></Card> : <>
        <Sheet open={sheetOpen} onOpenChange={open => { if (busy || coverBusy) return; setSheetOpen(open); if (!open) eventForm.clearErrors(); }}>
          <Card className="mt-12"><CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><p className="font-semibold">Cada encuentro empieza aquí</p><p className="mt-1 text-sm text-foreground/60">Crea un evento y organiza sus entradas en un solo lugar.</p></div>
            <SheetTrigger asChild>
              <Button disabled={busy} onClick={e => { eventTrigger.current = e.currentTarget; setCoverPending(false); setCoverEditorKey(value => value + 1); setEditing(null); eventForm.reset(emptyEvent); eventForm.clearErrors(); }}><span aria-hidden="true" className="text-lg leading-none">+</span> Crear evento</Button>
            </SheetTrigger>
          </CardContent></Card>
          <SheetContent showCloseButton={!busy && !coverBusy} onEscapeKeyDown={e => { if (busy || coverBusy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy || coverBusy) e.preventDefault(); }} onCloseAutoFocus={e => { e.preventDefault(); eventTrigger.current?.focus(); }}>
            <SheetHeader>
              <p className="text-xs font-semibold tracking-widest text-accent-foreground uppercase">Tu próximo encuentro</p>
              <SheetTitle>{editing ? "Editar evento" : "Crear evento"}</SheetTitle>
              <SheetDescription>{editing ? "Actualiza los detalles de tu evento y guarda los cambios." : "Dale forma a tu evento. Completa los detalles para empezar a recibir asistentes."}</SheetDescription>
            </SheetHeader>
            {!session && <form noValidate onSubmit={event => { void loginForm.handleSubmit(login)(event); }} className="space-y-4 px-6" aria-label="Recuperar sesión" aria-busy={busy} onChangeCapture={() => loginForm.clearErrors("root")}>
              <Notice role="status">Tu sesión terminó. Inicia sesión aquí para conservar los cambios de este panel.</Notice>
              <OrganizerLoginFields form={loginForm} busy={busy} idPrefix="cover-session" />
              <Button type="submit" disabled={busy}>{busy ? "Entrando…" : "Recuperar sesión"}</Button>
            </form>}
            <form id="event-form" noValidate onSubmit={event => { void eventForm.handleSubmit(saveEvent)(event); }} onChangeCapture={() => eventForm.clearErrors("root")} aria-busy={busy} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              <fieldset disabled={busy} className="min-w-0 space-y-6">
                <legend className="sr-only">Detalles del evento</legend>
                <section aria-labelledby="event-details-heading" className="space-y-4">
                  <h3 id="event-details-heading" className="text-sm font-semibold">Información del evento</h3>
                  <Controller name="title" control={eventForm.control} render={({ field, fieldState }) => (<Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="event-title">Nombre del evento</FieldLabel><Input {...field} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "event-title-error" : undefined} id="event-title" required placeholder="Ej. Una noche de buenas conexiones" />{fieldState.invalid && <FieldError id="event-title-error" errors={[fieldState.error]} />}</Field>)} />
                  <Controller name="description" control={eventForm.control} render={({ field, fieldState }) => (<Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="event-description">Descripción</FieldLabel><Textarea {...field} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "event-description-error" : undefined} id="event-description" required rows={3} placeholder="Cuéntales a tus asistentes qué les espera…" />{fieldState.invalid && <FieldError id="event-description-error" errors={[fieldState.error]} />}</Field>)} />
                </section>
                <EventCoverEditor key={coverEditorKey} eventId={editing} title={eventTitle} token={session?.access_token ?? null} transport={coverTransport} onPendingChange={setCoverPending} onBusyChange={setCoverBusy} onStateChange={refresh} />
                <section aria-labelledby="event-logistics-heading" className="space-y-4 border-t border-foreground/10 pt-6">
                  <h3 id="event-logistics-heading" className="text-sm font-semibold">Cuándo y dónde</h3>
                  <Controller name="venue" control={eventForm.control} render={({ field, fieldState }) => (<Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="event-venue">Lugar</FieldLabel><Input {...field} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "event-venue-error" : undefined} id="event-venue" required placeholder="Nombre del espacio o dirección" />{fieldState.invalid && <FieldError id="event-venue-error" errors={[fieldState.error]} />}</Field>)} />
                  <Controller name="startsAt" control={eventForm.control} render={({ field, fieldState }) => (<Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="event-starts-at">Fecha y hora</FieldLabel><Input {...field} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "event-starts-at-error" : undefined} id="event-starts-at" required type="datetime-local" />{fieldState.invalid && <FieldError id="event-starts-at-error" errors={[fieldState.error]} />}</Field>)} />
                </section>
                <section aria-labelledby="event-settings-heading" className="space-y-4 border-t border-foreground/10 pt-6">
                  <h3 id="event-settings-heading" className="text-sm font-semibold">Aforo y publicación</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Controller name="capacity" control={eventForm.control} render={({ field, fieldState }) => (<Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="event-capacity">Límite de asistentes</FieldLabel><Input {...field} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "capacity-help event-capacity-error" : "capacity-help"} id="event-capacity" required type="number" min="1" max="2147483647" placeholder="Ej. 100" />{fieldState.invalid && <FieldError id="event-capacity-error" errors={[fieldState.error]} />}</Field>)} />
                    <Controller name="status" control={eventForm.control} render={({ field, fieldState }) => (<Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="event-status">Estado</FieldLabel><NativeSelect {...field} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "event-status-error" : undefined} id="event-status"><option value="draft">Borrador</option><option value="published">Publicado</option></NativeSelect>{fieldState.invalid && <FieldError id="event-status-error" errors={[fieldState.error]} />}</Field>)} />
                  </div>
                  <FieldDescription id="capacity-help">El aforo total debe cubrir las plazas asignadas a tus tipos de entrada.</FieldDescription>
                  <Notice>{eventStatus === "draft" ? "Guárdalo como borrador mientras preparas los detalles de tu encuentro." : "El evento se guardará como publicado."}</Notice>
                </section>
              </fieldset>
              {message && <Notice role="status" className="mt-6">{message}</Notice>}
              {eventError && <Notice role="alert" tone="error" className="mt-6">{eventError}</Notice>}
            </form>
            <SheetFooter>
              <SheetClose asChild><Button type="button" disabled={busy || coverBusy} variant="secondary">Cancelar</Button></SheetClose>
              <Button type="submit" form="event-form" disabled={busy || coverBusy || !session}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear evento"}</Button>
            </SheetFooter>
          </SheetContent>
        <section aria-labelledby="organizer-events-title" className="mt-12 space-y-6"><div className="flex items-center gap-4"><h2 id="organizer-events-title" className="text-2xl font-semibold tracking-tight">Tus eventos</h2>{eventsLoaded && <Badge variant="secondary">{events.length}</Badge>}</div>
          <p role="status" className={eventsLoading ? "text-sm text-foreground/60" : "sr-only"}>{eventsLoading ? eventsLoaded ? "Actualizando eventos…" : "Cargando eventos…" : ""}</p>
          {eventsError && <div role="alert" className="space-y-4"><Notice tone="error">{eventsLoaded ? "No pudimos actualizar los eventos. Mostramos la última información disponible." : eventsError}</Notice><Button variant="secondary" onClick={refresh}>Volver a intentar</Button></div>}
          <div aria-busy={eventsLoading} className="space-y-6">{!eventsLoaded && eventsLoading ? <><Skeleton className="h-64" /><Skeleton className="h-64" /></> : eventsLoaded && events.length === 0 ? <Card layout="notice"><CardContent><h3 className="text-xl font-semibold">Tu próximo evento empieza aquí</h3><p className="mt-2 text-sm leading-5 text-foreground/60">Usa «Crear evento» para añadir los detalles de tu primer encuentro.</p></CardContent></Card> : events.map(event => { const allocated = event.ticket_types.reduce((sum, ticketType) => sum + ticketType.capacity, 0); return <article key={event.id} aria-labelledby={`event-${event.id}`}><Card><CardContent><div className="flex flex-wrap justify-between gap-6"><div className="w-28 shrink-0"><OrganizerEventCover eventId={event.id} token={session?.access_token ?? null} cover={event.cover} title={event.title} sizes="112px" variant="thumbnail" /></div><div className="min-w-0 flex-1 space-y-4"><EventStatus status={event.status} /><h3 id={`event-${event.id}`} className="text-xl font-semibold wrap-anywhere">{event.title}</h3><p className="text-sm leading-5 text-foreground/60 wrap-anywhere"><time dateTime={event.starts_at}>{formatLocalDate(event.starts_at)}</time> · {event.venue}</p><p className="text-sm leading-5 whitespace-pre-wrap text-foreground/60 wrap-anywhere">{event.description}</p><p className="text-sm font-medium tabular-nums">Aforo asignado: {allocated} / {event.capacity}</p></div><div className="flex w-full flex-col flex-wrap gap-4 sm:flex-row">{event.status === "published" && ecuadorDate(event.starts_at) >= ecuadorDate() && <Link className={buttonStyles("secondary")} href={`/eventos/${event.id}/registro`} target="_blank" rel="noopener noreferrer">Ver página de registro ↗</Link>}<Button disabled={busy} variant="secondary" onClick={e => { eventTrigger.current = e.currentTarget; setCoverPending(false); setCoverEditorKey(value => value + 1); setEditing(event.id); eventForm.reset({ title: event.title, description: event.description, venue: event.venue, status: event.status, startsAt: toLocalDateTime(event.starts_at), capacity: String(event.capacity) }); eventForm.clearErrors(); setSheetOpen(true); }}>Editar evento</Button><Button disabled={busy} variant="secondary" onClick={() => void remove("events", event.id)}>Eliminar evento</Button></div></div>
          <div className="mt-6 border-t border-foreground/10 pt-6"><div className="flex flex-wrap items-center justify-between gap-4"><h4 className="text-xl font-semibold">Tipos de entrada</h4><Button disabled={busy} variant="secondary" onClick={e => openTicketType(event, e.currentTarget)}>Agregar tipo</Button></div>{event.ticket_types.length === 0 ? <p className="mt-4 text-sm text-foreground/60">Sin tipos de entrada.</p> : <ul className="mt-4 divide-y divide-foreground/10">{event.ticket_types.map(ticketType => <li key={ticketType.id} className="flex flex-col justify-between gap-4 py-4 text-sm sm:flex-row sm:items-center"><span className="min-w-0 wrap-anywhere">{ticketType.name} · {ticketType.capacity} plazas</span><span className="flex shrink-0 flex-wrap gap-4"><Button disabled={busy} variant="secondary" onClick={e => openTicketType(event, e.currentTarget, ticketType)}>Editar</Button><Button disabled={busy} variant="secondary" onClick={() => void remove("ticket_types", ticketType.id)}>Eliminar</Button></span></li>)}</ul>}</div></CardContent></Card></article>; })}</div></section>
        </Sheet>
        <Sheet open={ticketTypeSheetOpen} onOpenChange={open => { if (busy) return; setTicketTypeSheetOpen(open); if (!open) ticketTypeForm.clearErrors(); }}>
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
            <form id="ticketType-form" noValidate onSubmit={event => { void ticketTypeForm.handleSubmit(saveTicketType)(event); }} onChangeCapture={() => ticketTypeForm.clearErrors("root")} aria-busy={busy} className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6">
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
                <Controller name="name" control={ticketTypeForm.control} render={({ field, fieldState }) => (<Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="ticket-type-name">Nombre del tipo</FieldLabel><Input {...field} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "ticket-type-name-error" : undefined} id="ticket-type-name" required placeholder="Ej. General, VIP o Estudiantes" />{fieldState.invalid && <FieldError id="ticket-type-name-error" errors={[fieldState.error]} />}</Field>)} />
                <Controller name="capacity" control={ticketTypeForm.control} render={({ field, fieldState }) => (<Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="ticket-type-capacity">Aforo</FieldLabel><Input {...field} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "ticketType-capacity-help ticket-type-capacity-error" : "ticketType-capacity-help"} id="ticket-type-capacity" required type="number" min="1" max={Math.max(1, ticketTypeAvailable)} step="1" placeholder="Ej. 50" />{fieldState.invalid && <FieldError id="ticket-type-capacity-error" errors={[fieldState.error]} />}</Field>)} />
                <FieldDescription id="ticketType-capacity-help">{ticketTypeId ? `Puedes asignar hasta ${Math.max(0, ticketTypeAvailable)} plazas, incluyendo las que ya tiene este tipo.` : `Puedes asignar hasta ${Math.max(0, ticketTypeAvailable)} plazas sin superar el límite del evento.`}</FieldDescription>
              </fieldset>
              {ticketTypeAvailable < 1 && <Notice role="status">No quedan plazas disponibles. Aumenta el límite del evento o reduce el aforo de otro tipo de entrada.</Notice>}
              {ticketTypeError && <Notice id="ticketType-error" role="alert" tone="error">{ticketTypeError}</Notice>}
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
