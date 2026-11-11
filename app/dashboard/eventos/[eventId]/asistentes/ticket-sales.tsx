import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/registration-controls";
import { CapacityMeter, DashboardNotice } from "@/components/dashboard-ui";
import { Notice } from "@/components/ui/notice";
import type { EventTicketSales } from "@/lib/export/attendees";

export function TicketSales({ data, loading, error, onRetry }: {
  data: EventTicketSales | null; loading: boolean; error: string; onRetry: () => void;
}) {
  return <section aria-labelledby="ticket-types-title" className="space-y-6">
    <div><h2 id="ticket-types-title" className="text-2xl font-semibold tracking-tight">Tipos de entrada</h2><p className="mt-2 text-sm text-foreground/60">Entradas vendidas y cuánto falta para llenar cada cupo.</p></div>
    {error && !data ? <DashboardNotice title="No pudimos cargar las ventas" description="Inténtalo de nuevo para ver cuánto falta por vender." retry={onRetry} /> : <>
      <p role="status" className="sr-only">{loading ? "Actualizando ventas…" : ""}</p>
      {error && <div className="space-y-4"><Notice tone="error" role="alert">No pudimos actualizar las ventas. Mostramos la última información disponible.</Notice><Button variant="secondary" onClick={onRetry}>Volver a intentar</Button></div>}
      <div aria-busy={loading}>
        {!data ? <div aria-hidden="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(key => <Skeleton key={key} className="h-48" />)}</div> : data.ticketTypes.length === 0 ?
          <Card><CardContent><p className="text-sm text-foreground/60">Aún no hay tipos de entrada. Configúralos en <Link href="/organizador" className="rounded-sm font-medium underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">Gestionar eventos</Link> para recibir registros.</p></CardContent></Card> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.ticketTypes.map((type, index) => {
            const remaining = type.capacity === null ? null : Math.max(0, type.capacity - type.soldCount);
            return <Card key={type.id}>
              <CardHeader><div className="flex flex-wrap items-center justify-between gap-4"><span aria-hidden="true" className="text-xs font-medium text-foreground/35">ENTRADA {String(index + 1).padStart(2, "0")}</span><Badge variant={remaining === 0 ? "secondary" : "default"}>{remaining === null ? "sin límite" : remaining === 0 ? "Aforo completo" : `${remaining} para llenar`}</Badge></div><h3 className="mt-2 text-xl font-semibold wrap-anywhere">{type.name}</h3></CardHeader>
              <CardContent><div className="mb-6 flex flex-wrap items-baseline gap-2"><span className="text-3xl font-semibold tabular-nums">{type.soldCount}</span><span className="text-xs text-foreground/50">entradas vendidas</span></div>{type.capacity !== null && <CapacityMeter count={type.soldCount} capacity={type.capacity} label={`Vendidas / cupo · ${type.name}`} />}</CardContent>
            </Card>;
          })}</div>}
      </div>
    </>}
  </section>;
}
