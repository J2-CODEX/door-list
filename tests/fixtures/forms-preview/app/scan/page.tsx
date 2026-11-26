import { DashboardSession } from "@/components/dashboard-session";
import { TicketScanner } from "@/app/scan/ticket-scanner";
export default function Page() { return <main className="scan-shell"><DashboardSession showControls={false}><TicketScanner /></DashboardSession></main>; }
