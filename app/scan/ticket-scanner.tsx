"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type QrScanner from "qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/registration-controls";
import { useDashboardToken } from "@/components/dashboard-session";
import { useDashboardQuery } from "@/lib/use-dashboard-query";
import type { OrganizerEvent } from "@/lib/dashboard";
import { checkInRequestSchema, checkInResponseSchema, normalizeTicketCode, type CheckInRequest, type ScanResult as ScanResultData } from "@/lib/check-in";
import { ScanResult } from "./scan-result";

type Phase = "camera" | "manual" | "pending" | "result" | "cameraError" | "paused";

export function TicketScanner({ initialEventId = "" }: { initialEventId?: string }) {
  const token = useDashboardToken();
  const eventsQuery = useDashboardQuery<{ events: OrganizerEvent[] }>("/api/organizador/eventos");
  const events = eventsQuery.data?.events.filter(event => event.status === "published") ?? [];
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const eventId = String(events.find(event => event.id === selectedEventId)?.id ?? (events.length === 1 ? events[0].id : ""));
  const [phase, setPhase] = useState<Phase>("camera");
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [ready, setReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [flashAvailable, setFlashAvailable] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScanner | null>(null);
  const locked = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; pending.current?.abort(); };
  }, []);

  const validate = useCallback(async (rawCode: string) => {
    if (locked.current || !eventId) return;
    locked.current = true;
    scanner.current?.stop();
    const ticketCode = normalizeTicketCode(rawCode);
    if (!checkInRequestSchema.safeParse({ eventId, ticketCode }).success) {
      setResult({ status: "notFound" }); setPhase("result"); return;
    }
    setPhase("pending");
    const controller = new AbortController();
    pending.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    let next: ScanResultData;
    try {
      const response = await fetch("/api/organizador/check-in", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, ticketCode } satisfies CheckInRequest), signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 409) next = { status: "used" };
        else if (response.status === 404) next = { status: "notFound" };
        else if (response.status === 401) next = { status: "error", message: "Tu sesión terminó. Vuelve al panel e inicia sesión." };
        else if (response.status === 403) next = { status: "error", message: "No tienes permiso para controlar este evento. Revisa la sesión y el evento." };
        else throw new Error("Check-in unavailable");
      } else next = checkInResponseSchema.parse(await response.json());
    } catch {
      next = { status: "error", message: "No pudimos confirmar el ingreso. Revisa la conexión y vuelve a leer la entrada. Si aparece usada, verifica el ingreso en el panel." };
    } finally { clearTimeout(timeout); }
    if (!active.current) return;
    pending.current = null;
    setResult(next); setPhase("result");
    try { navigator.vibrate?.(next.status === "valid" ? 100 : [100, 80, 100]); } catch { /* Optional feedback. */ }
  }, [eventId, token]);

  useEffect(() => {
    if (phase !== "camera" || !eventId || !video.current) return;
    let cancelled = false;
    let instance: QrScanner | null = null;
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
        const { default: Scanner } = await import("qr-scanner");
        if (cancelled || !video.current) return;
        instance = new Scanner(video.current, scan => { void validate(scan.data); }, {
          preferredCamera: "environment", maxScansPerSecond: 8, returnDetailedScanResult: true,
        });
        scanner.current = instance;
        await instance.start();
        if (cancelled) { instance.destroy(); return; }
        setReady(true);
        const hasFlash = await instance.hasFlash().catch(() => false);
        if (!cancelled) setFlashAvailable(hasFlash);
      } catch {
        if (!cancelled) {
          instance?.destroy(); scanner.current = null;
          setCameraMessage("No pudimos abrir la cámara. Permite el acceso en tu navegador y usa una conexión HTTPS, o ingresa el código manualmente.");
          setPhase("cameraError");
        }
      }
    }
    const onVisibility = () => { if (document.hidden) { instance?.stop(); setPhase("paused"); } };
    document.addEventListener("visibilitychange", onVisibility);
    void start();
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisibility); instance?.destroy(); scanner.current = null; };
  }, [eventId, phase, validate]);

  function resume(next: "camera" | "manual" = "camera") {
    locked.current = false; setReady(false); setFlashAvailable(false); setFlashOn(false);
    setManualCode(""); setCameraMessage(""); setResult(null); setPhase(next);
  }
  async function toggleFlash() {
    try { await scanner.current?.toggleFlash(); setFlashOn(scanner.current?.isFlashOn() ?? false); }
    catch { setCameraMessage("La linterna no está disponible. Prueba a mover el teléfono a una zona con más luz."); }
  }
  function submitManual(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void validate(manualCode); }

  if (!eventsQuery.data) return <section role="status" className="space-y-6 py-12">
    <p>{eventsQuery.error ? "No pudimos cargar los eventos." : "Cargando eventos…"}</p>
    {eventsQuery.error && <Button onClick={eventsQuery.refresh} size="scan" className="w-full">Volver a intentar</Button>}
  </section>;
  if (!events.length) return <section className="space-y-6 py-12"><h2 className="text-2xl font-semibold">No hay eventos publicados</h2><p>Publica un evento desde el panel para controlar sus entradas.</p><Link href="/organizador" className="scan-panel-link">Gestionar eventos</Link></section>;

  return <div className="scan-workspace">
    <Field>
      <FieldLabel htmlFor="scan-event">Evento que estás controlando</FieldLabel>
      <NativeSelect id="scan-event" value={eventId} disabled={phase === "pending"} onChange={event => { setSelectedEventId(event.target.value); resume(); }}>
        <option value="" disabled>Selecciona un evento</option>
        {events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}
      </NativeSelect>
    </Field>
    {eventsQuery.error && <p role="alert">No pudimos actualizar los eventos. Mostramos la última información disponible.</p>}
    {eventId ? <>
      <div className="scan-stage">
        <div className={phase === "camera" ? "scan-camera" : "hidden"}>
          <video ref={video} muted playsInline aria-label="Vista de la cámara para leer la entrada" />
          <div className="scan-camera-guide" aria-hidden="true" />
          <p className="scan-camera-instruction" role="status">{ready ? "Apunta al QR de la entrada" : "Abriendo cámara…"}</p>
        </div>
        {phase === "pending" && <div className="scan-placeholder" role="status" aria-busy="true"><h2 className="text-4xl font-semibold tracking-tight">Validando…</h2><p>Espera la confirmación antes de dejar pasar.</p></div>}
        {phase === "result" && result && <ScanResult result={result} />}
        {(phase === "cameraError" || phase === "paused") && <div className="scan-placeholder" role="status"><h2 className="text-2xl font-semibold">{phase === "paused" ? "Cámara pausada" : "Cámara no disponible"}</h2><p>{phase === "paused" ? "Retoma la lectura cuando estés listo." : cameraMessage}</p></div>}
        {phase === "manual" && <form id="manual-check-in" onSubmit={submitManual} className="scan-manual">
          <h2 className="text-2xl font-semibold tracking-tight">Ingresar código</h2>
          <p>Copia el código completo que aparece debajo del QR.</p>
          <Field><FieldLabel htmlFor="ticket-code">Código de la entrada</FieldLabel><Input id="ticket-code" name="ticketCode" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={256} value={manualCode} onChange={event => setManualCode(event.target.value)} aria-describedby="manual-help" /></Field>
          <p id="manual-help" className="text-sm">Validar registra el ingreso de inmediato.</p>
        </form>}
      </div>
      {phase === "camera" && cameraMessage && <p role="status" className="text-sm">{cameraMessage}</p>}
      <div className="scan-controls">
        {phase === "result" ? <><Button size="scan" className="w-full" onClick={() => resume()}>Escanear otra entrada</Button><Button size="scan" variant="secondary" className="w-full" onClick={() => resume("manual")}>Ingresar código</Button></> : phase === "manual" ? <><Button size="scan" className="w-full" type="submit" form="manual-check-in" disabled={!manualCode.trim()}>Validar entrada</Button><Button size="scan" variant="secondary" className="w-full" onClick={() => resume()}>Usar cámara</Button></> : phase === "pending" ? <Button size="scan" className="w-full" disabled>Confirmando ingreso…</Button> : <>
          {phase !== "camera" && <Button size="scan" className="w-full" onClick={() => resume()}>Abrir cámara</Button>}
          <div className="flex gap-4"><Button size="scan" variant="secondary" className="min-w-0 flex-1" onClick={() => resume("manual")}>Ingresar código</Button>{phase === "camera" && flashAvailable && <Button size="scan" variant="secondary" aria-pressed={flashOn} onClick={() => void toggleFlash()}>Linterna {flashOn ? "encendida" : "apagada"}</Button>}</div>
        </>}
        <p className="scan-footer-note">{phase === "camera" ? "Al leer una entrada válida se registra su ingreso." : "Revisa el resultado antes de dejar pasar."}</p>
      </div>
    </> : <p className="py-12 text-base">Selecciona el evento para abrir la cámara.</p>}
  </div>;
}
