import { z } from "zod";

export const ticketCodeSchema = z.string().regex(/^[0-9a-f]{64}$/);
export const publicTicketSchema = z.object({
  code: ticketCodeSchema,
  status: z.enum(["valid", "used", "revoked"]),
  name: z.string(),
  email: z.string(),
  event: z.object({ title: z.string(), starts_at: z.iso.datetime({ offset: true }), venue: z.string() }),
  ticketType: z.string(),
});
export type PublicTicket = z.infer<typeof publicTicketSchema>;
export const ticketStatuses = {
  valid: { label: "Válida", description: "Tu entrada está lista para presentarla al llegar al evento.", className: "bg-[#e9eedf] text-[#315444]" },
  used: { label: "Utilizada", description: "Esta entrada ya fue utilizada y no permite un nuevo ingreso.", className: "bg-amber-50 text-amber-900" },
  revoked: { label: "Revocada", description: "Esta entrada fue revocada y no es válida para ingresar.", className: "bg-red-50 text-red-900" },
} as const;
