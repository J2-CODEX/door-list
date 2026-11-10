import { z } from "zod";
import { getPublicEvent } from "@/lib/public-events";
import { serializePublicEvent, type ApiError } from "@/lib/api-contracts";
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!z.uuid().safeParse(eventId).success) return Response.json({ error: "INVALID_INPUT" } satisfies ApiError, { status: 400 });
  try {
    const event = await getPublicEvent(eventId);
    if (!event) return Response.json({ error: "EVENT_CLOSED" } satisfies ApiError, { status: 410 });
    return Response.json(serializePublicEvent(event), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "ERROR" } satisfies ApiError, { status: 500 }); }
}
