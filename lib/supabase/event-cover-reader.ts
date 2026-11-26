import type { SupabaseClient } from '@supabase/supabase-js';
import { EventCoverError } from '../event-covers.ts';
import { COVER_METADATA_COLUMNS, projectCoverRow, type CoverRow } from './event-cover-mapping.ts';

// Reading metadata needs only the verified owner's session and column grants.
// Storage credentials are reserved for serving bytes and changing covers.
export async function readOwnedEventCoverState(client: SupabaseClient, eventId: string, ownerId: string) {
  const { data, error } = await client.from('events')
    .select(`status,event_covers(${COVER_METADATA_COLUMNS})`)
    .eq('id', eventId).eq('owner_id', ownerId).maybeSingle();
  if (error) throw new EventCoverError(503, 'No pudimos consultar la portada. Vuelve a intentarlo.');
  if (!data) throw new EventCoverError(404, 'Portada no disponible.');
  const row = (Array.isArray(data.event_covers) ? data.event_covers[0] : data.event_covers) as CoverRow | null;
  return projectCoverRow(eventId, data.status === 'published', row);
}
