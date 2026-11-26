import { handleEventCover } from "@/lib/event-cover-handler";
import type { CoverRouteParams } from "@/lib/event-cover-http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request, context: { params: Promise<CoverRouteParams> }) {
  return handleEventCover("confirm", request, await context.params);
}
