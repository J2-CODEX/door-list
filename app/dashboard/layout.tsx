import Link from "next/link";
import type { Metadata } from "next";
import { DashboardSession } from "@/components/dashboard-session";
import { requireDashboardSession } from "@/lib/supabase/dashboard-session";

export const metadata: Metadata = { title: "Mi panel | Door List", robots: { index: false, follow: false } };
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardSession();
  return <div className="min-h-svh"><header className="border-b border-foreground/10 bg-white/70"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10"><Link href="/" className="text-xl font-bold tracking-tight">door list<span className="text-[#719148]">.</span></Link><nav aria-label="Organizador" className="flex items-center gap-5 text-sm"><Link href="/dashboard" className="font-semibold underline decoration-[#a7bd7d] underline-offset-8">Mis eventos</Link><Link href="/organizador" className="text-foreground/60 hover:text-foreground">Gestionar eventos ↗</Link></nav></div></header><main className="mx-auto max-w-7xl px-6 pb-16 sm:px-10"><DashboardSession>{children}</DashboardSession></main><footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-foreground/10 px-6 py-6 text-xs text-foreground/50 sm:px-10"><span>Door List · Encuentros que conectan.</span><span>Espacio privado del organizador</span></footer></div>;
}
