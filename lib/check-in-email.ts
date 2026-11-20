import { z } from "zod";
import { ticketCodeSchema } from "./tickets";

export const emailTicketSearchRequestSchema = z.object({
  eventId: z.uuid(),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});
export type EmailTicketSearchRequest = z.infer<typeof emailTicketSearchRequestSchema>;

export const emailTicketSearchResponseSchema = z.object({
  registration: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
    ticketType: z.string(),
    ticketStatus: z.enum(["valid", "used", "revoked"]).nullable(),
    ticketCode: ticketCodeSchema.nullable(),
    checkedInAt: z.iso.datetime({ offset: true }).nullable(),
  }),
});
export type EmailTicketSearchResponse = z.infer<typeof emailTicketSearchResponseSchema>;
