import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
// All HTTP is simulated; neither the API nor UI tests connect to a database.
function loadTs(path, overrides = {}, globals = {}) {
  const cache = new Map();
  function load(url) {
    if (cache.has(url.href)) return cache.get(url.href);
    const exports = {};
    cache.set(url.href, exports);
    const source = ts.transpileModule(readFileSync(url, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(source, {
      exports, Request, Response, URL, AbortController, setTimeout, clearTimeout, ...globals,
      require: name => {
        if (Object.hasOwn(overrides, name)) return overrides[name];
        if (name.startsWith("@/") || name.startsWith(".")) {
          const base = name.startsWith("@/") ? new URL(name.slice(2), root) : new URL(name, url);
          return load([".ts", ".tsx"].map(ext => new URL(base.href + ext)).find(candidate => existsSync(candidate)));
        }
        return require(name);
      },
    });
    return exports;
  }
  return load(new URL(path, root));
}
const eventId = "d98afce0-d1e2-4fc9-a5ed-e50d547812da";
const ownerId = "d98afce0-d1e2-4fc9-a5ed-e50d547812db";
const registrationId = "d98afce0-d1e2-4fc9-a5ed-e50d547812dc";
const ticketCode = "a".repeat(64);
const registration = { id: registrationId, name: "Ana Pérez", email: "ana@example.com", ticketType: "General", ticketStatus: "valid", ticketCode, checkedInAt: null };

function handlerFixture({ authenticated = true, owned = true, found = true, ticketStatus = "valid", failure } = {}) {
  const requests = [];
  const client = createClient("https://supabase.test", "publishable-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer owner-token" }, fetch: async (input, init) => {
      const url = new URL(String(input));
      const table = url.pathname.split("/").at(-1);
      requests.push({ url, init });
      assert.equal(new Headers(init.headers).get("authorization"), "Bearer owner-token");
      assert.equal(init.method, "GET", "Searching must never mutate a ticket");
      if (failure === table) return Response.json({ message: "SECRET provider detail" }, { status: 500 });
      if (table === "events") {
        assert.equal(url.searchParams.get("id"), `eq.${eventId}`);
        assert.equal(url.searchParams.get("owner_id"), `eq.${ownerId}`);
        assert.equal(url.searchParams.get("status"), "eq.published");
        return Response.json(owned ? [{ id: eventId }] : []);
      }
      assert.equal(table, "registrations");
      assert.equal(url.searchParams.get("event_id"), `eq.${eventId}`);
      assert.equal(url.searchParams.get("email"), "eq.ana@example.com");
      assert.equal(url.searchParams.has("or"), false);
      return Response.json(found ? [{
        id: registrationId, name: registration.name, email: registration.email,
        ticket_types: { name: "General" }, tickets: ticketStatus ? { code: ticketCode, status: ticketStatus, checked_in_at: ticketStatus === "used" ? "2026-11-18T20:00:00Z" : null } : null,
      }] : []);
    } },
  });
  const { POST } = loadTs("app/api/organizador/check-in/buscar/route.ts", {
    "@/lib/supabase/organizer": { authenticateOrganizer: async () => authenticated ? { client, userId: ownerId } : null },
  });
  return { requests, post: (body = { eventId, email: " ANA@EXAMPLE.COM " }) => POST(new Request("https://door.test/api/organizador/check-in/buscar", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  })) };
}

test("email lookup normalizes exact email, scopes owner and event, and never checks in", async () => {
  const h = handlerFixture();
  const response = await h.post();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), { registration });
  assert.equal(h.requests.length, 2);
});
test("unauthenticated, malformed, foreign-event and missing lookups have safe HTTP errors", async () => {
  for (const [options, expected, count] of [[{ authenticated: false }, 401, 0], [{ owned: false }, 403, 1], [{ found: false }, 404, 2], [{ failure: "events" }, 503, 1], [{ failure: "registrations" }, 503, 2]]) {
    const h = handlerFixture(options);
    const response = await h.post();
    assert.equal(response.status, expected);
    assert.deepEqual(Object.keys(await response.json()), ["error"]);
    assert.equal(h.requests.length, count);
  }
  const h = handlerFixture();
  for (const body of [{ eventId, email: "ana" }, { eventId: "bad", email: "ana@example.com" }, null]) assert.equal((await h.post(body)).status, 400);
  assert.equal(h.requests.length, 0);
});
test("used, revoked and absent tickets cannot expose an actionable ticket code", async () => {
  for (const ticketStatus of ["used", "revoked", null]) {
    const response = await handlerFixture({ ticketStatus }).post();
    const body = await response.json();
    assert.equal(body.registration.ticketStatus, ticketStatus);
    assert.equal(body.registration.ticketCode, null);
  }
});

// UI behavior is covered with real React Hook Form in e2e/forms-ui.spec.mjs.

test("email search normalizes input and reports Spanish field errors", () => {
  const { emailTicketSearchRequestSchema } = loadTs("lib/check-in-email.ts");
  assert.equal(emailTicketSearchRequestSchema.parse({ eventId, email: " ANA@EXAMPLE.COM " }).email, "ana@example.com");
  assert.match(emailTicketSearchRequestSchema.safeParse({ eventId, email: "bad" }).error.issues[0].message, /email completo/);
});
