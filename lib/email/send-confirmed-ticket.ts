import "server-only";
import { getPublicTicket } from "@/lib/public-tickets";
import { sendTicketEmail } from "./ticket-email";

export async function sendConfirmedTicketEmail(code: string): Promise<"sent" | "failed"> {
  try {
    // Use the issued ticket and stored recipient, never client-supplied event/email data.
    const ticket = await getPublicTicket(code);
    if (!ticket || ticket.status !== "valid") return "failed";
    await sendTicketEmail(ticket, { apiKey: process.env.RESEND_API_KEY ?? "", from: process.env.RESEND_FROM_EMAIL ?? "" });
    return "sent";
  } catch {
    console.error("Ticket confirmation email failed");
    return "failed";
  }
}
