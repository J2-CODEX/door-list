import { z } from "zod";
import { authenticateOrganizer } from "@/lib/supabase/organizer";
import { loadOrganizerEvents } from "@/lib/organizer-events";
import { registrationPageSize, type OrganizerEventDetail } from "@/lib/dashboard";

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!z.uuid().safeParse(eventId).success) return Response.json({ error: "Evento no disponible." }, { status: 404 });
  try {
    const auth = await authenticateOrganizer(request);
    if (!auth) return Response.json({ error: "Inicia sesión para ver este evento." }, { status: 401 });
    // Published events are publicly readable: explicitly check ownership before reading attendees.
    const [event] = await loadOrganizerEvents(auth.client, auth.userId, eventId);
    if (!event) return Response.json({ error: "Evento no disponible o sin permiso de acceso." }, { status: 404 });
    const searchParams = new URL(request.url).searchParams;
    const requestedPage = Number(searchParams.get("page") ?? 1);
    const ticketTypeId = searchParams.get("ticketTypeId");
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1 || requestedPage > 1000000 || (ticketTypeId && !event.ticketTypes.some(type => type.id === ticketTypeId))) {
      return Response.json({ error: "Los filtros no son válidos." }, { status: 400 });
    }
    const search = (searchParams.get("search") ?? "").trim().slice(0, 200);
    let query = auth.client.from("registrations").select("id,name,email,ticket_type_id,created_at", { count: "exact" }).eq("event_id", eventId);
    if (ticketTypeId) query = query.eq("ticket_type_id", ticketTypeId);
    // Quote PostgREST values and treat wildcard characters as literal input.
    if (search) {
      const pattern = `"%${search.replace(/[\\%_]/g, "\\$&").replace(/"/g, '\\"')}%"`;
      query = query.or(`name.ilike.${pattern},email.ilike.${pattern}`);
    }
    const { data, count, error } = await query.order("created_at", { ascending: false }).order("id").range((requestedPage - 1) * registrationPageSize, requestedPage * registrationPageSize - 1);
    if (error) throw new Error("No se pudieron cargar los registros");
    return Response.json({ event, total: count ?? 0, page: requestedPage, registrations: (data ?? []).map(row => ({ id: row.id, name: row.name, email: row.email, ticketTypeId: row.ticket_type_id, createdAt: row.created_at })) } satisfies OrganizerEventDetail, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No pudimos cargar el evento. Inténtalo de nuevo." }, { status: 500 });
  }
}
