import { EventDetail } from "./event-detail";
export default async function OrganizerEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <EventDetail key={eventId} eventId={eventId} />;
}
