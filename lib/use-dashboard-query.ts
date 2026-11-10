"use client";
import { useEffect, useState } from "react";
import { useDashboardToken } from "@/components/dashboard-session";
import { browserClient } from "@/lib/supabase/browser";

export function useDashboardQuery<T>(url: string) {
  const token = useDashboardToken();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ url: string; token: string; revision: number; data: T | null; error: string } | null>(null);
  const loading = result?.url !== url || result?.token !== token || result?.revision !== revision;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      let message = "No pudimos cargar la información. Inténtalo de nuevo.";
      try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          if (response.status === 401) { await browserClient?.auth.signOut({ scope: "local" }); message = "Tu sesión terminó. Vuelve a iniciar sesión."; }
          else if (response.status === 404) message = "Evento no disponible o sin permiso de acceso.";
          throw new Error("Request failed");
        }
        const result: T = await response.json();
        if (!controller.signal.aborted) setResult({ url, token, revision, data: result, error: "" });
      } catch {
        if (!controller.signal.aborted) setResult({ url, token, revision, data: null, error: message });
      }
    }
    void load();
    return () => controller.abort();
  }, [url, token, revision]);
  return { data: result?.token === token ? result.data : null, error: loading ? "" : result?.error ?? "", loading, refresh: () => setRevision(value => value + 1) };
}
