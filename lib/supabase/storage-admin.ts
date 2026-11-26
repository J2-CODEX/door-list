import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { EventCoverService } from '../event-cover-service';
import type { CoverDependencies, CoverUploadRecord, CoverMutation, CoverMutationArgs } from '../event-cover-service';
import type { EventCoverUploadStatus } from '../event-covers';
import { EventCoverError } from '../event-covers';
import { processCoverImage } from '../event-cover-validation';
import { readCoverBytes } from '../event-cover-http';
import { projectCoverRow, COVER_METADATA_COLUMNS, type CoverRow } from './event-cover-mapping';

type UploadRow = { id: string; event_id: string; owner_id: string; status: EventCoverUploadStatus; expires_at: string; staging_path: string; declared_byte_length: number; claim_token: string | null; candidate_path: string | null; committed_revision: string | null };
function projectUpload(row: UploadRow): CoverUploadRecord {
  return { id: row.id, eventId: row.event_id, ownerId: row.owner_id, status: row.status, expiresAt: row.expires_at,
    stagingPath: row.staging_path, declaredByteLength: row.declared_byte_length, claimToken: row.claim_token,
    candidatePath: row.candidate_path, committedRevision: row.committed_revision };
}
const rpcNames: Record<CoverMutation, string> = { start: 'start_event_cover_upload', claim: 'claim_event_cover_upload', commit: 'commit_event_cover_upload', finish: 'finish_event_cover_upload', alt: 'update_event_cover_alt_text', delete: 'delete_event_cover' };
function rpcArgs(action: CoverMutation, args: CoverMutationArgs) {
  const result: Record<string, unknown> = { p_event_id: args.eventId, p_owner_id: args.ownerId };
  if (['start','alt','delete'].includes(action)) result.p_expected_revision = args.expectedRevision;
  if (['claim','commit','finish'].includes(action)) result.p_upload_id = args.uploadId;
  if (action === 'start') { result.p_declared_content_type = args.contentType; result.p_declared_byte_length = args.byteLength; }
  if (['commit','finish'].includes(action)) result.p_claim_token = args.claimToken;
  if (action === 'commit') { result.p_width = args.width; result.p_height = args.height; result.p_alt_text = args.altText ?? null; result.p_replace_alt_text = args.replaceAltText; }
  if (action === 'alt') result.p_alt_text = args.altText;
  if (action === 'finish') result.p_status = args.status;
  return result;
}
function storageAdminConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !URL.canParse(url)) throw new EventCoverError(503, 'El servicio de imágenes no está configurado. Contacta al administrador.');
  return { url, key };
}
export function createStorageAdminClient({ url, key } = storageAdminConfiguration()) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } });
}
export function createEventCoverDependencies(): CoverDependencies {
  const { url, key } = storageAdminConfiguration();
  const client = createStorageAdminClient({ url, key });
  return {
    now: () => Date.now(), process: processCoverImage,
    async event(id) {
      const { data, error } = await client.from('events').select(`owner_id,status,event_covers(${COVER_METADATA_COLUMNS},object_path)`).eq('id', id).maybeSingle();
      if (error) throw new Error('Portada no disponible'); if (!data) return null;
      const row = (Array.isArray(data.event_covers) ? data.event_covers[0] : data.event_covers) as CoverRow | null;
      return { ownerId: data.owner_id, published: data.status === 'published', state: projectCoverRow(id, data.status === 'published', row), objectPath: row?.object_path ?? null };
    },
    async operation(eventId, ownerId, id) {
      const { data, error } = await client.from('event_cover_uploads').select('id,event_id,owner_id,status,expires_at,staging_path,declared_byte_length,claim_token,candidate_path,committed_revision').eq('id', id).eq('event_id', eventId).eq('owner_id', ownerId).maybeSingle();
      if (error) throw new Error('Operación no disponible'); return data ? projectUpload(data) : null;
    },
    async mutate(action, args) {
      const { data, error } = await client.rpc(rpcNames[action], rpcArgs(action, args));
      if (error || !data) throw new Error('Operación no disponible');
      return { ...data, upload: data.upload ? projectUpload(data.upload) : undefined };
    },
    async sign(path) {
      const { data, error } = await client.storage.from('event-cover-staging').createSignedUploadUrl(path, { upsert: false });
      if (error || !data) throw new Error('Subida no disponible'); return data.token;
    },
    async download(bucket, path, limit) {
      // Secret keys are API keys, not JWTs. Only legacy keys use Bearer auth.
      const headers: Record<string, string> = { apikey: key };
      if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
      const response = await fetch(`${url}/storage/v1/object/authenticated/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`, {
        headers, cache: 'no-store', signal: AbortSignal.timeout(30_000), redirect: 'error',
      });
      if (!response.ok) throw new Error('Imagen no disponible');
      return readCoverBytes(response, limit);
    },
    async upload(path, bytes) {
      const { error } = await client.storage.from('event-covers').upload(path, bytes, { contentType: 'image/webp', upsert: false });
      if (error) throw new EventCoverError(503, 'No pudimos guardar la portada. Conservamos la anterior; vuelve a intentarlo.');
    },
    async remove(bucket, path) { const { error } = await client.storage.from(bucket).remove([path]); if (error) throw new Error('Limpieza pendiente'); },
  };
}
export function createEventCoverService() { return new EventCoverService(createEventCoverDependencies()); }
