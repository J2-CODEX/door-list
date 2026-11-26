import { EventCoverError, MAX_COVER_BYTES, MAX_CANONICAL_BYTES } from './event-covers.ts';
import type { ConfirmCoverRequest, ConfirmCoverResponse, EventCoverState, EventCoverUpload, EventCoverUploadStatus, StartCoverUploadRequest, StartCoverUploadResponse } from './event-covers.ts';
import type { ProcessedCover } from './event-cover-validation.ts';
export type CoverEventRecord = { ownerId: string; published: boolean; state: EventCoverState; objectPath: string | null };
export type CoverUploadRecord = { id: string; eventId: string; ownerId: string; status: EventCoverUploadStatus; expiresAt: string; stagingPath: string; declaredByteLength: number; claimToken: string | null; candidatePath: string | null; committedRevision: string | null };
export type CoverMutation = 'start' | 'claim' | 'commit' | 'finish' | 'alt' | 'delete';
export type CoverMutationArgs = { eventId: string; ownerId: string; expectedRevision?: string | null; uploadId?: string; contentType?: string; byteLength?: number; claimToken?: string; width?: number; height?: number; altText?: string; replaceAltText?: boolean; status?: string };
export type CoverMutationResult = { code: string; upload?: CoverUploadRecord; state?: EventCoverState; committedRevision?: string };
export type CoverDependencies = {
  event: (id: string) => Promise<CoverEventRecord | null>;
  operation: (eventId: string, ownerId: string, id: string) => Promise<CoverUploadRecord | null>;
  mutate: (action: CoverMutation, args: CoverMutationArgs) => Promise<CoverMutationResult>;
  sign: (path: string) => Promise<string>;
  download: (bucket: string, path: string, limit: number) => Promise<Uint8Array>;
  upload: (path: string, bytes: Uint8Array) => Promise<void>;
  remove: (bucket: string, path: string) => Promise<void>;
  process: (bytes: Uint8Array) => Promise<ProcessedCover>;
  now: () => number;
};
const unavailable = () => new EventCoverError(503, 'No pudimos consultar la portada. Vuelve a intentarlo.');
function check(result: CoverMutationResult) {
  if (['SUCCESS','COMMITTED'].includes(result.code)) return result;
  const errors: Record<string, [number, string]> = {
    NOT_FOUND: [404, 'Portada no disponible.'], CONFLICT: [409, 'La portada cambió. Actualiza su estado antes de guardar.'],
    BUSY: [409, 'Estamos guardando esta portada.'], EXPIRED: [410, 'La subida caducó. Selecciona la imagen de nuevo.'],
    REJECTED: [422, 'La imagen no es válida. Selecciona otra imagen.'], INVALID_INPUT: [400, 'Revisa los datos de la portada.'],
  };
  const [status, message] = errors[result.code] ?? [503, 'No pudimos guardar la portada. Vuelve a intentarlo.'];
  throw new EventCoverError(status, message);
}
export class EventCoverService {
  private deps: CoverDependencies;
  constructor(deps: CoverDependencies) { this.deps = deps; }
  private async owned(eventId: string, ownerId: string) {
    const event = await this.deps.event(eventId);
    if (!event || event.ownerId !== ownerId) throw new EventCoverError(404, 'Portada no disponible.');
    return event;
  }
  async state(eventId: string, ownerId: string) { return (await this.owned(eventId, ownerId)).state; }
  async start(eventId: string, ownerId: string, request: StartCoverUploadRequest): Promise<StartCoverUploadResponse> {
    await this.owned(eventId, ownerId);
    const result = check(await this.deps.mutate('start', { eventId, ownerId, ...request }));
    const upload = result.upload;
    if (!upload) throw unavailable();
    const token = await this.deps.sign(upload.stagingPath);
    return { uploadId: upload.id, uploadToken: token, uploadPath: upload.stagingPath, uploadBucket: 'event-cover-staging',
      uploadExpiresAt: new Date(this.deps.now() + 2*60*60*1000).toISOString(), expiresAt: upload.expiresAt };
  }
  async operation(eventId: string, ownerId: string, uploadId: string): Promise<EventCoverUpload> {
    const event = await this.owned(eventId, ownerId);
    const upload = await this.deps.operation(eventId, ownerId, uploadId);
    if (!upload) throw new EventCoverError(404, 'Portada no disponible.');
    // Expiration is surfaced without turning a successful operation GET into an error.
    const status = ['pending','processing'].includes(upload.status) && Date.parse(upload.expiresAt) <= this.deps.now() ? 'expired' : upload.status;
    return { uploadId, status, committedRevision: upload.committedRevision, state: event.state };
  }
  async confirm(eventId: string, ownerId: string, uploadId: string, request: ConfirmCoverRequest): Promise<ConfirmCoverResponse> {
    await this.owned(eventId, ownerId);
    const result = check(await this.deps.mutate('claim', { eventId, ownerId, uploadId }));
    if (result.code === 'COMMITTED') {
      if (!result.committedRevision || !result.state) throw unavailable();
      return { uploadId, committedRevision: result.committedRevision, state: result.state };
    }
    const upload = result.upload;
    if (!upload?.claimToken || !upload.candidatePath) throw unavailable();
    const claimToken = upload.claimToken;
    let processed: ProcessedCover;
    try {
      const bytes = await this.deps.download('event-cover-staging', upload.stagingPath, MAX_COVER_BYTES);
      if (bytes.byteLength !== upload.declaredByteLength) throw new EventCoverError(422, 'La imagen recibida está incompleta o no coincide con la subida.');
      processed = await this.deps.process(bytes);
      await this.deps.upload(upload.candidatePath, processed.bytes);
    } catch (error) {
      const rejected = error instanceof EventCoverError && error.status >= 400 && error.status < 500;
      await this.deps.mutate('finish', { eventId, ownerId, uploadId, claimToken, status: rejected ? 'rejected' : 'pending' }).catch(() => {});
      if (error instanceof EventCoverError) throw error;
      throw new EventCoverError(503, 'No pudimos guardar la portada. Conservamos la anterior; vuelve a intentarlo.');
    }
    let committed;
    try {
      committed = check(await this.deps.mutate('commit', { eventId, ownerId, uploadId, claimToken,
        width: processed.width, height: processed.height, altText: request.altText, replaceAltText: Object.hasOwn(request, 'altText') }));
    } catch (error) {
      if (error instanceof EventCoverError && error.status < 500) throw error;
      // A missing response can follow a successful commit. Never release its claim
      // or delete its candidate until the durable operation has been reconciled.
      throw new EventCoverError(503, 'No pudimos confirmar el resultado. Consulta el estado de la portada.');
    }
    if (!committed.state || !committed.committedRevision) throw unavailable();
    // Best-effort removal only after commit. Old canonical objects are swept later,
    // after the three-hour safety window and another reference check.
    await this.deps.remove('event-cover-staging', upload.stagingPath).catch(() => {});
    return { uploadId, committedRevision: committed.committedRevision, state: committed.state };
  }
  async updateAlt(eventId: string, ownerId: string, expectedRevision: string | null, altText: string) {
    await this.owned(eventId, ownerId);
    const result = check(await this.deps.mutate('alt', { eventId, ownerId, expectedRevision, altText }));
    if (!result.state) throw unavailable(); return result.state;
  }
  async delete(eventId: string, ownerId: string, expectedRevision: string | null) {
    await this.owned(eventId, ownerId);
    const result = check(await this.deps.mutate('delete', { eventId, ownerId, expectedRevision }));
    if (!result.state) throw unavailable(); return result.state;
  }
  async image(eventId: string, imageId: string, ownerId?: string) {
    const event = ownerId ? await this.owned(eventId, ownerId) : await this.deps.event(eventId);
    if (!event || (!ownerId && !event.published) || event.state.cover?.imageId !== imageId || !event.objectPath) {
      throw new EventCoverError(404, 'Portada no disponible.');
    }
    try { return await this.deps.download('event-covers', event.objectPath, MAX_CANONICAL_BYTES); }
    catch { throw new EventCoverError(503, 'No pudimos cargar la imagen de portada.'); }
  }
}
