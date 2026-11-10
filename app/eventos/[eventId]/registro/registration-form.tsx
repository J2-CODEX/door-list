"use client";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button, Card, Field, FieldLabel, FieldError, Input } from "@/components/ui/registration-controls";
import { registrationSchema, type RegistrationInput, type PublicEvent } from "@/lib/registration";
import { register, refreshEvent } from "./actions";
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
  if (success) return <Card><p className="text-sm font-semibold text-[#527436]">¡Nos vemos pronto!</p><h2 tabIndex={-1} ref={el => el?.focus()} className="mt-3 text-2xl font-semibold outline-none">Tu lugar está confirmado</h2><p role="status" className="mt-4">Te esperamos en {initialEvent.title} con tu entrada {success.name}.</p><p role={success.emailStatus === "failed" ? "alert" : undefined} className={`mt-4 rounded-xl p-4 text-sm leading-relaxed ${success.emailStatus === "failed" ? "bg-amber-50 text-amber-900" : "bg-[#e9eedf] text-[#315444]"}`}>{success.emailStatus === "sent" ? "Te enviamos un correo con tu entrada y el QR. Revisa también tu carpeta de spam. Puedes abrirla y guardar su enlace desde aquí." : "Tu entrada está confirmada, pero no pudimos enviar el correo. Abre tu entrada y guarda el enlace o el QR para el día del evento. No necesitas registrarte otra vez."}</p><Link prefetch={false} href={`/entradas/${success.code}`} className="mt-6 inline-flex w-full justify-center rounded-xl bg-foreground px-5 py-3 font-semibold text-white hover:bg-[#315444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#719148]">Ver mi entrada y QR ↗</Link></Card>;
  if (!event) return <Card><h2 className="text-2xl font-semibold">Registro cerrado</h2><p role="status" className="mt-4">Este evento ya no está disponible para registro.</p></Card>;
  const available = event.ticketTypes.some(t => t.available > 0);
  return <Card><h2 className="text-2xl font-semibold">Reserva tu lugar</h2><p className="mt-2 text-sm text-foreground/65">Unos pocos datos y estarás listo para conectar.</p>
    {!available && <p role="status" className="mt-6 rounded-xl bg-[#e9eedf] p-4">{event.ticketTypes.length ? "Las entradas están agotadas." : "Aún no hay tipos de entrada disponibles."}</p>}
    <form noValidate onSubmit={form.handleSubmit(submit)} aria-busy={busy} className="mt-7 space-y-5">
      <fieldset disabled={busy || !available} className="space-y-5"><legend className="sr-only">Datos del asistente</legend>
      <Controller
        name="ticketTypeId"
        control={form.control}
        render={({ field, fieldState }) => (
          <fieldset
            className="min-w-0 space-y-3"
            aria-invalid={fieldState.invalid}
            aria-describedby="ticketTypeId-error"
          >
            <legend className="mb-3 text-sm font-medium">Tipo de entrada *</legend>
            {event.ticketTypes.map(ticket => {
              const soldOut = ticket.available < 1;
              const selected = field.value === ticket.id;
              const disabled = soldOut || busy;
              const descriptionId = `ticket-${ticket.id}-availability`;
              return (
                <label
                  key={ticket.id}
                  className={`flex min-h-24 items-center gap-4 rounded-2xl border p-5 transition-colors focus-within:ring-2 focus-within:ring-[#719148] focus-within:ring-offset-2 ${
                    selected
                      ? "border-[#527436] bg-[#e9eedf]"
                      : fieldState.invalid && !soldOut
                        ? "border-red-300 bg-white"
                        : "border-foreground/20 bg-white"
                  } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#719148] hover:bg-[#f6f8f1]"}`}
                >
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
                    className="size-5 shrink-0 accent-[#527436]"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold wrap-break-word">{ticket.name}</span>
                    <span id={descriptionId} className="mt-1 block text-sm text-foreground/65">
                      {soldOut ? "Sin cupo" : `${ticket.available} ${ticket.available === 1 ? "cupo disponible" : "cupos disponibles"}`}
                    </span>
                  </span>
                </label>
              );
            })}
            <FieldError id="ticketTypeId-error" message={fieldState.error?.message} />
          </fieldset>
        )}
      />
      {(["name", "email"] as const).map(name => <Controller key={name} name={name} control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={name}>{name === "name" ? "Tu nombre" : "Email"} *</FieldLabel><Input {...field} id={name} type={name === "email" ? "email" : "text"} autoComplete={name} maxLength={name === "name" ? 200 : 254} placeholder={name === "name" ? "¿Cómo te llamas?" : "tu@ejemplo.com"} required aria-invalid={fieldState.invalid} aria-describedby={`${name}-error`} /><FieldError id={`${name}-error`} message={fieldState.error?.message} /></Field>} />)}
      </fieldset>
      {message && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}</p>}
      <Button type="submit" disabled={busy || !available} className="w-full">{busy ? "Confirmando registro…" : "Confirmar mi registro ↗"}</Button><p className="text-xs leading-relaxed text-foreground/60">Todos los campos son obligatorios. Un registro por email para este evento. El cupo se confirma al enviar.</p>
    </form></Card>;
}
