"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/registration-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EventRegistrationSeries, OrganizerEvent } from "@/lib/dashboard";
import { formatCalendarDate } from "@/lib/dates";
import { useDashboardQuery } from "@/lib/use-dashboard-query";

function RegistrationTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length || typeof label !== "string") return null;
  return <div className="registration-chart-tooltip">
    <p>{formatCalendarDate(label, "long")}</p>
    <p className="mt-2 font-semibold tabular-nums">{payload[0].value} registros</p>
  </div>;
}

type RegistrationChartViewProps = {
  data: EventRegistrationSeries | null;
  loading: boolean;
  error: string;
  status: OrganizerEvent["status"];
  refresh: () => void;
};

export function RegistrationChartView({ data, loading, error, status, refresh }: RegistrationChartViewProps) {
  const total = data?.days.reduce((sum, day) => sum + day.count, 0) ?? 0;
  return <section aria-labelledby="registration-chart-title">
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 id="registration-chart-title" className="text-2xl font-semibold tracking-tight">Registros por día</h2>
            <CardDescription className="mt-2">{data && !data.publishedAt ? "La evolución diaria de tus registros" : "Desde la publicación hasta hoy"} · Hora de Ecuador.</CardDescription>
          </div>
          <Button type="button" variant="secondary" onClick={refresh} disabled={loading}>{loading && data ? "Actualizando…" : "Actualizar gráfica ↻"}</Button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <p role="status" className={loading && data ? "mb-6 text-sm text-foreground/60" : "sr-only"}>{loading ? data ? "Actualizando gráfica…" : "Cargando gráfica de registros…" : ""}</p>
        {error && <div role="alert" className="mb-6 space-y-4">
          <p className="text-sm text-red-800">{data ? "No pudimos actualizar la gráfica. Mostramos la última información disponible." : "No pudimos cargar la gráfica de registros."}</p>
          <Button type="button" variant="secondary" onClick={refresh}>Volver a intentar</Button>
        </div>}
        <div aria-busy={loading}>
          {!data && loading ? <div aria-hidden="true"><Skeleton className="h-72 w-full" /></div> : data && <>
            {!data.publishedAt && (status === "published" || data.days.length > 0) && <p className="mb-6 text-sm leading-5 text-foreground/60">No se guardó la fecha de publicación de este evento. {data.startDate ? "Mostramos los datos desde el primer registro disponible." : "La gráfica estará disponible cuando llegue el primer registro."}</p>}
            {data.startDate ? <>
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
                <p className="text-sm text-foreground/60"><span className="text-xl font-semibold text-foreground tabular-nums">{total}</span> registros en el período</p>
                <p className="text-xs text-foreground/60">{formatCalendarDate(data.startDate, "long")} – {formatCalendarDate(data.endDate, "long")}</p>
              </div>
              {total === 0 && <p className="mb-6 text-sm text-foreground/60">Los primeros registros están por llegar. Cada día sin registros se muestra en cero.</p>}
              <div className="registration-chart h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={data.days} accessibilityLayer title="Registros por día en Ecuador" margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
                    <XAxis dataKey="date" tickFormatter={value => formatCalendarDate(String(value))} minTickGap={40} tickLine={false} axisLine={false} tick={{ fill: "var(--chart-label)", fontSize: 12 }} tickMargin={12} />
                    <YAxis allowDecimals={false} domain={[0, (maximum: number) => Math.max(1, maximum)]} width={32} tickLine={false} axisLine={false} tick={{ fill: "var(--chart-label)", fontSize: 12 }} />
                    <Tooltip content={RegistrationTooltip} cursor={{ stroke: "var(--chart-grid)" }} isAnimationActive={false} />
                    <Line type="linear" dataKey="count" name="Registros" stroke="var(--foreground)" strokeWidth={2} dot={data.days.length === 1 ? { r: 4, fill: "var(--foreground)" } : false} activeDot={{ r: 4, fill: "var(--foreground)", stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-6">
                <summary className="registration-chart-summary">Ver datos por día</summary>
                <div className="mt-4"><Table><caption className="sr-only">Registros diarios en Ecuador, incluidos los días sin registros</caption><TableHeader><TableRow><TableHead scope="col">Día · Ecuador</TableHead><TableHead scope="col">Registros</TableHead></TableRow></TableHeader><TableBody>{data.days.map(day => <TableRow key={day.date}><TableCell><time dateTime={day.date}>{formatCalendarDate(day.date, "long")}</time></TableCell><TableCell className="tabular-nums">{day.count}</TableCell></TableRow>)}</TableBody></Table></div>
              </details>
            </> : status === "draft" && <div role="status" className="py-12 text-center"><h3 className="text-xl font-semibold">Publica tu evento para empezar</h3><p className="mt-2 text-sm text-foreground/60">Aquí verás los registros de cada día desde su publicación.</p></div>}
          </>}
        </div>
      </CardContent>
    </Card>
  </section>;
}

export function RegistrationChart({ eventId, status }: { eventId: string; status: OrganizerEvent["status"] }) {
  const url = `/api/organizador/eventos/${encodeURIComponent(eventId)}/registros-por-dia`;
  const query = useDashboardQuery<EventRegistrationSeries>(url);
  return <RegistrationChartView {...query} data={query.dataUrl === url ? query.data : null} status={status} />;
}
