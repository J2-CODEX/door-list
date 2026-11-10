import { z } from "zod";
import { authenticateOrganizer } from "@/lib/supabase/organizer";
import { buildRegistrationSeries } from "@/lib/registration-series";
import type { EventRegistrationCounts } from "@/lib/dashboard";

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!z.uuid().safeParse(eventId).success) return Response.json({ error: "Evento no disponible." }, { status: 404 });
  try {
    const auth = await authenticateOrganizer(request);
    if (!auth) return Response.json({ error: "Inicia sesión para ver los registros." }, { status: 401 });
    // Aggregation runs under RLS and explicitly checks ownership, even for public events.
    // One JSON result avoids PostgREST's row limit and never exposes attendee details.
    const { data, error } = await auth.client.rpc("get_event_registration_counts", { p_event_id: eventId });
    if (error) throw new Error("Registration counts unavailable");
    if (!data) return Response.json({ error: "Evento no disponible o sin permiso de acceso." }, { status: 404 });
    return Response.json(buildRegistrationSeries(data as EventRegistrationCounts), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No pudimos cargar la gráfica de registros. Inténtalo de nuevo." }, { status: 500 });
  }
}
