import { z } from "zod";

export const ticketResendInputSchema = z.object({ requestId: z.uuid() }).strict();
export type TicketResendInput = z.infer<typeof ticketResendInputSchema>;
export const ticketResendResponseSchema = z.object({ emailStatus: z.literal("sent") });
export type TicketResendResponse = z.infer<typeof ticketResendResponseSchema>;
