import type { PublicTicketType } from "./events";
import { z } from "zod";
export const registrationSchema = z.object({
  eventId: z.uuid("Evento inválido"),
  ticketTypeId: z.uuid("Elige un tipo de entrada"),
  name: z.string().trim().min(1, "Ingresa tu nombre").max(200, "Usa hasta 200 caracteres"),
  email: z.string().trim().toLowerCase().pipe(z.email("Ingresa un email válido").max(254)),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type PublicEvent = { id: string; title: string; description: string; venue: string; starts_at: string; ticketTypes: PublicTicketType[] };
export type RegistrationResult = { code: "SUCCESS"; ticketCode: string; emailStatus: "sent" | "failed" } | { code: "INVALID_INPUT" | "EVENT_CLOSED" | "DUPLICATE" | "TICKET_UNAVAILABLE" | "ERROR" };
