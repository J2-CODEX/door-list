"use client";
import Image from 'next/image';
import { useEffect, useState } from 'react';
export function EventCoverFallback({ failed = false, pending = false, compact = false }: { failed?: boolean; pending?: boolean; compact?: boolean }) {
  const message = pending ? "Cargando imagen de portada" : failed ? "No pudimos cargar la imagen" : "Sin imagen de portada";
  return <span role={compact ? "img" : undefined} aria-label={compact ? message : undefined} className="absolute inset-0 flex items-center justify-center bg-accent-surface px-2 text-center text-sm text-foreground">
    {compact ? <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><path d="m3 17 5-5 4 4 4-6 5 7" /></svg> : message}
  </span>;
}
export function EventCoverImage({ src, alt, sizes, loading, accessToken, compact = false }: { src: string; alt: string; sizes?: string; loading?: "eager" | "lazy"; accessToken?: string; compact?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [download, setDownload] = useState<{ token: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    async function load() {
      try {
        const response = await fetch(src, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Image unavailable');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setDownload({ token: accessToken!, url: objectUrl });
      } catch {
        if (!controller.signal.aborted) setDownload({ token: accessToken!, url: null });
      }
    }
    void load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, accessToken]);
  if (accessToken && download?.token !== accessToken) return <EventCoverFallback pending compact={compact} />;
  const imageSrc = accessToken ? download?.url : src;
  return !imageSrc || failedSource === imageSrc ? <EventCoverFallback failed compact={compact} /> : <Image src={imageSrc} alt={alt} fill unoptimized sizes={sizes ?? "(max-width: 767px) 100vw, 50vw"} loading={loading} className="object-cover object-center" onError={() => setFailedSource(imageSrc)} />;
}
