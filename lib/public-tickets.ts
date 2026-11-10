import "server-only";
import { publicClient } from "./supabase/server";
import { ticketCodeSchema, publicTicketSchema, type PublicTicket } from "./tickets";

export async function getPublicTicket(code: string): Promise<PublicTicket | null> {
  if (!ticketCodeSchema.safeParse(code).success) return null;
  const { data, error } = await publicClient().rpc("get_public_ticket", { p_code: code });
  if (error) throw new Error("No se pudo cargar la entrada");
  if (!data) return null;
  // Never put the code or personal data into an error or log.
  const parsed = publicTicketSchema.safeParse(data);
  if (!parsed.success) throw new Error("No se pudo cargar la entrada");
  return parsed.data;
}
