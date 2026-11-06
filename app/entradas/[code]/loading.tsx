import { Skeleton } from "@/components/ui/registration-controls";
export default function TicketLoading() { return <main className="mx-auto max-w-5xl px-6 py-24" aria-busy="true"><p role="status" className="mb-6">Cargando tu entrada…</p><div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></main>; }
