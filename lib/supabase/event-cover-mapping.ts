import type { EventCoverState } from '../event-covers';
export type CoverRow = { revision: string; image_id: string | null; object_path?: string | null; alt_text: string | null; width: number | null; height: number | null; content_type: 'image/webp' | null };
export const COVER_METADATA_COLUMNS = 'revision,image_id,alt_text,width,height,content_type';
export function projectCoverRow(eventId: string, published: boolean, row?: CoverRow | null): EventCoverState {
  return { coverRevision: row?.revision ?? null, cover: row?.image_id ? { imageId: row.image_id, altText: row.alt_text,
    width: row.width!, height: row.height!, contentType: 'image/webp', imageUrl: published ? `/api/eventos/${eventId}/portada/${row.image_id}` : null } : null };
}
