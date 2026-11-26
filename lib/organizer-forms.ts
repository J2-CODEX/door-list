import { z } from "zod";

const capacitySchema = z.string().trim()
  .min(1, "Ingresa el aforo.")
  .transform(Number)
  .pipe(z.number().int("El aforo debe ser un número entero.").min(1, "El aforo debe ser al menos 1.").max(2147483647, "El aforo no puede superar 2147483647."));

export function createEventFormSchema(allocatedCapacity = 0) {
  return z.object({
    title: z.string().trim().min(1, "Ingresa el nombre del evento."),
    description: z.string().trim().min(1, "Ingresa la descripción del evento."),
    venue: z.string().trim().min(1, "Ingresa el lugar del evento."),
    startsAt: z.string().min(1, "Ingresa la fecha y hora.").pipe(z.iso.datetime({ local: true, error: "Ingresa una fecha y hora válida." })),
    status: z.enum(["draft", "published"], { error: "Selecciona un estado válido." }),
    capacity: capacitySchema.refine(value => value >= allocatedCapacity, `El límite debe ser al menos ${allocatedCapacity}, el aforo ya asignado.`),
  });
}

export function createTicketTypeFormSchema(availableCapacity: number) {
  return z.object({
    name: z.string().trim().min(1, "Ingresa el nombre del tipo de entrada."),
    capacity: capacitySchema.refine(value => value <= availableCapacity, `El aforo disponible para este tipo es ${availableCapacity}.`),
  });
}

export type EventFormInput = z.input<ReturnType<typeof createEventFormSchema>>;
export type EventFormValues = z.output<ReturnType<typeof createEventFormSchema>>;
export type TicketTypeFormInput = z.input<ReturnType<typeof createTicketTypeFormSchema>>;
export type TicketTypeFormValues = z.output<ReturnType<typeof createTicketTypeFormSchema>>;
