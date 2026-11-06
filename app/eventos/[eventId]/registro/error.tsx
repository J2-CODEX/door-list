"use client";
import { Button, Card } from "@/components/ui/registration-controls";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="mx-auto max-w-xl px-6 py-24"><Card><h1 className="text-2xl font-semibold">No pudimos cargar el evento</h1><p role="alert" className="my-5">Comprueba tu conexión e inténtalo de nuevo.</p><Button onClick={reset}>Reintentar</Button></Card></main>; }
