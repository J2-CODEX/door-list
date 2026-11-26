import { handleEventCover } from "@/lib/event-cover-handler";
import type { CoverRouteParams } from "@/lib/event-cover-http";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<CoverRouteParams> }) {
  return handleEventCover("state", request, await context.params);
}
export async function PATCH(request: Request, context: { params: Promise<CoverRouteParams> }) {
  return handleEventCover("patch", request, await context.params);
}
export async function DELETE(request: Request, context: { params: Promise<CoverRouteParams> }) {
  return handleEventCover("delete", request, await context.params);
}
