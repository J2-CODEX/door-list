"use client";

import { useEffect, useRef, useState } from "react";
import { useDashboardToken } from "@/components/dashboard-session";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { OrganizerRegistration } from "@/lib/dashboard";
import { ticketResendResponseSchema, type TicketResendInput } from "@/lib/ticket-resend";

export function ResendTicketButton({ eventId, registration }: { eventId: string; registration: OrganizerRegistration }) {
  const token = useDashboardToken();
  const pending = useRef<AbortController | null>(null);
  const requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => () => pending.current?.abort(), []);
  const available = registration.ticketStatus === "valid";
  const unavailableReason = registration.ticketStatus === "used" ? "La entrada ya se utilizó." : registration.ticketStatus === "revoked" ? "La entrada está revocada." : "Entrada no disponible.";

  async function resend() {
    if (pending.current || !available) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError(""); setSent(false);
    let message = "No pudimos reenviar la entrada. Inténtalo de nuevo.";
    try {
      // Preserve this ID after an uncertain network failure; a confirmed resend gets a new ID.
      requestId.current ??= crypto.randomUUID();
      const body: TicketResendInput = { requestId: requestId.current };
      const response = await fetch(`/api/organizador/eventos/${encodeURIComponent(eventId)}/registros/${encodeURIComponent(registration.id)}/reenviar-entrada`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body), cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 401) message = "Tu sesión terminó. Vuelve a iniciar sesión.";
        if (response.status === 404) message = "Entrada no disponible o sin permiso de acceso. Actualiza la lista.";
        if (response.status === 409) message = "La entrada ya no está disponible para reenvío. Actualiza la lista.";
        throw new Error("Resend unavailable");
      }
      if (!ticketResendResponseSchema.safeParse(await response.json()).success) throw new Error("Invalid resend response");
      if (controller.signal.aborted) return;
      requestId.current = null;
      setSent(true);
    } catch {
      if (!controller.signal.aborted) setError(message);
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <div className="space-y-2">
    <Button type="button" variant="secondary" onClick={resend} disabled={busy || !available} aria-busy={busy} aria-label={`Reenviar entrada a ${registration.name}`} className="w-full">
      {busy ? "Reenviando…" : "Reenviar entrada"}
    </Button>
    {!available && <p className="text-xs leading-5 text-foreground/60">{unavailableReason}</p>}
    {error && <Notice tone="error" role="alert">{error}</Notice>}
    <p role="status" className={sent ? "text-xs leading-5 text-accent-foreground wrap-anywhere" : "sr-only"}>{busy ? `Reenviando la entrada a ${registration.email}…` : sent ? `Reenvío solicitado a ${registration.email}.` : ""}</p>
  </div>;
}
