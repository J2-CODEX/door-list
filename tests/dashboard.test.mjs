import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

// Isolate the data layer and handlers: no network or database access.
function loadModule(path, dependencies, env = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (name === "server-only") return {};
    assert.ok(name in dependencies, `Unexpected import: ${name}`);
    return dependencies[name];
  }, process: { env }, Response, URL });
  return exports;
}
const eventId = "d98afce0-d1e2-4fc9-a5ed-e50d547812da";
const params = { params: Promise.resolve({ eventId }) };
const request = () => new Request(`http://localhost/api/organizador/eventos/${eventId}`);
const dashboard = { registrationPageSize: 25 };
function detailHandler(auth, events) {
  return loadModule("../app/api/organizador/eventos/[eventId]/route.ts", {
    zod: { z }, "@/lib/supabase/organizer": { authenticateOrganizer: auth },
    "@/lib/organizer-events": { loadOrganizerEvents: events }, "@/lib/dashboard": dashboard,
  }).GET;
}

test("detail rejects unauthenticated requests before reading events or registrations", async () => {
  const handler = detailHandler(async () => null, () => assert.fail("Must not query events"));
  const response = await handler(request(), params);
  assert.equal(response.status, 401);
  assert.equal(typeof (await response.json()).error, "string");
});
test("a non-owner cannot read registrations, including for a published event", async () => {
  const client = { from: () => assert.fail("Must not query registrations") };
  const handler = detailHandler(async () => ({ client, userId: "other-owner" }), async (_client, owner, id) => {
    assert.equal(owner, "other-owner"); assert.equal(id, eventId); return [];
  });
  const response = await handler(request(), params);
  assert.equal(response.status, 404);
});
test("invalid ids and filters return business errors", async () => {
  const handler = detailHandler(async () => ({ client: { from: () => assert.fail("Invalid filter must not query registrations") }, userId: "owner" }), async () => [{ ticketTypes: [] }]);
  assert.equal((await handler(request(), { params: Promise.resolve({ eventId: "invalid" }) })).status, 404);
  for (const query of ["page=0", "page=1.5", "page=1000001", "ticketTypeId=unknown"]) {
    assert.equal((await handler(new Request(`http://localhost/?${query}`), params)).status, 400);
  }
});
test("server event query always filters by owner and preserves exact counts beyond row limits", async () => {
  const calls = [];
  const query = {
    select: value => { calls.push(["select", value]); return query; },
    eq: (...args) => { calls.push(["eq", ...args]); return query; },
    order: () => query,
    then: resolve => resolve({ data: [{ id: eventId, title: "Event", starts_at: "date", registrations: [{ count: 2501 }], ticket_types: [{ id: "type", name: "General", capacity: 3000, registrations: [{ count: 2501 }] }] }], error: null }),
  };
  const { loadOrganizerEvents } = loadModule("../lib/organizer-events.ts", {});
  const [event] = await loadOrganizerEvents({ from: name => { assert.equal(name, "events"); return query; } }, "owner", eventId);
  assert.ok(calls.some(call => call.join() === "eq,owner_id,owner"));
  assert.ok(calls.some(call => call.join() === `eq,id,${eventId}`));
  assert.equal(event.registrationCount, 2501);
  assert.equal(event.ticketTypes[0].registrationCount, 2501);
  assert.ok(!("starts_at" in event));
});
test("owner receives paginated camelCase attendee data with private no-store caching", async () => {
  const calls = [];
  const query = {};
  for (const method of ["select", "eq", "order", "range", "or"]) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  query.then = resolve => resolve({ data: [{ id: "registration", name: "Ana", email: "ana@example.com", ticket_type_id: "type", created_at: "date" }], count: 51, error: null });
  const handler = detailHandler(async () => ({ client: { from: name => { assert.equal(name, "registrations"); return query; } }, userId: "owner" }), async () => [{ id: eventId, ticketTypes: [{ id: "type" }] }]);
  const response = await handler(new Request("http://localhost/?page=2&ticketTypeId=type&search=Ana"), params);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const body = await response.json();
  assert.equal(body.total, 51);
  assert.equal(body.registrations[0].ticketTypeId, "type");
  assert.ok(!("ticket_type_id" in body.registrations[0]));
  assert.ok(calls.some(call => call.join() === "range,25,49"));
  assert.ok(calls.some(call => call.join() === `eq,event_id,${eventId}`));
});
test("authentication validates bearer tokens with Supabase instead of trusting client session data", async () => {
  let tokenChecked;
  const { authenticateOrganizer } = loadModule("../lib/supabase/organizer.ts", { "@supabase/supabase-js": { createClient: (_url, _key, options) => {
    assert.equal(options.auth.persistSession, false);
    assert.equal(options.global.headers.Authorization, "Bearer expired");
    return { auth: { getUser: async token => { tokenChecked = token; return { data: { user: null }, error: { message: "expired" } }; } } };
  } } }, { NEXT_PUBLIC_SUPABASE_URL: "http://mock", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "mock" });
  assert.equal(await authenticateOrganizer(request()), null);
  assert.equal(await authenticateOrganizer(new Request("http://localhost", { headers: { Authorization: "Bearer expired" } })), null);
  assert.equal(tokenChecked, "expired");
});

test("dashboard server guard redirects absent, forged and expired sessions before rendering", async () => {
  for (const token of [undefined, "forged", "expired"]) {
    const { requireDashboardSession } = loadModule("../lib/supabase/dashboard-session.ts", {
      "next/headers": { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
      "next/navigation": { redirect: destination => { throw new Error(`REDIRECT:${destination}`); } },
      "./organizer": { authenticateOrganizerToken: async received => { assert.equal(received, token); return null; } },
    });
    await assert.rejects(requireDashboardSession, /REDIRECT:\/iniciar-sesion/);
  }
});
test("dashboard server guard allows only a server-validated Supabase session", async () => {
  const user = { userId: "owner", email: "owner@example.com" };
  const { requireDashboardSession } = loadModule("../lib/supabase/dashboard-session.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "valid" }) }) },
    "next/navigation": { redirect: () => assert.fail("Valid user should not redirect") },
    "./organizer": { authenticateOrganizerToken: async token => { assert.equal(token, "valid"); return user; } },
  });
  assert.equal(await requireDashboardSession(), user);
});
test("server guard denies access when Auth validation is unavailable", async () => {
  const { requireDashboardSession } = loadModule("../lib/supabase/dashboard-session.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "unverified" }) }) },
    "next/navigation": { redirect: destination => { throw new Error(`REDIRECT:${destination}`); } },
    "./organizer": { authenticateOrganizerToken: async () => { throw new Error("Provider error"); } },
  });
  await assert.rejects(requireDashboardSession, /REDIRECT:\/iniciar-sesion/);
});
function sessionHandler(auth, writes) {
  return loadModule("../app/api/organizador/sesion/route.ts", {
    "next/headers": { cookies: async () => ({ set: (...args) => writes.push(args) }) },
    "@/lib/supabase/organizer": { authenticateOrganizer: auth },
    "@/lib/supabase/dashboard-session": { organizerCookieName: "door-list-organizer" },
  }, { NODE_ENV: "production" });
}
test("session endpoint sets an HttpOnly cookie only after validating the credentials token", async () => {
  const writes = [];
  const denied = sessionHandler(async () => null, writes);
  assert.equal((await denied.POST(request())).status, 401);
  assert.equal(writes.length, 0);
  const allowed = sessionHandler(async () => ({ userId: "owner", email: "owner@example.com" }), writes);
  const response = await allowed.POST(new Request("https://example.com/api/organizador/sesion", { method: "POST", headers: { Authorization: "Bearer valid" } }));
  assert.equal(response.status, 200);
  assert.equal(writes[0][1], "valid");
  assert.equal(writes[0][2].httpOnly, true);
  assert.equal(writes[0][2].secure, true);
  assert.equal(writes[0][2].sameSite, "lax");
});
test("logout removes the server cookie and rejects cross-origin requests", async () => {
  const writes = [];
  const { DELETE } = sessionHandler(() => assert.fail("Logout must not query Auth"), writes);
  const response = await DELETE(new Request("https://example.com/api/organizador/sesion", { method: "DELETE", headers: { Origin: "https://example.com" } }));
  assert.equal(response.status, 204);
  assert.equal(writes[0][2].maxAge, 0);
  const crossOrigin = await DELETE(new Request("https://example.com/api/organizador/sesion", { method: "DELETE", headers: { Origin: "https://evil.example" } }));
  assert.equal(crossOrigin.status, 403);
  assert.equal(writes.length, 1);
});
