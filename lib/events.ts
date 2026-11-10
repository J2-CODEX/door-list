export type TicketType = { id: string; event_id: string; name: string; capacity: number };
export type Event = { id: string; title: string; description: string; starts_at: string; venue: string; status: "draft" | "published"; capacity: number; ticket_types: TicketType[] };
export type ListedEvent = Pick<Event, "id" | "title" | "description" | "starts_at" | "venue">;
export type PublicTicketType = Pick<TicketType, "id" | "name"> & { available: number };
