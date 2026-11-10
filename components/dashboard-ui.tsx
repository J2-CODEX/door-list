import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { occupancy } from "@/lib/dashboard";

export const dashboardLink = "inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#315444] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#719148]";
export function EventStatus({ status }: { status: "draft" | "published" }) { return <Badge variant={status === "published" ? "default" : "secondary"}><span aria-hidden="true" className={`size-1.5 rounded-full ${status === "published" ? "bg-[#719148]" : "bg-foreground/35"}`} />{status === "published" ? "Publicado" : "Borrador"}</Badge>; }
export function CapacityMeter({ count, capacity, label = "Aforo" }: { count: number; capacity: number; label?: string }) {
  const percentage = occupancy(count, capacity);
  return <div className="space-y-2.5"><div className="flex items-center justify-between gap-3 text-xs"><span className="text-foreground/60">{label}</span><span className="font-medium tabular-nums">{count} <span className="text-foreground/50">/ {capacity}</span></span></div><div role="progressbar" aria-label={label} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${count} de ${capacity} plazas ocupadas`} className="h-2 overflow-hidden rounded-full bg-foreground/[.07]"><div className={`h-full rounded-full ${percentage >= 90 ? "bg-[#b77c35]" : "bg-[#719148]"}`} style={{ width: `${percentage}%` }} /></div></div>;
}
export function Metric({ label, value, detail, accent = false }: { label: string; value: string | number; detail: string; accent?: boolean }) {
  return <Card className={accent ? "border-transparent bg-[#e9eedf] shadow-none" : ""}><CardContent><p className="text-sm text-foreground/65">{label}</p><p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">{value}</p><p className="mt-3 text-xs text-foreground/55">{detail}</p></CardContent></Card>;
}
export function DashboardNotice({ title, description, retry }: { title: string; description: string; retry?: () => void }) {
  return <Card className="my-10 border-dashed py-12 text-center"><CardContent><h2 className="text-xl font-semibold">{title}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-foreground/60">{description}</p>{retry ? <button onClick={retry} className={`${dashboardLink} mt-6 cursor-pointer`}>Volver a intentar</button> : <Link href="/dashboard" className={`${dashboardLink} mt-6`}>Mis eventos</Link>}</CardContent></Card>;
}
