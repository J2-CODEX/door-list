import { ecuadorDate } from "@/lib/dates";
import type { OrganizerRegistration, OrganizerTicketType } from "@/lib/dashboard";
import { ticketStatuses, type PublicTicket } from "@/lib/tickets";

export const soldTicketStatuses = ["valid", "used"] as const satisfies readonly PublicTicket["status"][];
export function isSoldTicketStatus(status: string): status is typeof soldTicketStatuses[number] {
  return soldTicketStatuses.some(value => value === status);
}

export type OrganizerTicketSales = Omit<OrganizerTicketType, "capacity" | "registrationCount"> & {
  capacity: number | null;
  soldCount: number;
};
export type EventTicketSales = { ticketTypes: OrganizerTicketSales[] };
export type ExportRegistration = Pick<OrganizerRegistration, "name" | "email" | "createdAt"> & {
  ticketTypeName: string;
  ticketCode: string;
  ticketStatus: string;
};

const headers = ["nombre", "email", "tipo de entrada", "código de ticket", "fecha de compra", "estado del ticket"];

function csvField(value: string) {
  // Quoting alone doesn't prevent spreadsheets from evaluating a user's formula.
  const safe = /^[\t\r\n]|^\s*[=+@-]/u.test(value) ? `'${value}` : value;
  return /[",\r\n]/u.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function buildAttendeesCsv(registrations: readonly ExportRegistration[]) {
  const rows = [headers.join(",")];
  for (const registration of registrations) {
    if (!isSoldTicketStatus(registration.ticketStatus)) continue;
    rows.push([
      registration.name, registration.email, registration.ticketTypeName,
      registration.ticketCode, ecuadorDate(registration.createdAt), ticketStatuses[registration.ticketStatus].label,
    ].map(csvField).join(","));
  }
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export function attendeesFilename(title: string, eventId: string, date: Date = new Date()) {
  const slug = title.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-$/g, "") || eventId;
  return `asistentes-${slug}-${ecuadorDate(date)}.csv`;
}
