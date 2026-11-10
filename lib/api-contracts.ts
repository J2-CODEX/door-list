import type { PublicEvent } from "./registration";
export type ApiError = { error: string };
export type RegistrationResponse = { ticketCode: string; emailStatus: "sent" | "failed" };
export type PublicEventResponse = Omit<PublicEvent, "starts_at"> & { startsAt: string };
// Only this module translates JSON field casing; database columns remain unchanged.
export function serializePublicEvent(event: PublicEvent): PublicEventResponse {
  const { starts_at: startsAt, ...rest } = event;
  return { ...rest, startsAt };
}
export function deserializePublicEvent(event: PublicEventResponse): PublicEvent {
  const { startsAt, ...rest } = event;
  return { ...rest, starts_at: startsAt };
}
