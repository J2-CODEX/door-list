import "server-only";
import { getPublicTicket } from "@/lib/public-tickets";
import { getTicketEmailConfig, sendTicketEmail } from "./ticket-email";

export async function sendConfirmedTicketEmail(code: string): Promise<"sent" | "failed"> {
  try {
    // Use the issued ticket; only server configuration can redirect local test emails.
    const ticket = await getPublicTicket(code);
    if (!ticket || ticket.status !== "valid") return "failed";
    await sendTicketEmail(ticket, getTicketEmailConfig(process.env));
    return "sent";
  } catch {
    console.error("Ticket confirmation email failed");
    return "failed";
  }
}
