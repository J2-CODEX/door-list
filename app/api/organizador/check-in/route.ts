import { authenticateOrganizer } from "@/lib/supabase/organizer";
import { checkInRequestSchema, checkInResponseSchema } from "@/lib/check-in";

const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  try {
    const auth = await authenticateOrganizer(request);
    if (!auth) return Response.json({ error: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401, headers });
    const input = checkInRequestSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: "Revisa el evento y el código completo de la entrada." }, { status: 400, headers });
    const { data, error } = await auth.client.rpc("check_in_ticket", { p_event_id: input.data.eventId, p_code: input.data.ticketCode });
    if (error) throw new Error("Check-in failed");
    if (data?.status === "forbidden") return Response.json({ error: "No tienes permiso para controlar este evento." }, { status: 403, headers });
    if (data?.status === "used") return Response.json({ error: "Esta entrada ya fue utilizada. No permite otro ingreso." }, { status: 409, headers });
    if (data?.status === "notFound") return Response.json({ error: "No encontramos una entrada habilitada para este evento." }, { status: 404, headers });
    return Response.json(checkInResponseSchema.parse(data), { headers });
  } catch {
    return Response.json({ error: "No pudimos confirmar el ingreso. Comprueba la conexión y vuelve a leer la entrada." }, { status: 503, headers });
  }
}
