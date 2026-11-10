import { register } from "@/lib/register-attendee";
import type { ApiError, RegistrationResponse } from "@/lib/api-contracts";
export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); }
  catch { return Response.json({ error: "INVALID_INPUT" } satisfies ApiError, { status: 400 }); }
  const result = await register(input);
  if (result.code === "SUCCESS") return Response.json({ ticketCode: result.ticketCode, emailStatus: result.emailStatus } satisfies RegistrationResponse, { status: 201 });
  const statuses = { INVALID_INPUT: 400, EVENT_CLOSED: 410, DUPLICATE: 409, TICKET_UNAVAILABLE: 409, ERROR: 500 };
  return Response.json({ error: result.code } satisfies ApiError, { status: statuses[result.code] });
}
