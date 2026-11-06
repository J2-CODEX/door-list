import QRCode from "qrcode";
import { createHash } from "node:crypto";
import type { PublicTicket } from "../tickets";

const qrContentId = "door-list-ticket-qr";

export function getTicketEmailConfig(env: {
  NODE_ENV?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_TEST_TO_EMAIL?: string;
}) {
  return {
    apiKey: env.RESEND_API_KEY ?? "",
    from: env.RESEND_FROM_EMAIL ?? "",
    to: env.NODE_ENV === "development" ? env.RESEND_TEST_TO_EMAIL?.trim() || undefined : undefined,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export async function buildTicketEmail(ticket: PublicTicket, from: string) {
  const date = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", dateStyle: "long", timeStyle: "short", hourCycle: "h23" }).format(new Date(ticket.event.starts_at));
  const qr = await QRCode.toBuffer(ticket.code, { type: "png", errorCorrectionLevel: "M", margin: 4, width: 360 });
  const details = [["Evento", ticket.event.title], ["Cuándo", date], ["Dónde", ticket.event.venue], ["Asistente", ticket.name], ["Tipo de entrada", ticket.ticketType]];
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Tu entrada está confirmada</title></head>
<body style="margin:0;padding:0;background-color:#f6f5f0;color:#18372c;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Tu lugar está confirmado. Aquí tienes los detalles y el QR de tu entrada.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f6f5f0;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 8px 24px;font-size:24px;font-weight:bold;letter-spacing:-1px;">door list<span style="color:#719148;">.</span></td></tr>
<tr><td style="padding:32px 24px;background-color:#ffffff;border:1px solid #dce1d8;border-radius:20px;">
<p style="margin:0 0 16px;font-size:12px;font-weight:bold;letter-spacing:2px;color:#527436;">TU PRÓXIMO ENCUENTRO</p>
<h1 style="margin:0 0 16px;font-size:30px;line-height:1.2;letter-spacing:-1px;">¡Tu lugar está confirmado!</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;overflow-wrap:anywhere;">Hola, ${escapeHtml(ticket.name)}. Ya tienes tu entrada para conectar y compartir. ¡Nos vemos pronto!</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;">
${details.map(([label, value]) => `<tr><td style="padding:0 0 20px;overflow-wrap:anywhere;word-break:break-word;"><p style="margin:0 0 5px;font-size:13px;color:#60756b;">${label}</p><p style="margin:0;font-size:16px;font-weight:bold;line-height:1.5;">${escapeHtml(value)}</p></td></tr>`).join("")}
</table>
<p style="margin:0 0 24px;font-size:12px;color:#60756b;">Hora de Ecuador continental · UTC−5</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 12px;background-color:#e9eedf;border-radius:16px;">
<h2 style="margin:0 0 8px;font-size:20px;">Tu pase al encuentro</h2>
<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Presenta este QR al llegar al evento.</p>
<img src="cid:${qrContentId}" alt="Código QR de tu entrada. Si no se muestra, revisa la imagen adjunta entrada-qr.png." width="280" height="280" style="display:block;width:100%;max-width:280px;height:auto;margin:0 auto;border:0;background-color:#ffffff;border-radius:12px;">
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;">Guarda este correo para tener tu entrada a mano.</p>
</td></tr></table>
<p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#60756b;">Tu QR es personal: evita compartirlo. El estado de tu entrada se valida al ingresar.</p>
</td></tr>
<tr><td style="padding:24px 8px;font-size:12px;line-height:1.7;color:#60756b;">Un encuentro empieza con un lugar para ti.<br>door list.</td></tr>
</table></td></tr></table></body></html>`;

  return {
    from,
    to: [ticket.email],
    subject: `Tu entrada para ${ticket.event.title.replace(/[\r\n]/g, " ")} | Door List`,
    html,
    text: `¡Tu lugar está confirmado!\n\nHola, ${ticket.name}.\n\n${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\nHora de Ecuador continental · UTC−5\n\nPresenta la imagen QR adjunta al llegar.\nCódigo de la entrada: ${ticket.code}\n\nTu QR es personal: evita compartirlo.`,
    attachments: [{ filename: "entrada-qr.png", content: qr.toString("base64"), content_type: "image/png", content_id: qrContentId }],
  };
}

/** Resend acceptance is not a guarantee of inbox delivery. Never log payloads or credentials. */
export async function sendTicketEmail(ticket: PublicTicket, config: { apiKey: string; from: string; to?: string }, request: typeof fetch = fetch) {
  if (!config.apiKey.trim() || !config.from.trim()) throw new Error("Email configuration missing");
  const payload = await buildTicketEmail(ticket, config.from);
  payload.to = [config.to ?? ticket.email];
  // Same ticket and content share a key, including after an ambiguous network failure.
  const key = `ticket-email/${createHash("sha256").update(ticket.code).update(JSON.stringify(payload)).digest("hex")}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await request("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data.id === "string" && data.id) return;
        throw new Error("Email provider response invalid");
      }
      if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
      // Do not propagate Resend's response: it can include recipient information.
      throw new Error("Email provider rejected request");
    } catch (error) {
      if (attempt === 0 && error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError" || error instanceof TypeError)) continue;
      throw new Error("Email could not be sent");
    }
  }
}
