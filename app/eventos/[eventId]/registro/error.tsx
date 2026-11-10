"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader, SiteFooter } from "@/components/site-header";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="flex min-h-svh flex-col"><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10"><Card layout="notice"><CardContent><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">No pudimos cargar el evento</h1><p role="alert" className="mt-4 text-base leading-6 text-foreground/60">Comprueba tu conexión e inténtalo de nuevo.</p><Button onClick={reset} className="mt-6">Volver a intentar</Button></CardContent></Card></main><SiteFooter /></div>;
}
