import { Skeleton } from "@/components/ui/registration-controls";
export default function Loading() { return <main aria-busy="true" aria-label="Cargando evento" className="mx-auto grid max-w-6xl gap-10 px-6 py-24 md:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-96" /><p role="status">Cargando tu próximo encuentro…</p></main>; }
