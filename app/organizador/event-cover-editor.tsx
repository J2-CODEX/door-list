"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { EventCover } from '@/components/event-cover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { EMPTY_COVER_STATE, EventCoverError, MAX_COVER_BYTES, normalizeCoverAltText, reconcileCoverChange } from '@/lib/event-covers';
import type { ConfirmCoverResponse, EventCoverState, EventCoverUpload, PendingCoverChange, StartCoverUploadResponse } from '@/lib/event-covers';
export type CoverEditorTransport = {
  request: typeof fetch;
  transfer: (permission: StartCoverUploadResponse, file: File) => Promise<void>;
};
type Props = { eventId: string | null; title: string; token: string | null; transport: CoverEditorTransport; onPendingChange?: (pending: boolean) => void; onBusyChange?: (busy: boolean) => void; onStateChange?: () => void };
export default function EventCoverEditor({ eventId, title, token, transport, onPendingChange, onBusyChange, onStateChange }: Props) {
  const id = useId();
  const [state, setState] = useState<EventCoverState>(EMPTY_COVER_STATE);
  const [loaded, setLoaded] = useState(!eventId);
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [savedImage, setSavedImage] = useState<{ key: string; url: string } | null>(null);
  const knownState = useRef(EMPTY_COVER_STATE);
  const [altText, setAltText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [uncertain, setUncertain] = useState<PendingCoverChange | null>(null);
  const [observed, setObserved] = useState<EventCoverState | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const focusFileAfterSave = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = useRef(false);
  const active = useRef(true);
  const sequence = useRef(0);
  const changed = !!file || (!!state.cover && normalizeCoverAltText(altText) !== state.cover.altText);
  const base = eventId ? `/api/organizador/eventos/${eventId}/portada` : '';
  useEffect(() => { dirty.current = changed; onPendingChange?.(changed); }, [changed, onPendingChange]);
  useEffect(() => { onBusyChange?.(busy); if (!busy && focusFileAfterSave.current) { focusFileAfterSave.current = false; fileInput.current?.focus(); } }, [busy, onBusyChange]);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);
  useEffect(() => { knownState.current = state; }, [state]);
  async function json<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    if (!token) throw new EventCoverError(401, 'Inicia sesión para guardar la portada. Conservamos tus cambios en este panel.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await transport.request(path, { method, headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store', signal: signal ?? controller.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new EventCoverError(response.status, typeof data?.error === 'string' ? data.error : 'No pudimos completar el cambio de portada.');
      }
      return await response.json() as T;
    } finally { clearTimeout(timer); }
  }
  function displayError(cause: unknown) {
    if (!active.current) return;
    if (cause instanceof EventCoverError) {
      setError(cause.message); if (cause.status === 401) setSessionExpired(true); if (cause.status === 409) setConflict(true);
    } else setError('No pudimos completar el cambio de portada. Conservamos tus cambios; vuelve a intentarlo.');
  }
  async function reload(preserve = true) {
    if (!eventId) { setLoaded(true); return; }
    const current = ++sequence.current;
    try {
      setError(''); setStatus('Cargando portada…');
      const next = await json<EventCoverState>(base);
      if (!active.current || sequence.current !== current) return;
      setState(next); setLoaded(true); setSessionExpired(false); setConflict(false);
      if (!preserve || !dirty.current) setAltText(next.cover?.altText ?? '');
      setStatus(preserve && dirty.current ? 'Portada actualizada. Conservamos tus cambios locales; revísalos antes de guardar.' : '');
    } catch (cause) { displayError(cause); setStatus(''); }
  }
  useEffect(() => {
    if (!eventId) return;
    let live = true;
    void json<EventCoverState>(base).then(next => {
      if (!live) return;
      setLoaded(true); setSessionExpired(false);
      if (dirty.current && knownState.current.coverRevision !== next.coverRevision && knownState.current.coverRevision !== null) {
        setObserved(next); setConflict(true); setStatus('La portada cambió. Actualiza su estado antes de guardar.'); return;
      }
      setState(next);
      if (!dirty.current) setAltText(next.cover?.altText ?? '');
    }).catch(cause => { if (live) displayError(cause); });
    return () => { live = false; };
    // The target and verified session define this subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, token]);
  useEffect(() => {
    const imageId = state.cover?.imageId;
    if (!eventId || !imageId || !token) return;
    let live = true; let url: string | undefined;
    const controller = new AbortController();
    void transport.request(`${base}/imagen/${imageId}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const blob = await response.blob(); if (!live) return;
      url = URL.createObjectURL(blob); setSavedImage({ key: `${eventId}:${imageId}`, url });
    }).catch(() => {});
    return () => { live = false; controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [base, eventId, state.cover?.imageId, token, transport]);
  function accept(next: EventCoverState, message: string) {
    if (!active.current) return;
    setState(next); setAltText(next.cover?.altText ?? ''); setFile(null); setLocalUrl(null); dirty.current = false;
    if (fileInput.current) fileInput.current.value = '';
    setUncertain(null); setObserved(null); setCanRetry(false); setConflict(false); setError(''); setStatus(message);
    heading.current?.focus();
    onStateChange?.();
  }
  async function reconcile(change: PendingCoverChange) {
    setStatus('Consultando el resultado…'); setError(''); setCanRetry(false);
    try {
      if (change.kind === 'upload') {
        const operation = await json<EventCoverUpload>(`${base}/subidas/${change.uploadId}`);
        if (operation.status === 'committed') {
          const later = operation.committedRevision !== operation.state.coverRevision;
          accept(operation.state, later ? 'La subida se guardó y hay una edición posterior. Mostramos la portada actual.' : 'Portada guardada.');
        } else {
          setStatus(operation.status === 'processing' ? 'La portada sigue en proceso. Vuelve a consultar su resultado.' : operation.status === 'pending' ? 'No pudimos confirmar el guardado. Puedes volver a intentarlo.' : 'La subida terminó sin guardarse. Descarta la operación para iniciar otra subida.');
          setObserved(operation.state); setCanRetry(operation.status === 'pending');
        }
      } else {
        const next = await json<EventCoverState>(base); setObserved(next);
        const result = reconcileCoverChange(change, next);
        if (result === 'matching') setStatus(change.kind === 'patch' ? 'La descripción actual coincide con el cambio solicitado.' : 'El evento está sin portada.');
        else if (result === 'retry') { setStatus('No pudimos confirmar el cambio. Puedes volver a intentarlo.'); setCanRetry(true); }
        else { setConflict(true); setStatus('La portada cambió. Revisa el estado actual antes de guardar.'); }
      }
    } catch (cause) { setStatus(''); displayError(cause); }
  }
  async function runChange(change: PendingCoverChange) {
    setBusy(true); setError(''); setStatus(change.kind === 'upload' ? 'Revisando y guardando portada…' : 'Guardando cambio de portada…');
    try {
      if (change.kind === 'upload') {
        const result = await json<ConfirmCoverResponse>(`${base}/subidas/${change.uploadId}/confirmar`, 'POST', { altText });
        accept(result.state, result.committedRevision === result.state.coverRevision ? 'Portada guardada.' : 'La subida se guardó y hay una edición posterior. Mostramos la portada actual.');
      } else {
        const next = await json<EventCoverState>(base, change.kind === 'patch' ? 'PATCH' : 'DELETE', { expectedRevision: change.baseRevision, ...(change.kind === 'patch' ? { altText: change.altText } : {}) });
        accept(next, change.kind === 'patch' ? 'Descripción guardada.' : 'Portada eliminada.');
        if (change.kind === 'delete') focusFileAfterSave.current = true;
      }
    } catch (cause) {
      if (!(cause instanceof EventCoverError) || cause.status >= 500) { setUncertain(change); await reconcile(change); }
      else { displayError(cause); setStatus(''); }
    } finally { if (active.current) setBusy(false); }
  }
  async function saveImage() {
    if (!file || !eventId || busy) return;
    setBusy(true); setError(''); setStatus('Preparando subida…');
    try {
      const permission = await json<StartCoverUploadResponse>(`${base}/subidas`, 'POST', { expectedRevision: state.coverRevision, contentType: file.type, byteLength: file.size });
      setStatus('Subiendo imagen…');
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([transport.transfer(permission, file), new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new EventCoverError(503, 'No pudimos completar la subida. Conservamos tu selección; vuelve a intentarlo.')), 60_000);
        })]);
      } finally { clearTimeout(timer); }
      await runChange({ kind: 'upload', baseRevision: state.coverRevision, uploadId: permission.uploadId });
    } catch (cause) { displayError(cause); setStatus(''); }
    finally { if (active.current) setBusy(false); }
  }
  const disabled = busy || !loaded || sessionExpired || !!uncertain || conflict;
  return <section aria-labelledby={`${id}-heading`} aria-busy={busy} className="space-y-4 border-t border-foreground/10 pt-6">
    <h3 ref={heading} tabIndex={-1} id={`${id}-heading`} className="text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent">Portada del evento (opcional)</h3>
    <Field>
      <FieldLabel htmlFor={`${id}-file`}>Imagen de portada</FieldLabel>
      <FieldDescription tone="readable" id={`${id}-file-help`}>JPEG, PNG o WebP estático. Máximo 5 MiB. Ancho y alto entre 600 y 6000 px. La imagen se recorta desde el centro; parte de los bordes puede quedar fuera.</FieldDescription>
      <Input ref={fileInput} id={`${id}-file`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || !!uncertain} aria-invalid={!!error} aria-describedby={`${id}-file-help${error ? ` ${id}-error` : ''}`} onChange={event => {
        const next = event.target.files?.[0]; if (!next) return;
        if (next.size > MAX_COVER_BYTES || next.size === 0 || !['image/jpeg','image/png','image/webp'].includes(next.type)) { setError('Usa un JPEG, PNG o WebP estático de hasta 5 MiB.'); event.target.value = ''; return; }
        setFile(next); setLocalUrl(URL.createObjectURL(next)); dirty.current = true; setError(''); setStatus('Vista previa sin guardar');
      }} />
    </Field>
    {file && <p className="text-sm wrap-anywhere">{file.name} · Vista previa sin guardar</p>}
    <EventCover previewAltText={altText} cover={state.cover ? { ...state.cover, altText } : null} title={title} previewUrl={localUrl ?? (savedImage?.key === `${eventId}:${state.cover?.imageId}` ? savedImage.url : null)} />
    <Field>
      <FieldLabel htmlFor={`${id}-alt`}>Descripción de la imagen (opcional)</FieldLabel>
      <Textarea id={`${id}-alt`} value={altText} disabled={busy || !!uncertain} aria-describedby={`${id}-alt-help`} onChange={event => { setAltText(event.target.value); dirty.current = true; }} />
      <FieldDescription tone="readable" id={`${id}-alt-help`}>Describe lo que aporta la imagen. Si lo dejas vacío, usaremos el nombre del evento.</FieldDescription>
    </Field>
    <p role="status" className="text-sm leading-5 text-foreground/75">{status || (!loaded ? 'Cargando portada…' : !eventId && file ? 'Crea primero el evento para guardar su portada.' : '')}</p>
    {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    <div className="flex flex-wrap gap-4">
      {file && <Button className="max-w-full" type="button" disabled={disabled || !eventId} onClick={() => void saveImage()}>Guardar portada</Button>}
      {state.cover && !file && <Button className="max-w-full" type="button" disabled={disabled || !changed} onClick={() => void runChange({ kind: 'patch', baseRevision: state.coverRevision, imageId: state.cover!.imageId, altText })}>Guardar descripción</Button>}
      {state.cover && <Button className="max-w-full" type="button" variant="secondary" disabled={disabled} onClick={() => void runChange({ kind: 'delete', baseRevision: state.coverRevision })}>Quitar portada</Button>}
      {(changed || uncertain) && <Button className="max-w-full" type="button" variant="secondary" disabled={busy} onClick={() => accept(observed ?? state, 'Cambios locales descartados.')}>Descartar cambios</Button>}
      {conflict && !uncertain && <Button className="max-w-full" type="button" variant="secondary" disabled={busy} onClick={() => void reload()}>Actualizar portada</Button>}
      {uncertain && <>
        <Button className="max-w-full" type="button" variant="secondary" disabled={busy} onClick={() => { setBusy(true); void reconcile(uncertain).finally(() => setBusy(false)); }}>Volver a consultar</Button>
        {canRetry && <Button className="max-w-full" type="button" disabled={busy || sessionExpired} onClick={() => void runChange(uncertain)}>Volver a intentar</Button>}
        {observed && <Button className="max-w-full" type="button" variant="secondary" disabled={busy} onClick={() => accept(observed, 'Mostramos el estado actual de la portada.')}>Usar estado actual</Button>}
      </>}
      {(!loaded || sessionExpired) && <Button className="max-w-full" type="button" variant="secondary" disabled={busy} onClick={() => void reload()}>Volver a intentar</Button>}
    </div>
  </section>;
}
