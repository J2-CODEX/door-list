import type { PostgrestError } from "@supabase/supabase-js";

export const ticketTypeSaveErrors = {
  minimumCapacity: "El aforo no puede ser inferior al número de asistentes ya registrados en este tipo de entrada.",
  maximumCapacity: "El aforo supera el disponible para este evento. Revisa los datos.",
  unknown: "No pudimos guardar el tipo de entrada. Inténtalo de nuevo.",
} as const;

export function getTicketTypeSaveError(error: Pick<PostgrestError, "code" | "message">): string {
  // These exceptions share a code; match only the exact versioned pairs.
  if (error.code === "23514") {
    if (error.message === "El aforo no puede ser menor que los registros existentes") {
      return ticketTypeSaveErrors.minimumCapacity;
    }
    if (error.message === "La suma de aforos de las entradas supera el límite del evento") {
      return ticketTypeSaveErrors.maximumCapacity;
    }
  }
  return ticketTypeSaveErrors.unknown;
}
