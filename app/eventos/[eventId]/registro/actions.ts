"use server";
import { publicClient } from "@/lib/supabase/server";
import { ticketCodeSchema } from "@/lib/tickets";
import { registrationSchema, type RegistrationResult } from "@/lib/registration";
import { getPublicEvent } from "@/lib/public-events";
import { sendConfirmedTicketEmail } from "@/lib/email/send-confirmed-ticket";
export async function refreshEvent(id: string) { return getPublicEvent(id); }
export async function register(input: unknown): Promise<RegistrationResult> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { code: "INVALID_INPUT" };
  try {
    const v = parsed.data;
    const { data, error } = await publicClient().rpc("register_attendee", { p_event_id: v.eventId, p_ticket_type_id: v.ticketTypeId, p_name: v.name, p_email: v.email });
    if (error || !data) return { code: "ERROR" };
    if (data.code === "SUCCESS") {
      const code = ticketCodeSchema.safeParse(data.ticketCode);
      if (!code.success) return { code: "ERROR" };
      // Registration is already committed. Email failure must never turn it into a failed registration.
      const emailStatus = await sendConfirmedTicketEmail(code.data);
      return { code: "SUCCESS", ticketCode: code.data, emailStatus };
    }
    return data as RegistrationResult;
  } catch { return { code: "ERROR" }; }
}
