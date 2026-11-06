import assert from "node:assert/strict";
import test from "node:test";
import QRCode from "qrcode";
import { buildTicketEmail, sendTicketEmail } from "../lib/email/ticket-email.ts";

const ticket = { code: "a".repeat(64), status: "valid", name: 'Ana <img src=x onerror="alert(1)">', email: "ana@example.com", event: { title: "Encuentro & comunidad", starts_at: "2026-11-22T02:00:00Z", venue: "Casa <Norte>" }, ticketType: "General" };
const config = { apiKey: "test-key", from: "Door List <entradas@example.com>" };

test("HTML escapes event/attendee data and embeds the correct QR in the email", async () => {
  const payload = await buildTicketEmail(ticket, config.from);
  assert.deepEqual(payload.to, [ticket.email]);
  assert.equal(payload.from, config.from);
  assert.ok(payload.html.includes("Encuentro &amp; comunidad"));
  assert.ok(payload.html.includes("Casa &lt;Norte&gt;"));
  assert.ok(payload.html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  assert.ok(!payload.html.includes('<img src=x'));
  assert.match(payload.html, /21 de noviembre de 2026/); // UTC−5, previous local day.
  assert.ok(payload.html.includes("21:00"));
  assert.ok(payload.html.includes(`src="cid:${payload.attachments[0].content_id}"`));
  assert.ok(!payload.html.includes('src="https://'));
  assert.ok(!payload.html.includes("data:image"));
  const png = Buffer.from(payload.attachments[0].content, "base64");
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  const expected = await QRCode.toBuffer(ticket.code, { type: "png", errorCorrectionLevel: "M", margin: 4, width: 360 });
  assert.deepEqual(png, expected);
  assert.ok(payload.text.includes(ticket.code));
  assert.ok(payload.text.includes(ticket.event.venue));
});

test("retries transient failures with identical idempotency key and body", async () => {
  const calls = [];
  await sendTicketEmail(ticket, config, async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? new Response(null, { status: 503 }) : Response.json({ id: "email-test" });
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-key");
  assert.equal(calls[0].options.headers["Idempotency-Key"], calls[1].options.headers["Idempotency-Key"]);
  assert.ok(!calls[0].options.headers["Idempotency-Key"].includes(ticket.code));
  assert.equal(calls[0].options.body, calls[1].options.body);
  assert.deepEqual(JSON.parse(calls[0].options.body).to, [ticket.email]);
});

test("retries ambiguous network failures without issuing another email payload", async () => {
  const calls = [];
  await sendTicketEmail(ticket, config, async (_url, options) => {
    calls.push(options);
    if (calls.length === 1) throw new TypeError("network unavailable");
    return Response.json({ id: "email-test" });
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers["Idempotency-Key"], calls[1].headers["Idempotency-Key"]);
});

test("rejects missing configuration without contacting Resend", async () => {
  await assert.rejects(sendTicketEmail(ticket, { ...config, apiKey: "" }, async () => assert.fail("must not call Resend")), /configuration missing/);
});

test("does not retry permanent errors or expose provider/recipient details", async () => {
  let calls = 0;
  await assert.rejects(sendTicketEmail(ticket, config, async () => {
    calls++;
    return Response.json({ message: `Private details: ${ticket.email}` }, { status: 403 });
  }), error => error.message === "Email could not be sent");
  assert.equal(calls, 1);
});

test("bounds attempts for persistent provider failure and rejects malformed acceptance", async () => {
  let calls = 0;
  await assert.rejects(sendTicketEmail(ticket, config, async () => {
    calls++;
    return new Response(null, { status: 500 });
  }), /Email could not be sent/);
  assert.equal(calls, 2);
  await assert.rejects(sendTicketEmail(ticket, config, async () => Response.json({})), /Email could not be sent/);
});
