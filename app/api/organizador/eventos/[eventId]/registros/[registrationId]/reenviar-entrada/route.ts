import { z } from "zod";
import { authenticateOrganizer } from "@/lib/supabase/organizer";
import { getTicketEmailConfig, sendTicketEmail } from "@/lib/email/ticket-email";
import { publicTicketSchema } from "@/lib/tickets";
import { ticketResendInputSchema, type TicketResendResponse } from "@/lib/ticket-resend";

type RegistrationRow = {
  name: string;
  email: string;
  tickets: { code: string; status: string } | { code: string; status: string }[] | null;
  ticket_types: { name: string } | { name: string }[] | null;
};

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string; registrationId: string }> }) {
  const { eventId, registrationId } = await params;
  if (!z.uuid().safeParse(eventId).success || !z.uuid().safeParse(registrationId).success) {
    return Response.json({ error: "Entrada no disponible." }, { status: 404 });
  }
  try {
    const auth = await authenticateOrganizer(request);
    if (!auth) return Response.json({ error: "Inicia sesión para reenviar la entrada." }, { status: 401 });
    const input = ticketResendInputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: "La solicitud de reenvío no es válida." }, { status: 400 });

    // Published events are public; ownership must be checked before loading a recipient.
    const { data: event, error: eventError } = await auth.client.from("events")
      .select("title,starts_at,venue").eq("id", eventId).eq("owner_id", auth.userId).maybeSingle();
    if (eventError) throw new Error("Event lookup failed");
    if (!event) return Response.json({ error: "Evento no disponible o sin permiso de acceso." }, { status: 404 });
    const { data: registration, error: registrationError } = await auth.client.from("registrations")
      .select("name,email,tickets(code,status),ticket_types!registrations_ticket_type_event_fk(name)")
      .eq("id", registrationId).eq("event_id", eventId).maybeSingle()
      .overrideTypes<RegistrationRow, { merge: false }>();
    if (registrationError) throw new Error("Registration lookup failed");
    const ticket = Array.isArray(registration?.tickets) ? registration.tickets[0] : registration?.tickets;
    if (!registration || !ticket) return Response.json({ error: "Entrada no disponible." }, { status: 404 });
    if (ticket.status !== "valid") return Response.json({ error: "Solo puedes reenviar entradas válidas que aún no se han utilizado." }, { status: 409 });
    const ticketType = Array.isArray(registration.ticket_types) ? registration.ticket_types[0] : registration.ticket_types;
    const parsed = publicTicketSchema.safeParse({ ...ticket, name: registration.name, email: registration.email, event, ticketType: ticketType?.name });
    if (!parsed.success) throw new Error("Ticket data invalid");
    try {
      await sendTicketEmail(parsed.data, getTicketEmailConfig(process.env), fetch, { deliveryId: input.data.requestId });
    } catch {
      return Response.json({ error: "No pudimos reenviar la entrada. Inténtalo de nuevo." }, { status: 502 });
    }
    return Response.json({ emailStatus: "sent" } satisfies TicketResendResponse, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No pudimos reenviar la entrada. Inténtalo de nuevo." }, { status: 500 });
  }
}
