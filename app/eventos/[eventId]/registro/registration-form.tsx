"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldError } from "@/components/ui/registration-controls";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { TicketOption } from "./ticket-option";
import { registrationSchema, type RegistrationInput, type PublicEvent } from "@/lib/registration";
import { deserializePublicEvent, type PublicEventResponse, type RegistrationResponse } from "@/lib/api-contracts";
import type { RegistrationResult } from "@/lib/registration";
async function register(input: RegistrationInput): Promise<RegistrationResult> {
  const response = await fetch("/api/registros", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) {
    const body = await response.json();
    switch (body.error) {
      case "INVALID_INPUT": case "EVENT_CLOSED": case "DUPLICATE": case "TICKET_UNAVAILABLE": return { code: body.error };
      default: return { code: "ERROR" };
    }
  }
  const data: RegistrationResponse = await response.json();
  return { code: "SUCCESS", ...data };
}
async function refreshEvent(id: string): Promise<PublicEvent | null> {
  const response = await fetch(`/api/eventos/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) {
    if (response.status === 410) return null;
    throw new Error("No se pudieron actualizar las opciones");
  }
  const data: PublicEventResponse = await response.json();
  return deserializePublicEvent(data);
}
export default function RegistrationForm({ initialEvent }: { initialEvent: PublicEvent }) {
  const [event, setEvent] = useState<PublicEvent | null>(initialEvent);
  const [message, setMessage] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ name: string; code: string; emailStatus: "sent" | "failed" } | null>(null);
  const form = useForm<RegistrationInput>({ resolver: zodResolver(registrationSchema), defaultValues: { eventId: initialEvent.id, ticketTypeId: "", name: "", email: "" } });
  const busy = form.formState.isSubmitting;
  const email = useWatch({ control: form.control, name: "email" });
  const duplicate = duplicateEmail !== null && email.trim().toLowerCase() === duplicateEmail;
  const pendingFocus = useRef<"email" | "ticketTypeId" | null>(null);
  const { setFocus } = form;
  useEffect(() => {
    if (!busy && pendingFocus.current) {
      setFocus(pendingFocus.current);
      pendingFocus.current = null;
    }
  }, [busy, setFocus]);
  async function submit(values: RegistrationInput) {
    if (duplicate) { pendingFocus.current = "email"; return; }
    setMessage("");
    try {
      const result = await register(values);
      if (result.code === "SUCCESS") { setSuccess({ name: event?.ticketTypes.find(t => t.id === values.ticketTypeId)?.name ?? "Tu entrada", code: result.ticketCode, emailStatus: result.emailStatus }); return; }
      if (result.code === "DUPLICATE") { setDuplicateEmail(values.email.trim().toLowerCase()); pendingFocus.current = "email"; return; }
      const messages = { EVENT_CLOSED: "Este evento ya no está disponible para registro.", TICKET_UNAVAILABLE: "Esta entrada ya no tiene cupo o dejó de estar disponible. Elige otra opción.", INVALID_INPUT: "Revisa los datos e inténtalo de nuevo.", ERROR: "No pudimos confirmar tu registro. Inténtalo de nuevo." };
      const text = messages[result.code]; setMessage(text);
      if (result.code === "EVENT_CLOSED") setEvent(null);
      if (result.code === "TICKET_UNAVAILABLE") {
        form.setValue("ticketTypeId", "");
        try { setEvent(await refreshEvent(initialEvent.id)); } catch { setMessage(`${text} No pudimos actualizar las opciones; vuelve a intentarlo.`); }
        pendingFocus.current = "ticketTypeId";
      }
    } catch { const text = "No pudimos confirmar tu registro. Comprueba tu conexión y vuelve a intentarlo."; setMessage(text); }
  }
  if (success) return <section id="registro" tabIndex={-1} aria-labelledby="registration-title" className="min-w-0 scroll-mt-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"><Card><CardHeader><h2 id="registration-title" tabIndex={-1} ref={el => el?.focus()} className="text-2xl font-semibold tracking-tight outline-none">Tu lugar está confirmado</h2></CardHeader><CardContent><p role="status" className="text-base leading-6 wrap-anywhere">Te esperamos en {initialEvent.title} con tu entrada {success.name}.</p><Notice role={success.emailStatus === "failed" ? "alert" : undefined} className="mt-4">{success.emailStatus === "sent" ? "Te enviamos un correo con tu entrada y el QR. Revisa también tu carpeta de spam. Puedes abrirla y guardar su enlace desde aquí." : "Tu entrada está confirmada, pero no pudimos enviar el correo. Abre tu entrada y guarda el enlace o el QR para el día del evento. No necesitas registrarte otra vez."}</Notice><Link prefetch={false} href={`/entradas/${success.code}`} className={`${buttonStyles()} mt-6 w-full`}>Ver mi entrada y QR</Link></CardContent></Card></section>;
  if (!event) return <section id="registro" tabIndex={-1} aria-labelledby="registration-title" className="min-w-0 scroll-mt-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"><Card><CardHeader><h2 id="registration-title" tabIndex={-1} ref={el => el?.focus()} className="text-2xl font-semibold tracking-tight outline-none">Registro cerrado</h2></CardHeader><CardContent><p role="status" className="text-base leading-6">Este evento ya no está disponible para registro.</p></CardContent></Card></section>;
  const available = event.ticketTypes.some(t => t.available > 0);
  return <section id="registro" tabIndex={-1} aria-labelledby="registration-title" className="min-w-0 scroll-mt-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"><Card><CardHeader><h2 id="registration-title" className="text-2xl font-semibold tracking-tight">Reserva tu lugar</h2><CardDescription>Recibirás tu entrada y el QR por correo electrónico.</CardDescription></CardHeader><CardContent>
    {!available && <Notice role="status" className="mb-6">{event.ticketTypes.length ? "Las entradas están agotadas." : "Aún no hay tipos de entrada disponibles."}</Notice>}
    <form noValidate onSubmit={submission => { void form.handleSubmit(submit)(submission); }} aria-busy={busy} className="space-y-6">
      <fieldset disabled={busy || !available} className="min-w-0 space-y-4"><legend className="sr-only">Datos del asistente</legend>
      <Controller
        name="ticketTypeId"
        control={form.control}
        render={({ field, fieldState }) => (
          <fieldset
            className="min-w-0 space-y-4"
            aria-invalid={Boolean(fieldState.invalid)}
            aria-describedby={fieldState.error ? "ticketTypeId-error" : undefined}
          >
            <legend className="mb-4 text-sm font-medium">Tipo de entrada *</legend>
            {event.ticketTypes.map(ticket => {
              const soldOut = ticket.available < 1;
              const selected = field.value === ticket.id;
              const disabled = soldOut || busy;
              const descriptionId = `ticket-${ticket.id}-availability`;
              return (
                <TicketOption key={ticket.id} selected={selected} invalid={fieldState.invalid} disabled={disabled}>
                  <input
                    type="radio"
                    name={field.name}
                    value={ticket.id}
                    checked={selected}
                    onChange={() => field.onChange(ticket.id)}
                    onBlur={field.onBlur}
                    ref={ticket.id === event.ticketTypes.find(t => t.available > 0)?.id ? field.ref : undefined}
                    disabled={disabled}
                    required
                    aria-describedby={`${descriptionId}${fieldState.error ? " ticketTypeId-error" : ""}`}
                    className="size-5 shrink-0 accent-accent-foreground"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold wrap-anywhere">{ticket.name}</span>
                    <span id={descriptionId} className="mt-1 block text-sm text-muted-foreground wrap-anywhere">
                      {soldOut ? "Sin cupo" : `${ticket.available} ${ticket.available === 1 ? "cupo disponible" : "cupos disponibles"}`}
                    </span>
                  </span>
                </TicketOption>
              );
            })}
            <FieldError id="ticketTypeId-error" message={fieldState.error?.message} />
          </fieldset>
        )}
      />
      {(["name", "email"] as const).map(name => <Controller key={name} name={name} control={form.control} render={({ field, fieldState }) => <Field data-invalid={Boolean(fieldState.invalid)}><FieldLabel htmlFor={name}>{name === "name" ? "Tu nombre" : "Correo electrónico"} *</FieldLabel><Input {...field} id={name} type={name === "email" ? "email" : "text"} autoComplete={name} maxLength={name === "name" ? 200 : 254} placeholder={name === "name" ? "¿Cómo te llamas?" : "tu@ejemplo.com"} required aria-invalid={Boolean(fieldState.invalid) || (name === "email" && duplicate)} aria-describedby={[fieldState.error ? `${name}-error` : null, name === "email" && duplicate ? "duplicate-registration" : null].filter(Boolean).join(" ") || undefined} /><FieldError id={`${name}-error`} message={fieldState.error?.message} /></Field>} />)}
      </fieldset>
      {duplicate && <Notice id="duplicate-registration" role="alert"><span className="block font-semibold">Ya tienes un registro con este correo</span><span className="mt-2 block">Busca el correo de Door List con tu entrada y revisa también la carpeta de spam. Si no lo encuentras, pide a quien organiza el evento que te reenvíe la entrada. No necesitas registrarte otra vez.</span><span className="mt-2 block">Si escribiste un correo equivocado, puedes corregirlo.</span></Notice>}
      {message && <Notice role="alert" tone="error">{message}</Notice>}
      {duplicate ? <Button type="button" variant="secondary" className="w-full" onClick={() => form.setFocus("email", { shouldSelect: true })}>Corregir correo</Button> : <Button type="submit" disabled={busy || !available} className="w-full">{busy ? "Confirmando registro…" : "Confirmar mi registro"}</Button>}<p className="text-xs leading-relaxed text-muted-foreground">Todos los campos son obligatorios. Un registro por correo para este evento. El cupo se confirma al enviar.</p>
    </form></CardContent></Card></section>;
}
