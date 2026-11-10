import { formatEventDate } from "@/lib/dates";
import Link from "next/link";
import { getPublicEvent } from "@/lib/public-events";
import RegistrationForm from "./registration-form";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reserva tu lugar | Door List" };
export default async function RegistrationPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getPublicEvent(eventId);
  return <div className="mx-auto min-h-svh max-w-6xl px-6 sm:px-10">
    <header className="border-b border-foreground/15 py-7"><Link href="/" className="text-xl font-bold tracking-tight">door list<span className="text-[#719148]">.</span></Link></header>
    {!event ? <main className="py-24"><h1 className="text-3xl font-semibold">Este evento no está disponible para registro</h1><p className="mt-4 text-foreground/70">El enlace puede haber cambiado o el período de registro ha terminado.</p><Link href="/" className="mt-6 inline-block underline">Volver al inicio</Link></main> : <main className="grid items-start gap-10 py-12 md:grid-cols-2 md:gap-16 md:py-20">
      <section><p className="text-xs font-semibold tracking-[.2em] text-[#527436] uppercase">Tu próximo encuentro</p><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{event.title}</h1><p className="mt-6 whitespace-pre-wrap leading-relaxed text-foreground/75">{event.description}</p><dl className="mt-8 space-y-5 rounded-2xl bg-[#e9eedf] p-6"><div><dt className="text-sm text-foreground/65">Cuándo</dt><dd className="mt-1 font-medium"><time dateTime={event.starts_at}>{formatEventDate(event.starts_at)}</time></dd><dd className="mt-1 text-xs">Hora de Ecuador continental · UTC−5</dd></div><div><dt className="text-sm text-foreground/65">Dónde</dt><dd className="mt-1 font-medium">{event.venue}</dd></div></dl><p className="mt-5 text-sm text-foreground/65">Puedes registrarte durante todo el día del evento, sujeto a disponibilidad.</p></section>
      <RegistrationForm initialEvent={event} />
    </main>}
    <footer className="border-t border-foreground/15 py-6 text-sm text-foreground/65">Door List · Una puerta abierta a nuevas conexiones.</footer>
  </div>;
}
