import "server-only";
import { createClient } from "@supabase/supabase-js";

export async function authenticateOrganizer(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  return authenticateOrganizerToken(token);
}

export async function authenticateOrganizerToken(token?: string) {
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Servicio no disponible");
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : { client, userId: data.user.id, email: data.user.email ?? "" };
}
