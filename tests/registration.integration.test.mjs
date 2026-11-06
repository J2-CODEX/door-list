import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
// Opt-in only: requires an isolated published future event with one ticket of capacity 1,
// no existing registrations, and explicit user approval before running database tests.
const enabled = process.env.RUN_REGISTRATION_DB_TESTS === "1";
test("anonymous registration serializes the last seat and protects attendee data", { skip: !enabled }, async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const eventId = process.env.TEST_REGISTRATION_EVENT_ID;
  const ticketId = process.env.TEST_REGISTRATION_TICKET_ID;
  assert.ok(url && key && eventId && ticketId, "Configure isolated test fixture and Supabase variables");
  async function rpc(name, body) {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(response.ok, true, await response.clone().text());
    return response.json();
  }
  const emails = [0, 1].map(() => `test-${randomUUID()}@example.com`);
  const payload = email => ({ p_event_id: eventId, p_ticket_type_id: ticketId, p_name: "Prueba de concurrencia", p_email: email });
  const before = await rpc("get_public_registration_event", { p_event_id: eventId });
  assert.equal(before.tickets.find(t => t.id === ticketId)?.available, 1);
  const results = await Promise.all(emails.map(email => rpc("register_attendee", payload(email))));
  assert.deepEqual(results.map(r => r.code).sort(), ["SUCCESS", "TICKET_UNAVAILABLE"]);
  const winner = emails[results.findIndex(r => r.code === "SUCCESS")];
  const issued = results.find(r => r.code === "SUCCESS");
  assert.match(issued.ticketCode, /^[0-9a-f]{64}$/);
  assert.equal(results.find(r => r.code !== "SUCCESS").ticketCode, undefined);
  const publicTicket = await rpc("get_public_ticket", { p_code: issued.ticketCode });
  assert.equal(publicTicket.email, winner);
  assert.equal(publicTicket.status, "valid");
  assert.equal((await rpc("get_public_ticket", { p_code: issued.ticketCode })).status, "valid", "Opening a ticket does not consume it");
  assert.equal(await rpc("get_public_ticket", { p_code: "1" }), null);
  assert.equal(await rpc("get_public_ticket", { p_code: "0".repeat(64) }), null);
  const ticketList = await fetch(`${url}/rest/v1/tickets?select=*`, { headers: { apikey: key } });
  assert.equal(ticketList.ok, false, "No anonymous listing of access codes");

  assert.equal((await rpc("register_attendee", payload(winner.toUpperCase()))).code, "DUPLICATE");
  const after = await rpc("get_public_registration_event", { p_event_id: eventId });
  assert.equal(after.tickets.find(t => t.id === ticketId)?.available, 0);
  assert.equal(JSON.stringify(after).includes(winner), false);
  const privateData = await fetch(`${url}/rest/v1/registrations?select=*`, { headers: { apikey: key } });
  assert.equal(privateData.ok, false, "Anonymous clients must not read registrations");
});
