import type { ComponentProps } from 'react';
import { EventCover } from './event-cover';

export function OrganizerEventCover({ eventId, token, cover, ...props }: Omit<ComponentProps<typeof EventCover>, 'accessToken'> & { eventId: string | null; token: string | null }) {
  return <EventCover {...props} cover={cover && eventId && token ? { ...cover, imageUrl: `/api/organizador/eventos/${eventId}/portada/imagen/${cover.imageId}` } : cover} accessToken={token ?? undefined} />;
}
