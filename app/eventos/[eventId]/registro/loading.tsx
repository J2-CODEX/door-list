import { Skeleton } from "@/components/ui/registration-controls";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader, SiteFooter } from "@/components/site-header";
export default function Loading() {
  return <div className="flex min-h-svh flex-col"><SiteHeader /><main aria-busy="true" className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10"><p role="status" className="sr-only">Cargando tu próximo encuentro…</p><div aria-hidden="true" className="grid items-start gap-12 lg:grid-cols-2"><div className="space-y-6"><Skeleton className="h-4 w-48" /><Skeleton className="h-24" /><Skeleton className="h-32" /><Skeleton className="h-40" /></div><Card><CardContent><div className="space-y-6"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div></CardContent></Card></div></main><SiteFooter /></div>;
}
