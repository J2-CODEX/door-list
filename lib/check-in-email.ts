import { z } from "zod";
import { ticketCodeSchema } from "./tickets";

export const emailTicketSearchRequestSchema = z.object({
  eventId: z.uuid(),
  email: z.string().trim().toLowerCase().min(1, "Ingresa el email del asistente.").pipe(z.email("Ingresa el email completo del asistente.").max(254, "El email debe tener hasta 254 caracteres.")),
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
