import { formatEventDate } from "@/lib/dates";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { getPublicTicket } from "@/lib/public-tickets";
import { ticketStatuses } from "@/lib/tickets";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const title = {
    valid: "Tu entrada",
    used: "Entrada utilizada",
    revoked: "Entrada revocada",
  }[ticket.status];
  const qr = await QRCode.toDataURL(ticket.code, { errorCorrectionLevel: "M", margin: 4, width: 360 });
  return (
    <div className="mx-auto min-h-svh max-w-5xl px-6 sm:px-10">
      <header className="border-b border-foreground/15 py-4">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex min-h-12 items-center rounded-sm text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          door list<span className="text-accent">.</span>
        </Link>
      </header>
      <main className="py-8">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <div className="mt-6 grid items-start gap-6 md:grid-cols-[1fr_1.15fr]">
          <section aria-labelledby="ticket-code-heading" className="min-w-0">
            <Card>
              <CardContent>
                <h2 id="ticket-code-heading" className="text-xl font-semibold">
                  {ticket.status === "valid" ? "Presenta tu código QR" : "Código de la entrada"}
                </h2>
                <div role="status" className={`mt-4 rounded-xl p-4 ${state.className}`}>
                  <p className="font-semibold">{state.label}</p>
                  <p className="mt-1 text-sm leading-relaxed">{state.description}</p>
                </div>
                <Image
                  src={qr}
                  unoptimized
                  loading="eager"
                  alt="Código QR de tu entrada"
                  width={360}
                  height={360}
                  className="mx-auto mt-4 h-auto w-full max-w-[360px]"
                />
                <details className="mt-2 text-sm">
                  <summary className="min-h-12 cursor-pointer rounded-sm py-3 font-medium leading-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
                    Ver código de la entrada
                  </summary>
                  <code className="mt-3 block break-all rounded-xl bg-background p-3 text-xs">
                    {ticket.code}
                  </code>
                </details>
                <TicketRefresh />
              </CardContent>
            </Card>
          </section>
          <section aria-labelledby="ticket-event-heading" className="min-w-0">
            <Card>
              <CardHeader>
                <h2 id="ticket-event-heading" className="text-2xl font-semibold tracking-tight wrap-break-word">
                  {ticket.event.title}
                </h2>
              </CardHeader>
              <CardContent>
                <dl className="space-y-6">
                  <div>
                    <dt className="text-sm text-foreground/75">Asistente</dt>
                    <dd className="mt-1 font-semibold wrap-break-word">{ticket.name}</dd>
                    <dd className="mt-1 text-sm wrap-break-word">{ticket.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-foreground/75">Tipo de entrada</dt>
                    <dd className="mt-1 font-medium wrap-break-word">{ticket.ticketType}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-foreground/75">Cuándo</dt>
                    <dd className="mt-1">
                      <time dateTime={ticket.event.starts_at}>{formatEventDate(ticket.event.starts_at)}</time>
                    </dd>
                    <dd className="mt-1 text-xs text-foreground/75">Hora de Ecuador continental · UTC−5</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-foreground/75">Dónde</dt>
                    <dd className="mt-1 wrap-break-word">{ticket.event.venue}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </section>
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-foreground/75">
          Guarda este enlace en tus favoritos. Es privado: quien tenga el enlace o el código puede consultar tu entrada. El estado se actualiza al abrir la página o al pulsar «Actualizar estado».
        </p>
      </main>
    </div>
  );
}
