import { authenticateOrganizer } from "@/lib/supabase/organizer";
import { loadOrganizerEvents } from "@/lib/organizer-events";

export async function GET(request: Request) {
  try {
    const auth = await authenticateOrganizer(request);
    if (!auth) return Response.json({ error: "Inicia sesión para ver tus eventos." }, { status: 401 });
    return Response.json({ events: await loadOrganizerEvents(auth.client, auth.userId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No pudimos cargar tus eventos. Inténtalo de nuevo." }, { status: 500 });
  }
}
