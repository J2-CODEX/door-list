import "server-only";
import { publicClient } from "./supabase/server";
import { z } from "zod";
import type { PublicEvent } from "./registration";
export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = await publicClient().rpc("get_public_registration_event", { p_event_id: id });
  if (error) throw new Error("No se pudo cargar el evento");
  return data as PublicEvent | null;
}
