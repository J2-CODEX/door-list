import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticateOrganizerToken } from "./organizer";

export const organizerCookieName = "door-list-organizer";

export async function requireDashboardSession() {
  const token = (await cookies()).get(organizerCookieName)?.value;
  let auth = null;
  try { auth = await authenticateOrganizerToken(token); }
  catch { /* Fail closed if Supabase Auth is unavailable. */ }
  if (!auth) redirect("/iniciar-sesion");
  return auth;
}
