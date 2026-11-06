import assert from "node:assert/strict";
import test from "node:test";
import { ticketCodeSchema, publicTicketSchema, ticketStatuses } from "../lib/tickets.ts";
const code = "a".repeat(64);
const ticket = { code, status: "valid", name: "Ana", email: "ana@example.com", event: { title: "Encuentro", starts_at: "2026-11-21T17:00:00-05:00", venue: "Casa" }, ticketType: "General" };
test("public lookup accepts only complete canonical codes", () => {
  assert.equal(ticketCodeSchema.safeParse(code).success, true);
  for (const value of ["1", "a".repeat(63), "a".repeat(65), "A".repeat(64), ` ${code}`, "../", "00000000-0000-4000-8000-000000000000", "g".repeat(64)]) {
    assert.equal(ticketCodeSchema.safeParse(value).success, false);
  }
});
test("ticket data and UI recognize exactly the three persisted states", () => {
  for (const status of ["valid", "used", "revoked"]) {
    assert.equal(publicTicketSchema.safeParse({ ...ticket, status }).success, true);
    assert.ok(ticketStatuses[status].label);
  }
  assert.equal(publicTicketSchema.safeParse({ ...ticket, status: "unknown" }).success, false);
  assert.equal(publicTicketSchema.safeParse({ ...ticket, code: "1" }).success, false);
  assert.equal(publicTicketSchema.safeParse({ ...ticket, event: null }).success, false);
});
test("QR is generated locally as PNG from the ticket code", async () => {
  const { default: QRCode } = await import("qrcode");
  const qr = QRCode.create(code, { errorCorrectionLevel: "M" });
  assert.equal(qr.segments.map(segment => Buffer.from(segment.data).toString("utf8")).join(""), code);
  const uri = await QRCode.toDataURL(code, { errorCorrectionLevel: "M", margin: 4, width: 360 });
  assert.ok(uri.startsWith("data:image/png;base64,"));
  const png = Buffer.from(uri.split(",")[1], "base64");
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), 360);
  assert.equal(png.readUInt32BE(20), 360);
});
