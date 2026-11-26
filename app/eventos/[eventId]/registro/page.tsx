import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RegistrationEventDetails } from "./event-details";
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
    <SiteHeader><Link href="/" className={buttonStyles("ghost")}>Ver todos los eventos</Link></SiteHeader>
    {!event ? <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10"><Card layout="notice"><CardContent><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Este evento no está disponible para registro</h1><p className="mt-4 text-base leading-6 text-muted-foreground">El enlace puede haber cambiado o el período de registro ha terminado.</p><Link href="/" className={`${buttonStyles()} mt-6`}>Volver al inicio</Link></CardContent></Card></main> : <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10">
      <RegistrationEventDetails event={event}><RegistrationForm initialEvent={event} /></RegistrationEventDetails>
    </main>}
    <SiteFooter />
  </div>;
}
