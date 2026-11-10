"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { clearOrganizerSession, syncOrganizerSession } from "@/lib/supabase/browser-session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/registration-controls";
import { useRouter } from "next/navigation";

const SessionContext = createContext("");
export function useDashboardToken() { return useContext(SessionContext); }

export function DashboardSession({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState({ token: "", email: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (!browserClient) return;
    let active = true;
    let pending: AbortController | undefined;
    const { data } = browserClient.auth.onAuthStateChange((_event, session) => {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      // Leave Supabase's auth callback before starting asynchronous validation.
      queueMicrotask(() => {
        if (!active || controller.signal.aborted) return;
        if (!session) {
          setIdentity({ token: "", email: "" });
          void clearOrganizerSession().finally(() => {
            if (active && !controller.signal.aborted) { router.replace("/iniciar-sesion"); router.refresh(); }
          }).catch(() => {});
          return;
        }
        void syncOrganizerSession(session.access_token, controller.signal).then(user => {
          if (active && !controller.signal.aborted) {
            setIdentity({ token: session.access_token, email: user.email });
            setError("");
          }
        }).catch(() => {
          if (active && !controller.signal.aborted) {
            setIdentity({ token: "", email: "" });
            setError("No pudimos validar tu sesión. Vuelve a iniciar sesión.");
          }
        });
      });
    });
    return () => { active = false; pending?.abort(); data.subscription.unsubscribe(); };
  }, [router]);

  async function logout() {
    setBusy(true); setError("");
    try {
      await clearOrganizerSession();
      setIdentity({ token: "", email: "" });
      // The server session is already cleared, even if Supabase is unavailable.
      try { await browserClient?.auth.signOut({ scope: "local" }); } finally {
        router.replace("/iniciar-sesion"); router.refresh();
      }
    } catch { setError("No pudimos cerrar la sesión. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }
  if (error && !identity.token) return <div role="alert" className="py-16 text-center"><p>{error}</p><Button onClick={() => router.replace("/iniciar-sesion")} className="mt-6">Iniciar sesión</Button></div>;
  if (!identity.token) return <div role="status" className="space-y-6 py-12"><span className="sr-only">Validando tu sesión…</span><Skeleton className="h-14 w-2/3" /><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(key => <Skeleton key={key} className="h-40" />)}</div><Skeleton className="h-64" /></div>;
  return <SessionContext.Provider value={identity.token}><div className="flex flex-wrap items-center justify-end gap-4 pb-8"><span className="min-w-0 text-xs text-foreground/60 wrap-anywhere">{identity.email}</span><Button onClick={logout} disabled={busy} variant="ghost">{busy ? "Cerrando sesión…" : "Cerrar sesión"}</Button></div>{error && <p role="alert" className="text-sm text-red-800">{error}</p>}<div key={identity.token}>{children}</div></SessionContext.Provider>;
}
