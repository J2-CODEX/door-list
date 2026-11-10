import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { occupancy } from "@/lib/dashboard";

export const dashboardLink = buttonStyles();
export function EventStatus({ status }: { status: "draft" | "published" }) {
  return <Badge variant={status === "published" ? "default" : "secondary"}><span aria-hidden="true" className={`size-2 rounded-full ${status === "published" ? "bg-accent" : "bg-foreground/35"}`} />{status === "published" ? "Publicado" : "Borrador"}</Badge>;
}
export function CapacityMeter({ count, capacity, label = "Aforo" }: { count: number; capacity: number; label?: string }) {
  const percentage = occupancy(count, capacity);
  return <div className="space-y-2"><div className="flex items-center justify-between gap-4 text-xs leading-4"><span className="text-foreground/60 wrap-anywhere">{label}</span><span className="shrink-0 font-medium tabular-nums">{count} <span className="text-foreground/60">/ {capacity}</span></span></div><div role="progressbar" aria-label={label} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${count} de ${capacity} plazas ocupadas`} className="h-2 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-accent" style={{ width: `${percentage}%` }} /></div></div>;
}
export function Metric({ label, value, detail, accent = false }: { label: string; value: string | number; detail: string; accent?: boolean }) {
  return <Card tone={accent ? "accent" : "default"}><CardContent><p className="text-sm leading-5 text-foreground/60">{label}</p><p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{value}</p><p className="mt-4 text-xs leading-4 text-foreground/60">{detail}</p></CardContent></Card>;
}
export function DashboardNotice({ title, description, retry }: { title: string; description: string; retry?: () => void }) {
  return <Card layout="notice"><CardContent><h2 className="text-xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-5 text-foreground/60">{description}</p>{retry ? <Button onClick={retry} className="mt-6">Volver a intentar</Button> : <Link href="/dashboard" className={`${dashboardLink} mt-6`}>Mis eventos</Link>}</CardContent></Card>;
}
