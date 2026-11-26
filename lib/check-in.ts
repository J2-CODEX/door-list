import { z } from "zod";

export const checkInRequestSchema = z.object({ eventId: z.uuid(), ticketCode: z.string().regex(/^[0-9a-f]{64}$/, "Ingresa el código completo de 64 caracteres que aparece debajo del QR.") });
export type CheckInRequest = z.infer<typeof checkInRequestSchema>;
export const manualCheckInSchema = checkInRequestSchema.pick({ ticketCode: true }).extend({
  ticketCode: z.string().transform(normalizeTicketCode).pipe(checkInRequestSchema.shape.ticketCode),
});
export type ManualCheckInInput = z.infer<typeof manualCheckInSchema>;
export const checkInResponseSchema = z.object({
  status: z.literal("valid"), name: z.string(), ticketType: z.string(), checkedInAt: z.iso.datetime({ offset: true }),
});
export type CheckInResponse = z.infer<typeof checkInResponseSchema>;
export type ScanResult = CheckInResponse | { status: "used" } | { status: "notFound" } | { status: "error"; message: string };

// QR generation uses the complete, opaque code. Never follow scanned URLs.
export function normalizeTicketCode(value: string) { return value.trim(); }
