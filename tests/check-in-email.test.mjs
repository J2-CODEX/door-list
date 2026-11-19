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

function uiHarness() {
  const state = [], requests = [], validated = [];
  let cursor = 0, cleanup;
  const { EmailTicketSearch } = loadTs("app/scan/email-ticket-search.tsx", {
    react: {
      useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; },
      useRef(initial) { const index = cursor++; return state[index] ??= { current: initial }; },
      useEffect(fn) { cleanup ??= fn(); },
    },
    "@/components/ui/button": { Button: "button" }, "@/components/ui/input": { Input: "input" },
    "@/components/ui/field": { Field: "div", FieldLabel: "label", FieldDescription: "p", FieldError: "error" },
    "@/components/dashboard-session": { useDashboardToken: () => "owner-token" },
  }, { fetch: (url, init) => new Promise(resolve => requests.push({ url, init, resolve })) });
  function nodes(tree) {
    if (!tree || typeof tree !== "object") return [];
    const children = tree.props?.children;
    return [tree, ...(Array.isArray(children) ? children.flat(Infinity) : [children]).flatMap(nodes)];
  }
  const h = {
    requests, validated,
    render: () => { cursor = 0; return EmailTicketSearch({ eventId, onValidate: code => validated.push(code) }); },
    find: (type, text) => nodes(h.render()).find(node => node.type === type && (!text || node.props.children === text)),
    change: email => h.find("input").props.onChange({ target: { value: email } }),
    submit: () => h.find("form").props.onSubmit({ preventDefault() {} }),
    unmount: () => cleanup(),
  };
  return h;
}
test("email search authenticates, prevents duplicate requests and requires a separate admission action", async () => {
  const h = uiHarness(); h.change(" ANA@EXAMPLE.COM ");
  const pending = h.submit(); await h.submit();
  assert.equal(h.requests.length, 1);
  assert.equal(h.find("button", "Buscando asistente…").props.disabled, true);
  assert.equal(h.requests[0].init.headers.Authorization, "Bearer owner-token");
  assert.deepEqual(JSON.parse(h.requests[0].init.body), { eventId, email: "ana@example.com" });
  h.requests[0].resolve(Response.json({ registration })); await pending;
  assert.deepEqual(h.validated, []);
  const confirm = h.find("button", "Registrar ingreso");
  assert.equal(confirm.props.disabled, false);
  confirm.props.onClick();
  assert.deepEqual(h.validated, [ticketCode]);
  h.change("other@example.com");
  assert.equal(h.find("button", "Registrar ingreso").props.disabled, true);
});
test("search errors check HTTP status before the body and disable stale admission", async () => {
  const h = uiHarness(); h.change(registration.email);
  let pending = h.submit(); h.requests[0].resolve(Response.json({ registration })); await pending;
  pending = h.submit();
  assert.equal(h.find("button", "Registrar ingreso").props.disabled, true);
  h.requests[1].resolve({ ok: false, status: 503, json() { assert.fail("Must not parse provider errors"); } }); await pending;
  assert.match(h.find("error").props.children, /Revisa la conexión/);
  assert.equal(h.find("button", "Registrar ingreso").props.disabled, true);
  pending = h.submit(); h.requests[2].resolve({ ok: false, status: 404, json() { assert.fail("Must not parse error body"); } }); await pending;
  assert.equal(h.find("button", "Registrar ingreso"), undefined);
});
test("invalid emails do not send HTTP; used and revoked results cannot admit; unmount aborts", async () => {
  const invalid = uiHarness(); invalid.change("bad"); await invalid.submit(); assert.equal(invalid.requests.length, 0);
  for (const ticketStatus of ["used", "revoked", null]) {
    const h = uiHarness(); h.change(registration.email);
    const pending = h.submit(); h.requests[0].resolve(Response.json({ registration: { ...registration, ticketStatus, ticketCode: null } })); await pending;
    const button = h.find("button", "Registrar ingreso"); assert.equal(button.props.disabled, true); button.props.onClick(); assert.deepEqual(h.validated, []);
  }
  const h = uiHarness(); h.change(registration.email); const pending = h.submit(); h.unmount();
  assert.equal(h.requests[0].init.signal.aborted, true);
  h.requests[0].resolve(Response.json({ registration })); await pending;
});
