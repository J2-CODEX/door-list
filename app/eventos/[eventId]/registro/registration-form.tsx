"use client";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
  const [success, setSuccess] = useState<{ name: string; code: string; emailStatus: "sent" | "failed" } | null>(null);
  const form = useForm<RegistrationInput>({ resolver: zodResolver(registrationSchema), defaultValues: { eventId: initialEvent.id, ticketTypeId: "", name: "", email: "" } });
  const busy = form.formState.isSubmitting;
  async function submit(values: RegistrationInput) {
    setMessage("");
    try {
      const result = await register(values);
      if (result.code === "SUCCESS") { setSuccess({ name: event?.ticketTypes.find(t => t.id === values.ticketTypeId)?.name ?? "Tu entrada", code: result.ticketCode, emailStatus: result.emailStatus }); toast.success("¡Tu lugar está confirmado!"); if (result.emailStatus === "failed") toast.warning("Tu registro está confirmado, pero no pudimos enviar el correo. Guarda tu entrada desde aquí."); return; }
      const messages = { EVENT_CLOSED: "Este evento ya no está disponible para registro.", TICKET_UNAVAILABLE: "Esta entrada ya no tiene cupo o dejó de estar disponible. Elige otra opción.", DUPLICATE: "Este email ya tiene un registro para este evento.", INVALID_INPUT: "Revisa los datos e inténtalo de nuevo.", ERROR: "No pudimos confirmar tu registro. Inténtalo de nuevo." };
      const text = messages[result.code]; setMessage(text); toast.error(text);
      if (result.code === "EVENT_CLOSED") setEvent(null);
      if (result.code === "TICKET_UNAVAILABLE") {
        form.setValue("ticketTypeId", "");
        try { setEvent(await refreshEvent(initialEvent.id)); } catch { setMessage(`${text} No pudimos actualizar las opciones; vuelve a intentarlo.`); }
        form.setFocus("ticketTypeId");
      }
    } catch { const text = "No pudimos confirmar tu registro. Comprueba tu conexión y vuelve a intentarlo."; setMessage(text); toast.error(text); }
  }
  if (success) return <section aria-labelledby="registration-title" className="min-w-0"><Card><CardHeader><p className="text-sm font-semibold text-accent-foreground">¡Nos vemos pronto!</p><h2 id="registration-title" tabIndex={-1} ref={el => el?.focus()} className="text-2xl font-semibold tracking-tight outline-none">Tu lugar está confirmado</h2></CardHeader><CardContent><p role="status" className="text-base leading-6 wrap-anywhere">Te esperamos en {initialEvent.title} con tu entrada {success.name}.</p><Notice role={success.emailStatus === "failed" ? "alert" : undefined} className="mt-4">{success.emailStatus === "sent" ? "Te enviamos un correo con tu entrada y el QR. Revisa también tu carpeta de spam. Puedes abrirla y guardar su enlace desde aquí." : "Tu entrada está confirmada, pero no pudimos enviar el correo. Abre tu entrada y guarda el enlace o el QR para el día del evento. No necesitas registrarte otra vez."}</Notice><Link prefetch={false} href={`/entradas/${success.code}`} className={`${buttonStyles()} mt-6 w-full`}>Ver mi entrada y QR ↗</Link></CardContent></Card></section>;
  if (!event) return <section aria-labelledby="registration-title"><Card><CardHeader><h2 id="registration-title" className="text-2xl font-semibold tracking-tight">Registro cerrado</h2></CardHeader><CardContent><p role="status" className="text-base leading-6">Este evento ya no está disponible para registro.</p></CardContent></Card></section>;
  const available = event.ticketTypes.some(t => t.available > 0);
  return <section aria-labelledby="registration-title" className="min-w-0"><Card><CardHeader><h2 id="registration-title" className="text-2xl font-semibold tracking-tight">Reserva tu lugar</h2><CardDescription>Unos pocos datos y estarás listo para conectar.</CardDescription></CardHeader><CardContent>
    {!available && <Notice role="status" className="mb-6">{event.ticketTypes.length ? "Las entradas están agotadas." : "Aún no hay tipos de entrada disponibles."}</Notice>}
    <form noValidate onSubmit={form.handleSubmit(submit)} aria-busy={busy} className="space-y-6">
      <fieldset disabled={busy || !available} className="min-w-0 space-y-4"><legend className="sr-only">Datos del asistente</legend>
      <Controller
        name="ticketTypeId"
        control={form.control}
        render={({ field, fieldState }) => (
          <fieldset
            className="min-w-0 space-y-4"
            aria-invalid={fieldState.invalid}
            aria-describedby="ticketTypeId-error"
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
                    aria-describedby={`${descriptionId} ticketTypeId-error`}
                    className="size-5 shrink-0 accent-accent-foreground"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold wrap-anywhere">{ticket.name}</span>
                    <span id={descriptionId} className="mt-1 block text-sm text-foreground/65">
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
      {(["name", "email"] as const).map(name => <Controller key={name} name={name} control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={name}>{name === "name" ? "Tu nombre" : "Correo electrónico"} *</FieldLabel><Input {...field} id={name} type={name === "email" ? "email" : "text"} autoComplete={name} maxLength={name === "name" ? 200 : 254} placeholder={name === "name" ? "¿Cómo te llamas?" : "tu@ejemplo.com"} required aria-invalid={fieldState.invalid} aria-describedby={`${name}-error`} /><FieldError id={`${name}-error`} message={fieldState.error?.message} /></Field>} />)}
      </fieldset>
      {message && <Notice role="alert" tone="error">{message}</Notice>}
      <Button type="submit" disabled={busy || !available} className="w-full">{busy ? "Confirmando registro…" : "Confirmar mi registro ↗"}</Button><p className="text-xs leading-relaxed text-foreground/60">Todos los campos son obligatorios. Un registro por correo para este evento. El cupo se confirma al enviar.</p>
    </form></CardContent></Card></section>;
}
