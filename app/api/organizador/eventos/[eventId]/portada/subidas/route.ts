import { handleEventCover } from "@/lib/event-cover-handler";
import type { CoverRouteParams } from "@/lib/event-cover-http";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<CoverRouteParams> }) {
  return handleEventCover("start", request, await context.params);
}
