import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { DashboardSession } from "@/components/dashboard-session";
import { requireDashboardSession } from "@/lib/supabase/dashboard-session";

export const metadata: Metadata = { title: "Mi panel | Door List", robots: { index: false, follow: false } };
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardSession();
  return <div className="flex min-h-svh flex-col"><SiteHeader><nav aria-label="Organizador" className="flex flex-wrap items-center gap-4 text-sm"><Link href="/dashboard" className="rounded-sm font-semibold underline decoration-accent underline-offset-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">Mis eventos</Link><Link href="/organizador" className="rounded-sm text-foreground/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">Gestionar eventos ↗</Link></nav></SiteHeader><main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10"><DashboardSession>{children}</DashboardSession></main><SiteFooter><span>Espacio privado del organizador</span></SiteFooter></div>;
}
