import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import * as contracts from "../lib/ticket-resend.ts";
import { publicTicketSchema } from "../lib/tickets.ts";

// All network transports are fake: no database or email provider is contacted.
function load(path, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, Response, AbortController, process: { env: {} }, ...globals, require(name) {
    assert.ok(name in dependencies, `Unexpected import ${name}`); return dependencies[name];
  } });
  return exports;
}
const eventId = "d98afce0-d1e2-4fc9-a5ed-e50d547812da";
const registrationId = "d98afce0-d1e2-4fc9-a5ed-e50d547812db";
const ownerId = "d98afce0-d1e2-4fc9-a5ed-e50d547812dc";
const requestId = "d98afce0-d1e2-4fc9-a5ed-e50d547812dd";
const ticketCode = "a".repeat(64);
function fixture({ authenticated = true, ownsEvent = true, hasRegistration = true, status = "valid", failure, emailFailure = false } = {}) {
  const queries = [], emails = [];
  const client = createClient("https://supabase.test", "publishable-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer owner-token" }, fetch: async (input, options) => {
      const url = new URL(String(input));
      const table = url.pathname.split("/").at(-1);
      queries.push(url);
      assert.equal(new Headers(options.headers).get("authorization"), "Bearer owner-token");
      if (failure === table) return Response.json({ message: "SECRET provider detail" }, { status: 500 });
      if (table === "events") {
        assert.equal(url.searchParams.get("owner_id"), `eq.${ownerId}`);
        assert.equal(url.searchParams.get("id"), `eq.${eventId}`);
        return Response.json(ownsEvent ? [{ title: "Encuentro", starts_at: "2026-12-01T20:00:00Z", venue: "Casa" }] : []);
      }
      assert.equal(table, "registrations");
      assert.equal(url.searchParams.get("id"), `eq.${registrationId}`);
      assert.equal(url.searchParams.get("event_id"), `eq.${eventId}`);
      return Response.json(hasRegistration ? [{ name: "Ana", email: "ana@example.com", tickets: { code: ticketCode, status }, ticket_types: { name: "General" } }] : []);
    } },
  });
  const { POST } = load("app/api/organizador/eventos/[eventId]/registros/[registrationId]/reenviar-entrada/route.ts", {
    zod: { z }, "@/lib/tickets": { publicTicketSchema }, "@/lib/ticket-resend": contracts,
    "@/lib/supabase/organizer": { authenticateOrganizer: async () => authenticated ? { client, userId: ownerId } : null },
    "@/lib/email/ticket-email": { getTicketEmailConfig: () => ({}), sendTicketEmail: async (ticket, _config, _fetch, options) => {
      if (emailFailure) throw new Error("SECRET provider detail");
      emails.push({ ticket, options });
    } },
  }, { fetch: () => assert.fail("Unexpected live fetch") });
  return { queries, emails, post: (body = { requestId }, ids = { eventId, registrationId }) => POST(new Request("https://app.test/resend", {
    method: "POST", headers: { Authorization: "Bearer owner-token", "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve(ids) }) };
}
test("resend derives recipient and original QR from an owner-scoped registration", async () => {
  const h = fixture();
  const response = await h.post();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { emailStatus: "sent" });
  assert.equal(h.emails.length, 1);
  assert.equal(h.emails[0].ticket.email, "ana@example.com");
  assert.equal(h.emails[0].ticket.code, ticketCode);
  assert.equal(h.emails[0].options.deliveryId, requestId);
  assert.ok(!JSON.stringify(body).includes(ticketCode));
});
test("anonymous, wrong-owner and wrong-event registrations cannot send mail", async () => {
  for (const [options, status, queryCount] of [[{ authenticated: false }, 401, 0], [{ ownsEvent: false }, 404, 1], [{ hasRegistration: false }, 404, 2]]) {
    const h = fixture(options);
    assert.equal((await h.post()).status, status);
    assert.equal(h.queries.length, queryCount);
    assert.equal(h.emails.length, 0);
  }
});
test("invalid requests cannot change the recipient, code or event", async () => {
  const h = fixture();
  for (const body of [{}, { requestId: "invalid" }, { requestId, email: "other@example.com" }, { requestId, ticketCode }]) {
    assert.equal((await h.post(body)).status, 400);
  }
  assert.equal((await h.post({ requestId }, { eventId: "bad", registrationId })).status, 404);
  assert.equal(h.queries.length, 0);
  assert.equal(h.emails.length, 0);
});
test("used and revoked tickets return conflict without sending", async () => {
  for (const status of ["used", "revoked"]) {
    const h = fixture({ status });
    assert.equal((await h.post()).status, 409);
    assert.equal(h.emails.length, 0);
  }
});
test("database and provider failures produce safe errors with non-200 statuses", async () => {
  for (const [options, status] of [[{ failure: "events" }, 500], [{ failure: "registrations" }, 500], [{ emailFailure: true }, 502]]) {
    const response = await fixture(options).post();
    assert.equal(response.status, status);
    const body = await response.json();
    assert.deepEqual(Object.keys(body), ["error"]);
    assert.ok(!body.error.includes("SECRET"));
  }
});

const jsx = await import("react/jsx-runtime");
function buttonFixture() {
  let cursor = 0, uuidCount = 0;
  const state = [], refs = [], requests = [];
  const { ResendTicketButton } = load("app/dashboard/eventos/[eventId]/asistentes/resend-ticket-button.tsx", {
    react: {
      useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; },
      useRef(initial) { const i = cursor++; refs[i] ??= { current: initial }; return refs[i]; }, useEffect() {},
    }, "react/jsx-runtime": jsx, "@/components/dashboard-session": { useDashboardToken: () => "owner-token" },
    "@/components/ui/button": { Button: "button" }, "@/components/ui/notice": { Notice: "notice" }, "@/lib/ticket-resend": contracts,
  }, { crypto: { randomUUID: () => `request-${++uuidCount}` }, fetch: (_url, options) => new Promise(resolve => requests.push({ options, resolve })) });
  return { requests, render(ticketStatus = "valid") {
    cursor = 0;
    return ResendTicketButton({ eventId, registration: { id: registrationId, name: "Ana", email: "ana@example.com", ticketStatus } });
  } };
}
const button = tree => tree.props.children[0];
test("row action prevents double clicks, checks HTTP status and retains a retry's delivery ID", async () => {
  const h = buttonFixture();
  const action = button(h.render()).props.onClick;
  const first = action();
  await action();
  assert.equal(h.requests.length, 1);
  assert.equal(button(h.render()).props.disabled, true);
  h.requests[0].resolve({ ok: false, status: 502, json() { assert.fail("Error bodies must not be interpreted"); } });
  await first;
  assert.equal(h.render().props.children[2].props.role, "alert");
  const retry = button(h.render()).props.onClick();
  assert.equal(h.requests[0].options.body, h.requests[1].options.body);
  assert.equal(h.requests[1].options.headers.Authorization, "Bearer owner-token");
  h.requests[1].resolve(Response.json({ emailStatus: "sent" }));
  await retry;
  assert.match(h.render().props.children[3].props.children, /Reenvío solicitado/);
  const next = button(h.render()).props.onClick();
  assert.notEqual(h.requests[1].options.body, h.requests[2].options.body);
  h.requests[2].resolve(Response.json({ emailStatus: "sent" }));
  await next;
});
test("unavailable tickets keep a disabled row action with a visible reason", () => {
  for (const status of ["used", "revoked", null]) {
    const tree = buttonFixture().render(status);
    assert.equal(button(tree).props.disabled, true);
    assert.equal(typeof tree.props.children[1].props.children, "string");
  }
});
