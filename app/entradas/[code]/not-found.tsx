import Link from "next/link";
export default function TicketNotFound() { return <main className="mx-auto max-w-xl px-6 py-24"><h1 className="text-3xl font-semibold">Entrada no disponible</h1><p className="mt-4 text-foreground/70">No pudimos encontrar esta entrada. Comprueba que tengas el enlace completo.</p><Link href="/" className="mt-6 inline-block underline">Volver al inicio</Link></main>; }
