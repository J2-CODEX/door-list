import Link from "next/link";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { formatEventDate } from "@/lib/dates";
import { exampleEvent, exampleRegistrations } from "./fixtures";
import { RegistrationsTableExample, type RegistrationTableState } from "./registrations-table";

type EventPageExampleProps = {
  tableState: RegistrationTableState;
  eventHref: string;
  retryHref: string;
  clearFiltersHref: string;
};

export function EventPageExample({
  tableState, eventHref, retryHref, clearFiltersHref,
}: EventPageExampleProps) {
  const registrations = tableState === "empty" || tableState === "filtered-empty" ? [] : exampleRegistrations;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-12 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{exampleEvent.title}</h1>
          <p className="text-base leading-6 text-foreground/60"><time dateTime={exampleEvent.startsAt}>{formatEventDate(exampleEvent.startsAt)}</time> · {exampleEvent.venue}</p>
        </div>
        <Link href={eventHref} prefetch={false} className="rounded-sm text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">Ver evento</Link>
      </header>
      <section aria-labelledby="registrations-heading">
        <Card className="overflow-hidden">
          <CardHeader>
            <h2 id="registrations-heading" className="text-2xl font-semibold tracking-tight">Lista de registrados</h2>
            <CardDescription>Las personas que ya son parte de tu evento.</CardDescription>
          </CardHeader>
          <RegistrationsTableExample state={tableState} event={exampleEvent} registrations={registrations} retryHref={retryHref} clearFiltersHref={clearFiltersHref} />
        </Card>
      </section>
    </main>
  );
}
