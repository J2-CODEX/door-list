import type { ScanResult as ScanResultData } from "@/lib/check-in";
import { formatEventDate } from "@/lib/dates";

export function ScanResult({ result }: { result: ScanResultData }) {
  const valid = result.status === "valid";
  const title = valid ? "Válida" : result.status === "used" ? "Usada" : result.status === "notFound" ? "No encontrada" : "Sin confirmar";
  return <section className="scan-result" data-status={result.status} role="status" aria-live="assertive" aria-atomic="true">
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      {valid ? <path d="m14 24 7 7 14-15" /> : result.status === "notFound" ? <path d="m17 17 14 14m0-14L17 31" /> : <path d="M24 13v13m0 8h.01" />}
    </svg>
    <h2 className="scan-result-title">{title}</h2>
    <p className="scan-result-action">{valid ? "Puede ingresar" : result.status === "error" ? "No autorices el ingreso todavía" : "No permitir ingreso"}</p>
    {valid ? <div className="scan-result-detail">
      <p className="text-2xl font-semibold wrap-anywhere">{result.name}</p>
      <p className="mt-2 wrap-anywhere">{result.ticketType}</p>
      <p className="mt-4 text-sm">Check-in registrado · <time dateTime={result.checkedInAt}>{formatEventDate(result.checkedInAt)}</time></p>
    </div> : <p className="scan-result-detail">{result.status === "used" ? "Esta entrada ya registró un ingreso." : result.status === "notFound" ? "El código no corresponde a una entrada habilitada para este evento. Revisa el evento y el código." : result.message}</p>}
  </section>;
}
