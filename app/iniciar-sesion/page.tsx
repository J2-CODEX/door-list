import Link from "next/link";
import { LoginForm } from "./login-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Iniciar sesión | Door List", robots: { index: false, follow: false } };
export default function LoginPage() {
  return <main className="mx-auto min-h-svh max-w-5xl px-6 py-8 sm:px-10"><Link href="/" className="text-xl font-bold tracking-tight">door list<span className="text-[#719148]">.</span></Link><div className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24"><div><p className="text-xs font-semibold tracking-[.18em] text-[#527436] uppercase">Tu espacio privado</p><h1 className="mt-4 text-5xl leading-tight font-semibold tracking-tight">Buenos encuentros.<br />Todo bajo control<span className="text-[#719148]">.</span></h1><p className="mt-6 leading-relaxed text-foreground/65">Inicia sesión para ver tus eventos, sus entradas y las personas que ya dijeron «ahí estaré».</p></div><LoginForm /></div></main>;
}
