import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { PublicEvent } from "./registration";
export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase no configurado");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = await publicClient().rpc("get_public_registration_event", { p_event_id: id });
  if (error) throw new Error("No se pudo cargar el evento");
  return data as PublicEvent | null;
}
