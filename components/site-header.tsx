import Link from "next/link";
import type { ReactNode } from "react";
export function SiteHeader({ children }: { children?: ReactNode }) {
  return <header className="border-b border-foreground/10 bg-surface"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10"><Link href="/" className="rounded-sm text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">door list<span className="text-accent">.</span></Link>{children}</div></header>;
}
export function SiteFooter({ children }: { children?: ReactNode }) {
  return <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-4 border-t border-foreground/10 px-6 py-6 text-xs leading-4 text-foreground/60 sm:px-10"><span>Door List · Encuentros que conectan.</span>{children}</footer>;
}
