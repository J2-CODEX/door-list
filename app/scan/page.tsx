import type { Metadata } from "next";
import Link from "next/link";
import { DashboardSession } from "@/components/dashboard-session";
import { requireDashboardSession } from "@/lib/supabase/dashboard-session";
import { TicketScanner } from "./ticket-scanner";

export const metadata: Metadata = { title: "Control de puerta | Door List", robots: { index: false, follow: false } };
export default async function ScanPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  await requireDashboardSession();
  const { eventId } = await searchParams;
  return <main className="scan-shell">
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Control de puerta</h1>
      <Link href="/dashboard" className="scan-panel-link">Ir al panel</Link>
    </header>
    <DashboardSession showControls={false}><TicketScanner initialEventId={eventId} /></DashboardSession>
  </main>;
}
