import { handleEventCover } from "@/lib/event-cover-handler";
import type { CoverRouteParams } from "@/lib/event-cover-http";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<CoverRouteParams> }) {
  return handleEventCover("publicImage", request, await context.params);
}
