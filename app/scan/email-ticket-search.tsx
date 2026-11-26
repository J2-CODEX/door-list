"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDashboardToken } from "@/components/dashboard-session";
import { emailTicketSearchRequestSchema, emailTicketSearchResponseSchema, type EmailTicketSearchRequest, type EmailTicketSearchResponse } from "@/lib/check-in-email";
import { formatEventDate } from "@/lib/dates";

export function EmailTicketSearch({ eventId, onValidate }: { eventId: string; onValidate: (ticketCode: string) => void }) {
  const token = useDashboardToken();
  const form = useForm<EmailTicketSearchRequest>({ resolver: zodResolver(emailTicketSearchRequestSchema), defaultValues: { eventId, email: "" }, mode: "onTouched", reValidateMode: "onChange" });
  const email = useWatch({ control: form.control, name: "email" });
  const [registration, setRegistration] = useState<EmailTicketSearchResponse["registration"] | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [notFound, setNotFound] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  async function search(input: EmailTicketSearchRequest) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setPending(true); setMessage(""); setNotFound(false);
    try {
      const response = await fetch("/api/organizador/check-in/buscar", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(input), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 404) {
          setRegistration(null); setNotFound(true);
          setMessage("No encontramos un registro con ese email en este evento. Revisa el email y el evento seleccionado.");
        } else if (response.status === 401) setMessage("Tu sesión terminó. Vuelve al panel e inicia sesión.");
        else if (response.status === 403) setMessage("No tienes permiso para controlar este evento. Revisa la sesión y el evento.");
        else throw new Error("Search unavailable");
      } else {
        const result = emailTicketSearchResponseSchema.parse(await response.json());
        if (!controller.signal.aborted) setRegistration(result.registration);
      }
    } catch {
      if (request.current === controller) setMessage("No pudimos buscar al asistente. Revisa la conexión y vuelve a buscar.");
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setPending(false); }
    }
  }

  const currentEmail = email.trim().toLowerCase();
  const canCheckIn = registration?.ticketStatus === "valid" && Boolean(registration.ticketCode)
    && registration.email === currentEmail && !pending && !message && !form.formState.errors.email;
  return <section className="space-y-6" aria-labelledby="email-search-heading">
    <div className="space-y-2">
      <h2 id="email-search-heading" className="text-2xl font-semibold tracking-tight">Buscar por email</h2>
      <p>Si el QR no se deja leer, busca el email usado para registrarse.</p>
    </div>
    <form noValidate onSubmit={event => { void form.handleSubmit(search)(event); }} className="space-y-4" aria-busy={pending}>
      <Controller name="email" control={form.control} render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="attendee-email">Email del asistente</FieldLabel>
          <Input {...field} id="attendee-email" type="email" autoComplete="off" autoCapitalize="none" spellCheck={false}
            required maxLength={254} disabled={pending} aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.invalid ? "email-search-help email-search-error" : "email-search-help"} />
          <FieldDescription id="email-search-help">La búsqueda usa el email completo y solo incluye este evento. Buscar no registra el ingreso.</FieldDescription>
          {fieldState.invalid && <FieldError id="email-search-error" errors={[fieldState.error]} />}
        </Field>
      )} />
      <Button type="submit" size="scan" className="w-full" disabled={pending || !email.trim()}>{pending ? "Buscando asistente…" : "Buscar asistente"}</Button>
    </form>
    {message && (notFound ? <p id="email-search-message" role="status">{message}</p> : <FieldError id="email-search-message">{message}</FieldError>)}
    {registration && <div className="space-y-4" aria-busy={pending}>
      <div className="space-y-2" role="status" aria-live="polite">
        <h3 className="text-xl font-semibold wrap-anywhere">{registration.name}</h3>
        <p className="wrap-anywhere">{registration.email}</p>
        <p className="wrap-anywhere">{registration.ticketType}</p>
        <p>{registration.ticketStatus === "valid" ? "Entrada válida. Confirma los datos antes de registrar el ingreso." : registration.ticketStatus === "used" ? "Entrada usada. No permite otro ingreso." : registration.ticketStatus === "revoked" ? "Entrada revocada. No permite el ingreso." : "Sin entrada disponible. No autorices el ingreso."}</p>
        {registration.checkedInAt && <p className="text-sm">Ingreso registrado: <time dateTime={registration.checkedInAt}>{formatEventDate(registration.checkedInAt)}</time></p>}
      </div>
      <Button size="scan" className="w-full" disabled={!canCheckIn} onClick={() => { if (canCheckIn && registration.ticketCode) onValidate(registration.ticketCode); }}>Registrar ingreso</Button>
      {registration.email !== currentEmail && <p role="status" className="text-sm">El email cambió. Vuelve a buscar antes de registrar el ingreso.</p>}
    </div>}
  </section>;
}
