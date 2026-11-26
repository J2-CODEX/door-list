import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizerEvent } from "./dashboard";
import { COVER_METADATA_COLUMNS, projectCoverRow } from './supabase/event-cover-mapping';

// Counts are evaluated by PostgREST under the authenticated owner's RLS policies.
const eventSelection = `id,title,description,starts_at,venue,status,capacity,event_covers(${COVER_METADATA_COLUMNS}),registrations(count),ticket_types(id,name,capacity,registrations(count))`;
export async function loadOrganizerEvents(client: SupabaseClient, ownerId: string, eventId?: string): Promise<OrganizerEvent[]> {
  let query = client.from("events").select(eventSelection).eq("owner_id", ownerId).order("starts_at", { ascending: false });
  if (eventId) query = query.eq("id", eventId);
  const { data, error } = await query;
  if (error) throw new Error("No pudimos cargar tus eventos.");
  return (data ?? []).map(event => ({
    id: event.id, title: event.title, description: event.description, startsAt: event.starts_at,
    venue: event.venue, status: event.status, capacity: event.capacity,
    ...projectCoverRow(event.id, event.status === 'published', Array.isArray(event.event_covers) ? event.event_covers[0] : event.event_covers),
    registrationCount: event.registrations[0]?.count ?? 0,
    ticketTypes: event.ticket_types.map(type => ({ id: type.id, name: type.name, capacity: type.capacity, registrationCount: type.registrations[0]?.count ?? 0 })),
  }));
}
