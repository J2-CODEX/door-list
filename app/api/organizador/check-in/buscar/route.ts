import { authenticateOrganizer } from "@/lib/supabase/organizer";
import { emailTicketSearchRequestSchema, emailTicketSearchResponseSchema } from "@/lib/check-in-email";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const auth = await authenticateOrganizer(request);
    if (!auth) return Response.json({ error: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401, headers });
    const input = emailTicketSearchRequestSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: "Revisa el evento y el email completo del asistente." }, { status: 400, headers });
    // Published events are publicly readable; require ownership before reading attendees.
    const { data: event, error: eventError } = await auth.client.from("events").select("id")
      .eq("id", input.data.eventId).eq("owner_id", auth.userId).eq("status", "published").maybeSingle();
    if (eventError) throw new Error("Event lookup failed");
    if (!event) return Response.json({ error: "No tienes permiso para controlar este evento." }, { status: 403, headers });
    // Registration emails are normalized on creation. Exact equality treats wildcards literally.
    const { data, error } = await auth.client.from("registrations")
      .select("id,name,email,ticket_types(name),tickets(code,status,checked_in_at)")
      .eq("event_id", input.data.eventId).eq("email", input.data.email).maybeSingle();
    if (error) throw new Error("Attendee lookup failed");
    if (!data) return Response.json({ error: "No encontramos un registro con ese email en este evento." }, { status: 404, headers });
    const ticket = Array.isArray(data.tickets) ? data.tickets[0] : data.tickets;
    const ticketType = Array.isArray(data.ticket_types) ? data.ticket_types[0] : data.ticket_types;
    const response = emailTicketSearchResponseSchema.parse({ registration: {
      id: data.id, name: data.name, email: data.email, ticketType: ticketType?.name ?? "Tipo de entrada no disponible",
      ticketStatus: ticket?.status ?? null, ticketCode: ticket?.status === "valid" ? ticket.code : null,
      checkedInAt: ticket?.checked_in_at ?? null,
    } });
    return Response.json(response, { headers });
  } catch {
    return Response.json({ error: "No pudimos buscar al asistente. Revisa la conexión e inténtalo de nuevo." }, { status: 503, headers });
  }
}
