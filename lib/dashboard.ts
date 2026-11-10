export type OrganizerTicketType = { id: string; name: string; capacity: number; registrationCount: number };
export type OrganizerEvent = {
  id: string; title: string; description: string; startsAt: string; venue: string;
  status: "draft" | "published"; capacity: number; registrationCount: number;
  ticketTypes: OrganizerTicketType[];
};
export type OrganizerRegistration = { id: string; name: string; email: string; ticketTypeId: string; createdAt: string };
export type OrganizerEventDetail = { event: OrganizerEvent; registrations: OrganizerRegistration[]; total: number; page: number };
export const registrationPageSize = 25;
export function occupancy(count: number, capacity: number) {
  return capacity > 0 ? Math.min(100, Math.round(count / capacity * 100)) : 0;
}
