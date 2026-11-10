import { formatEventDate } from "@/lib/dates";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { getPublicTicket } from "@/lib/public-tickets";
import { ticketStatuses } from "@/lib/tickets";
import { Card } from "@/components/ui/registration-controls";
import TicketRefresh from "./ticket-refresh";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tu entrada | Door List",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ticket = await getPublicTicket(code);
  if (!ticket) notFound();
  const state = ticketStatuses[ticket.status];
  const qr = await QRCode.toDataURL(ticket.code, { errorCorrectionLevel: "M", margin: 4, width: 360 });
  return <div className="mx-auto min-h-svh max-w-5xl px-6 sm:px-10">
    <header className="border-b border-foreground/15 py-7"><Link href="/" prefetch={false} className="text-xl font-bold tracking-tight">door list<span className="text-[#719148]">.</span></Link></header>
    <main className="py-12 sm:py-16">
      <p className="text-xs font-semibold tracking-[.2em] text-[#527436] uppercase">Tu próximo encuentro</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Tu entrada, lista para acompañarte</h1>
      <div className="mt-8 grid items-start gap-6 md:grid-cols-[1.15fr_1fr]">
        <Card><p className="text-sm text-foreground/60">Evento</p><h2 className="mt-2 text-2xl font-semibold wrap-break-word">{ticket.event.title}</h2>
          <dl className="mt-7 space-y-5">
            <div><dt className="text-sm text-foreground/60">Asistente</dt><dd className="mt-1 font-semibold wrap-break-word">{ticket.name}</dd><dd className="mt-1 text-sm wrap-break-word">{ticket.email}</dd></div>
            <div><dt className="text-sm text-foreground/60">Tipo de entrada</dt><dd className="mt-1 font-medium wrap-break-word">{ticket.ticketType}</dd></div>
            <div><dt className="text-sm text-foreground/60">Cuándo</dt><dd className="mt-1"><time dateTime={ticket.event.starts_at}>{formatEventDate(ticket.event.starts_at)}</time></dd><dd className="mt-1 text-xs text-foreground/60">Hora de Ecuador continental · UTC−5</dd></div>
            <div><dt className="text-sm text-foreground/60">Dónde</dt><dd className="mt-1 wrap-break-word">{ticket.event.venue}</dd></div>
          </dl>
        </Card>
        <Card><h2 className="text-xl font-semibold">Presenta tu código QR</h2>
          <div role="status" className={`mt-4 rounded-xl p-4 ${state.className}`}><p className="font-semibold">{state.label}</p><p className="mt-1 text-sm leading-relaxed">{state.description}</p></div>
          <Image src={qr} unoptimized alt="Código QR de tu entrada" width={360} height={360} className="mx-auto mt-5 h-auto w-full max-w-[360px] rounded-xl" />
          <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Ver código de la entrada</summary><code className="mt-3 block break-all rounded-lg bg-background p-3 text-xs">{ticket.code}</code></details>
          <TicketRefresh />
        </Card>
      </div>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-foreground/65">Guarda este enlace en tus favoritos. Es privado: quien tenga el enlace o el código puede consultar tu entrada. El estado se actualiza al abrir la página o al pulsar «Actualizar estado».</p>
    </main>
  </div>;
}
