import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventSummary } from "@/components/event-summary";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import Link from "next/link";
import { getPublicEvent } from "@/lib/public-events";
import RegistrationForm from "./registration-form";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reserva tu lugar | Door List" };
export default async function RegistrationPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getPublicEvent(eventId);
  return <div className="flex min-h-svh flex-col">
    <SiteHeader />
    {!event ? <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10"><Card layout="notice"><CardContent><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Este evento no está disponible para registro</h1><p className="mt-4 text-base leading-6 text-foreground/60">El enlace puede haber cambiado o el período de registro ha terminado.</p><Link href="/" className={`${buttonStyles()} mt-6`}>Volver al inicio</Link></CardContent></Card></main> : <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-12 px-6 py-8 sm:px-10 lg:grid-cols-2">
      <div className="min-w-0 space-y-6"><EventSummary title={event.title} description={event.description} startsAt={event.starts_at} venue={event.venue} /><p className="text-sm leading-5 text-foreground/60">Puedes registrarte durante todo el día del evento, sujeto a disponibilidad.</p></div>
      <RegistrationForm initialEvent={event} />
    </main>}
    <SiteFooter />
  </div>;
}
