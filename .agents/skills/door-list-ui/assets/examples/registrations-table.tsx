import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/registration-controls";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { OrganizerEvent, OrganizerRegistration } from "@/lib/dashboard";
import { formatEventDate } from "@/lib/dates";

export type RegistrationTableState =
  | "loading" | "error" | "empty" | "filtered-empty"
  | "ready" | "refreshing" | "refresh-error";

type RegistrationsTableExampleProps = {
  state: RegistrationTableState;
  event: Pick<OrganizerEvent, "title" | "ticketTypes">;
  registrations: OrganizerRegistration[];
  retryHref: string;
  clearFiltersHref: string;
  emptyReason?: "no-registrations" | "filters";
};

export function RegistrationsTableExample({
  state, event, registrations, retryHref, clearFiltersHref, emptyReason = "no-registrations",
}: RegistrationsTableExampleProps) {
  const loading = state === "loading";
  const refreshing = state === "refreshing";
  const failed = state === "error";
  const filteredEmpty = state === "filtered-empty" || (
    (refreshing || state === "refresh-error") && registrations.length === 0 && emptyReason === "filters"
  );
  const empty = state === "empty" || filteredEmpty || (!loading && !failed && registrations.length === 0);

  return (
    <div>
      <p role="status" className={loading || refreshing ? "px-6 pb-4 text-sm text-foreground/60" : "sr-only"}>
        {loading ? "Cargando registros…" : refreshing ? "Actualizando registros…" : ""}
      </p>
      {state === "refresh-error" && (
        <div role="alert" className="space-y-4 px-6 pb-6">
          <p className="text-sm text-red-800">No pudimos actualizar los registros. Mostramos la última información disponible.</p>
          <form action={retryHref} method="get"><Button type="submit">Volver a intentar</Button></form>
        </div>
      )}
      <div aria-busy={loading || refreshing}>
        <Table className="min-w-[640px]">
          <caption className="sr-only">Personas registradas en {event.title}</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Asistente</TableHead>
              <TableHead scope="col">Tipo de entrada</TableHead>
              <TableHead scope="col">Fecha de registro · Ecuador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }, (_, index) => (
              <TableRow key={index}>
                <TableCell><div aria-hidden="true"><Skeleton className="h-5 w-48" /></div></TableCell>
                <TableCell><div aria-hidden="true"><Skeleton className="h-5 w-32" /></div></TableCell>
                <TableCell><div aria-hidden="true"><Skeleton className="h-5 w-48" /></div></TableCell>
              </TableRow>
            )) : failed || empty ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <div role={failed ? "alert" : "status"} className="py-12 text-center">
                    <h3 className="text-xl font-semibold">
                      {failed ? "No pudimos cargar los registros" : filteredEmpty ? "No hay registros con estos filtros" : "Los primeros registros están por llegar"}
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-foreground/60">
                      {failed ? "Inténtalo de nuevo en unos momentos." : filteredEmpty ? "Prueba con otro nombre, correo o tipo de entrada." : "Cuando alguien se registre, lo verás aquí."}
                    </p>
                    {failed && <form action={retryHref} method="get" className="mt-6"><Button type="submit">Volver a intentar</Button></form>}
                    {filteredEmpty && <form action={clearFiltersHref} method="get" className="mt-6"><Button type="submit">Limpiar filtros</Button></form>}
                  </div>
                </TableCell>
              </TableRow>
            ) : registrations.map(registration => (
              <TableRow key={registration.id}>
                <TableCell>
                  <p className="max-w-xs font-medium wrap-break-word">{registration.name}</p>
                  <p className="mt-1 max-w-xs text-xs text-foreground/60 wrap-anywhere">{registration.email}</p>
                </TableCell>
                <TableCell>{event.ticketTypes.find(type => type.id === registration.ticketTypeId)?.name ?? "Tipo de entrada no disponible"}</TableCell>
                <TableCell className="tabular-nums"><time dateTime={registration.createdAt}>{formatEventDate(registration.createdAt)}</time></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
