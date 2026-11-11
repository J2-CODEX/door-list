import { z } from "zod";
import { authenticateOrganizer } from "@/lib/supabase/organizer";
import {
  attendeesFilename, buildAttendeesCsv, soldTicketStatuses,
  type EventTicketSales, type ExportRegistration,
} from "@/lib/export/attendees";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const batchSize = 500;

// Persistence shapes stay at the query boundary; API contracts use camelCase.
type AttendeeRegistrationRow = {
  id: string; name: string; email: string; created_at: string;
  tickets: { code: string; status: string };
  ticket_types: { name: string };
};

function apiError(error: string, status: number) {
  return Response.json({ error }, { status, headers: privateHeaders });
}

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!z.uuid().safeParse(eventId).success) return apiError("Evento no disponible.", 404);
  const format = new URL(request.url).searchParams.get("format");
  if (format !== null && format !== "json" && format !== "csv") return apiError("El formato no es válido.", 400);
  try {
    const auth = await authenticateOrganizer(request);
    if (!auth) return apiError("Inicia sesión para ver los asistentes.", 401);
    // Published events are readable by other users; RLS on attendees is an
    // additional boundary, not a replacement for this explicit ownership check.
    const { data: event, error: eventError } = await auth.client.from("events")
      .select("id,title").eq("id", eventId).eq("owner_id", auth.userId).abortSignal(request.signal).maybeSingle();
    if (eventError) throw new Error("Event unavailable");
    if (!event) return apiError("Evento no disponible o sin permiso de acceso.", 403);

    const registrations = (selection: string, countOnly = false) => auth.client.from("registrations")
      .select(selection, countOnly ? { count: "exact", head: true } : undefined)
      .eq("event_id", eventId).in("tickets.status", soldTicketStatuses).abortSignal(request.signal);

    if (format === "csv") {
      const attendees: ExportRegistration[] = [];
      let after: string | undefined;
      for (;;) {
        let query = registrations("id,name,email,created_at,tickets!inner(code,status),ticket_types!registrations_ticket_type_event_fk(name)")
          .order("id").limit(batchSize);
        if (after) query = query.gt("id", after);
        const { data, error } = await query.overrideTypes<AttendeeRegistrationRow[], { merge: false }>();
        if (error || !data) throw new Error("Attendees unavailable");
        if (!data.length) break;
        attendees.push(...data.map(row => ({
          name: row.name, email: row.email, createdAt: row.created_at,
          ticketCode: row.tickets.code, ticketStatus: row.tickets.status, ticketTypeName: row.ticket_types.name,
        })));
        after = data[data.length - 1].id;
      }
      return new Response(buildAttendeesCsv(attendees), { headers: {
        ...privateHeaders, "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${attendeesFilename(event.title, eventId)}"`,
      } });
    }

    const ticketTypes: EventTicketSales["ticketTypes"] = [];
    let after: string | undefined;
    for (;;) {
      let query = auth.client.from("ticket_types").select("id,name,capacity")
        .eq("event_id", eventId).order("id").limit(batchSize).abortSignal(request.signal);
      if (after) query = query.gt("id", after);
      const { data, error } = await query;
      if (error || !data) throw new Error("Ticket types unavailable");
      if (!data.length) break;
      // Bound parallel HEAD requests while keeping exact counts above max_rows.
      for (let start = 0; start < data.length; start += 8) {
        ticketTypes.push(...await Promise.all(data.slice(start, start + 8).map(async type => {
          const { count, error } = await registrations("id,tickets!inner(status)", true).eq("ticket_type_id", type.id);
          if (error || count === null) throw new Error("Sales unavailable");
          return { id: type.id as string, name: type.name as string, capacity: type.capacity as number | null, soldCount: count };
        })));
      }
      after = data[data.length - 1].id;
    }
    return Response.json({ ticketTypes } satisfies EventTicketSales, { headers: privateHeaders });
  } catch {
    return apiError("No pudimos cargar los asistentes o sus ventas. Inténtalo de nuevo.", 500);
  }
}
