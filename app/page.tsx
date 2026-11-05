import Link from "next/link";

const event = {
  title: "Ideas, café y buenas conexiones.",
  date: "21 de noviembre de 2026",
  dateTime: "2026-11-21T17:00:00-05:00",
  time: "17:00 · Hora de Ecuador",
  venue: "Casa del Encuentro",
  city: "Guayaquil, Ecuador",
};

export default function Home() {
  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-6 sm:px-10">
      <header className="flex items-center justify-between border-b border-foreground/15 py-7">
        <span className="text-xl font-bold tracking-tight">door list<span className="text-[#719148]">.</span></span>
        <Link href="/organizador" className="text-xs tracking-widest uppercase hover:underline">Organizadores ↗</Link>
      </header>

      <main className="grid flex-1 items-center gap-12 py-16 md:grid-cols-[1.2fr_1fr] md:gap-16 md:py-24">
        <section aria-labelledby="event-title">
          <p className="mb-3 text-base font-medium text-[#527436]">¡Bienvenido a Door List! Nos alegra tenerte aquí.</p>
          <p className="mb-6 text-xs font-semibold tracking-[0.2em] uppercase">El próximo encuentro</p>
          <h1 id="event-title" className="max-w-xl text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            {event.title}
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-foreground/75">
            Las mejores ideas empiezan con una conversación. Un espacio para
            conocer personas, compartir lo que te mueve y conectar.
          </p>
        </section>

        <section aria-labelledby="details-title" className="overflow-hidden rounded-3xl bg-[#18372c] text-[#f6f5f0]">
          <div aria-hidden="true" className="flex h-48 items-end justify-center overflow-hidden bg-[#d8e8a4] pt-8 sm:h-56">
            <div className="flex h-full w-36 items-end justify-center rounded-t-full border-2 border-[#18372c] bg-[#18372c] p-3">
              <div className="h-full w-full origin-left -skew-y-12 rounded-t-full border border-[#d8e8a4]/50 bg-[#315444]" />
            </div>
          </div>
          <div className="p-7 sm:p-9">
            <h2 id="details-title" className="mb-7 text-xs font-semibold tracking-[0.2em] text-[#d8e8a4] uppercase">Tu próxima cita</h2>
            <dl className="space-y-6">
              <div>
                <dt className="mb-1 text-sm text-white/65">Fecha</dt>
                <dd className="text-lg font-medium"><time dateTime={event.dateTime}>{event.date}</time></dd>
                <dd className="mt-1 text-sm text-white/75">{event.time}</dd>
              </div>
              <div>
                <dt className="mb-1 text-sm text-white/65">Lugar</dt>
                <dd className="text-lg font-medium">{event.venue}</dd>
                <dd className="mt-1 text-sm text-white/75">{event.city}</dd>
              </div>
            </dl>
            <button type="button" className="mt-9 w-full cursor-pointer rounded-xl bg-[#d8e8a4] px-6 py-4 font-semibold text-[#18372c] transition-colors hover:bg-[#e5f2bf] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d8e8a4]">
              Registrarme <span aria-hidden="true" className="ml-2">↗</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/15 py-6 text-sm text-foreground/65">
        Door List · Una puerta abierta a nuevas conexiones.
      </footer>
    </div>
  );
}
