import type { OrganizerEvent, OrganizerRegistration } from "@/lib/dashboard";

export const exampleEvent: OrganizerEvent = {
  id: "example-event",
  title: "Encuentro de comunidades creativas",
  description: "Una tarde para compartir ideas y conocer personas.",
  startsAt: "2026-12-12T15:00:00-05:00",
  venue: "Casa de encuentro, Quito",
  status: "published",
  capacity: 100,
  registrationCount: 2,
  ticketTypes: [
    { id: "example-general", name: "General", capacity: 100, registrationCount: 2 },
  ],
};

export const exampleRegistrations: OrganizerRegistration[] = [
  {
    id: "example-registration-1",
    name: "Ana Torres",
    email: "ana@example.com",
    ticketTypeId: "example-general",
    createdAt: "2026-11-10T09:00:00-05:00",
  },
  {
    id: "example-registration-2",
    name: "María Fernanda de los Ángeles Villavicencio",
    email: "maria.fernanda.villavicencio.comunidades@example.com",
    ticketTypeId: "example-general",
    createdAt: "2026-11-10T09:15:00-05:00",
  },
];
