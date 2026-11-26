import { z } from 'zod';
import { COVER_CONTENT_TYPES, EventCoverError, MAX_COVER_BYTES } from './event-covers.ts';
import type { ApiError } from './api-contracts';
import type { EventCoverService } from './event-cover-service.ts';
import type { EventCoverState } from './event-covers.ts';
export type CoverAction = 'state' | 'start' | 'operation' | 'confirm' | 'patch' | 'delete' | 'image' | 'publicImage';
export type CoverRouteParams = { eventId: string; uploadId?: string; imageId?: string };
const revision = z.uuid().nullable();
const schemas = {
  start: z.object({ expectedRevision: revision, contentType: z.enum(COVER_CONTENT_TYPES), byteLength: z.number().int().min(1).max(MAX_COVER_BYTES) }).strict(),
  confirm: z.object({ altText: z.string().optional() }).strict(),
  patch: z.object({ expectedRevision: revision, altText: z.string() }).strict(),
  delete: z.object({ expectedRevision: revision }).strict(),
};
export async function readCoverBytes(response: Response, limit: number): Promise<Uint8Array> {
  const declared = response.headers.get('Content-Length');
  if (declared && Number(declared) > limit) { await response.body?.cancel(); throw new EventCoverError(413, 'La solicitud es demasiado grande.'); }
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.byteLength;
      if (length > limit) { await reader.cancel(); throw new EventCoverError(413, 'La solicitud es demasiado grande.'); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
async function jsonBody(request: Request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new EventCoverError(400, 'Revisa los datos de la portada.');
  const bytes = await readCoverBytes(new Response(request.body, { headers: request.headers }), 65536);
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new EventCoverError(400, 'Revisa los datos de la portada.'); }
}
export function createCoverHandler(deps: { authenticate: (request: Request) => Promise<{ userId: string; readState: (eventId: string) => Promise<EventCoverState> } | null>; service: () => EventCoverService }) {
  return async (action: CoverAction, request: Request, params: CoverRouteParams): Promise<Response> => {
    const headers = { 'Cache-Control': action === 'publicImage' ? 'no-store' : 'private, no-store' };
    try {
      if (!z.uuid().safeParse(params.eventId).success
        || (['image','publicImage'].includes(action) && !z.uuid().safeParse(params.imageId).success)
        || (['confirm','operation'].includes(action) && !z.uuid().safeParse(params.uploadId).success)) throw new EventCoverError(404, 'Portada no disponible.');
      const session = action === 'publicImage' ? null : await deps.authenticate(request);
      const ownerId = session?.userId;
      if (action !== 'publicImage' && !ownerId) throw new EventCoverError(401, 'Inicia sesión para guardar la portada.');
      if (action === 'state') return Response.json(await session!.readState(params.eventId), { headers });
      const service = deps.service();
      const eventId = params.eventId;
      if (action === 'image' || action === 'publicImage') {
        const bytes = await service.image(eventId, params.imageId!, ownerId ?? undefined);
        return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff' } });
      }
      if (action === 'operation') return Response.json(await service.operation(eventId, ownerId!, params.uploadId!), { headers });
      const body = await jsonBody(request);
      if (action === 'start') {
        if (typeof body?.byteLength === 'number' && body.byteLength > MAX_COVER_BYTES) throw new EventCoverError(413, 'La imagen puede pesar como máximo 5 MiB.');
        if (body?.contentType && !COVER_CONTENT_TYPES.includes(body.contentType)) throw new EventCoverError(415, 'Usa una imagen JPEG, PNG o WebP estática.');
        return Response.json(await service.start(eventId, ownerId!, schemas.start.parse(body)), { status: 201, headers });
      }
      if (action === 'confirm') return Response.json(await service.confirm(eventId, ownerId!, params.uploadId!, schemas.confirm.parse(body)), { headers });
      if (action === 'patch') { const data = schemas.patch.parse(body); return Response.json(await service.updateAlt(eventId, ownerId!, data.expectedRevision, data.altText), { headers }); }
      const data = schemas.delete.parse(body); return Response.json(await service.delete(eventId, ownerId!, data.expectedRevision), { headers });
    } catch (error) {
      const status = error instanceof EventCoverError ? error.status : error instanceof z.ZodError ? 400 : 503;
      const body: ApiError = { error: error instanceof EventCoverError ? error.message : status === 400 ? 'Revisa los datos de la portada.' : 'No pudimos consultar la portada. Vuelve a intentarlo.' };
      return Response.json(body, { status, headers });
    }
  };
}
