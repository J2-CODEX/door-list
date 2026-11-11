"use client";

import { useEffect, useRef, useState } from "react";
import { useDashboardToken } from "@/components/dashboard-session";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

export function DownloadAttendeesButton({ eventId }: { eventId: string }) {
  const token = useDashboardToken();
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  useEffect(() => () => pending.current?.abort(), []);

  async function download() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError(""); setStarted(false);
    let message = "No pudimos descargar el CSV. Inténtalo de nuevo.";
    try {
      const response = await fetch(`/dashboard/eventos/${encodeURIComponent(eventId)}/asistentes?format=csv`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 401) message = "Tu sesión terminó. Vuelve a iniciar sesión.";
        if (response.status === 403) message = "No tienes permiso para descargar los asistentes de este evento.";
        throw new Error("Download unavailable");
      }
      const filename = response.headers.get("Content-Disposition")?.match(/filename="(asistentes-[a-z0-9-]+\.csv)"/)?.[1];
      if (!filename) throw new Error("Missing download filename");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      try {
        link.href = url; link.download = filename;
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        // Let the browser consume the URL before releasing it (including Safari).
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setStarted(true);
    } catch {
      if (!controller.signal.aborted) setError(message);
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <div className="space-y-2">
    <Button type="button" onClick={download} disabled={busy} aria-busy={busy}>{busy ? "Descargando…" : "Descargar CSV"}</Button>
    {error && <Notice tone="error" role="alert">{error}</Notice>}
    <p role="status" className="sr-only">{busy ? "Preparando la lista completa de asistentes…" : started ? "Descarga iniciada." : ""}</p>
  </div>;
}
