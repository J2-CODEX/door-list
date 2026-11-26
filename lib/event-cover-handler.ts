import 'server-only';
import { createCoverHandler } from './event-cover-http';
import { authenticateOrganizer } from './supabase/organizer';
import { createEventCoverService } from './supabase/storage-admin';
import { readOwnedEventCoverState } from './supabase/event-cover-reader';
export const handleEventCover = createCoverHandler({
  authenticate: async request => {
    const session = await authenticateOrganizer(request);
    return session ? { userId: session.userId, readState: eventId => readOwnedEventCoverState(session.client, eventId, session.userId) } : null;
  },
  service: createEventCoverService,
});
