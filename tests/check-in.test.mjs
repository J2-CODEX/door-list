import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as contracts from "../lib/check-in.ts";

// All HTTP is mocked. These tests never connect to a database.
function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, Response, Request, URL, AbortController, setTimeout, clearTimeout, ...globals, require(name) {
    assert.ok(name in dependencies, `Unexpected import ${name}`); return dependencies[name];
  } });
  return exports;
}
const eventId = "d98afce0-d1e2-4fc9-a5ed-e50d547812da";
const ticketCode = "a".repeat(64);
const success = { status: "valid", name: "Ana Pérez", ticketType: "General", checkedInAt: "2026-11-18T20:00:00Z" };
const request = body => new Request("https://door.test/api/organizador/check-in", {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer owner-token" }, body: JSON.stringify(body),
});
function handlerFixture({ data = success, authenticated = true, failure = false } = {}) {
  const requests = [];
  const client = createClient("https://supabase.test", "publishable-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer owner-token" }, fetch: async (input, options) => {
      requests.push({ url: String(input), options });
      assert.equal(new Headers(options.headers).get("authorization"), "Bearer owner-token");
      assert.deepEqual(JSON.parse(options.body), { p_event_id: eventId, p_code: ticketCode });
      assert.ok(String(input).endsWith("/rpc/check_in_ticket"));
      return Response.json(failure ? { message: "SECRET provider detail" } : data, { status: failure ? 500 : 200 });
    } },
  });
  const { POST } = load("app/api/organizador/check-in/route.ts", {
    "@/lib/check-in": contracts,
    "@/lib/supabase/organizer": { authenticateOrganizer: async () => authenticated ? { client } : null },
  });
  return { requests, post: body => POST(request(body)) };
}
test("only authenticated, canonical requests reach the atomic check-in RPC", async () => {
  const anonymous = handlerFixture({ authenticated: false });
  assert.equal((await anonymous.post({ eventId, ticketCode })).status, 401);
  assert.equal(anonymous.requests.length, 0);
  const h = handlerFixture();
  for (const body of [{ eventId: "bad", ticketCode }, { eventId, ticketCode: "short" }, { eventId, ticketCode: ticketCode.toUpperCase() }]) {
    assert.equal((await h.post(body)).status, 400);
  }
  assert.equal(h.requests.length, 0);
  const response = await h.post({ eventId, ticketCode });
  assert.deepEqual(await response.json(), success);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(h.requests.length, 1);
});
test("used, missing, forbidden and provider failures have safe JSON and non-200 statuses", async () => {
  for (const [status, httpStatus] of [["used", 409], ["notFound", 404], ["forbidden", 403]]) {
    const response = await handlerFixture({ data: { status } }).post({ eventId, ticketCode });
    assert.equal(response.status, httpStatus);
    const body = await response.json();
    assert.deepEqual(Object.keys(body), ["error"]);
    assert.equal(typeof body.error, "string");
  }
  for (const fixture of [{ failure: true }, { data: null }, { data: { status: "valid" } }]) {
    const response = await handlerFixture(fixture).post({ eventId, ticketCode });
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes("SECRET"));
  }
});

const jsx = await import("react/jsx-runtime");
const { ScanResult } = load("app/scan/scan-result.tsx", {
  "react/jsx-runtime": jsx, "@/lib/dates": { formatEventDate: () => "18 de noviembre de 2026, 15:00" },
});
test("large results distinguish admission, duplicate, missing and uncertain network outcomes", () => {
  for (const [result, title, instruction] of [
    [success, "Válida", "Puede ingresar"], [{ status: "used" }, "Usada", "No permitir ingreso"],
    [{ status: "notFound" }, "No encontrada", "No permitir ingreso"],
    [{ status: "error", message: "Revisa la conexión." }, "Sin confirmar", "No autorices el ingreso todavía"],
  ]) {
    const html = renderToStaticMarkup(createElement(ScanResult, { result }));
    assert.ok(html.includes(title)); assert.ok(html.includes(instruction));
    assert.match(html, /aria-live="assertive"/);
    if (result.status === "valid") assert.match(html, /Check-in registrado/);
    else assert.ok(!html.includes("Check-in registrado"));
  }
});

function scannerHarness() {
  let state = [], cursor = 0, effectIndex = 0, effects = [], queued = [];
  const requests = [], scanners = [], visibility = new Map();
  const fakeDocument = { hidden: false, addEventListener: (name, fn) => visibility.set(name, fn), removeEventListener: name => visibility.delete(name) };
  class Scanner {
    constructor(video, onDecode, options) { this.onDecode = onDecode; this.options = options; this.destroyed = false; scanners.push(this); }
    async start() {} async hasFlash() { return false; } stop() { this.stopped = true; } destroy() { this.destroyed = true; }
  }
  const react = {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return state[index] ??= { current: initial }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, deps) { const index = effectIndex++; const previous = effects[index]; if (!previous || deps.some((d, i) => d !== previous.deps[i])) { previous?.cleanup?.(); queued.push(() => { effects[index] = { deps, cleanup: fn() }; }); } },
  };
  const { TicketScanner } = load("app/scan/ticket-scanner.tsx", {
    react, "react/jsx-runtime": jsx, "next/link": { default: "a" }, "qr-scanner": { default: Scanner },
    "@/components/ui/button": { Button: "button" }, "@/components/ui/input": { Input: "input" },
    "@/components/ui/field": { Field: "div", FieldLabel: "label" },
    "@/components/ui/registration-controls": { NativeSelect: "select" },
    "@/components/dashboard-session": { useDashboardToken: () => "owner-token" },
    "@/lib/use-dashboard-query": { useDashboardQuery: () => ({ data: { events: [{ id: eventId, title: "Encuentro", status: "published" }] }, error: "" }) },
    "@/lib/check-in": contracts, "./scan-result": { ScanResult },
  }, {
    navigator: { mediaDevices: { getUserMedia() {} } }, window: { isSecureContext: true }, document: fakeDocument,
    fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
  });
  function walk(element, fn) { if (!element || typeof element !== "object") return; fn(element); const children = element.props?.children; for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) walk(child, fn); }
  return { requests, scanners, document: fakeDocument, visibility,
    render() { cursor = 0; effectIndex = 0; const tree = TicketScanner({}); walk(tree, node => { if (node.type === "video") node.props.ref.current = {}; }); const work = queued; queued = []; work.forEach(fn => fn()); return tree; },
    find(tree, type) { let found; walk(tree, node => { if (node.type === type) found = node; }); return found; },
    unmount() { effects.forEach(effect => effect.cleanup?.()); },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test("camera prefers rear lens, deduplicates scans and releases camera and worker", async () => {
  const h = scannerHarness(); h.render(); await flush();
  const scanner = h.scanners[0];
  assert.equal(scanner.options.preferredCamera, "environment");
  scanner.onDecode({ data: ticketCode }); scanner.onDecode({ data: ticketCode });
  assert.equal(h.requests.length, 1);
  assert.equal(scanner.stopped, true);
  assert.equal(h.requests[0].options.headers.Authorization, "Bearer owner-token");
  assert.deepEqual(JSON.parse(h.requests[0].options.body), { eventId, ticketCode });
  h.render(); assert.equal(scanner.destroyed, true);
  h.requests[0].resolve(Response.json(success)); await flush();
  assert.equal(h.find(h.render(), ScanResult).props.result.status, "valid");
  h.unmount();
});
test("duplicate or missing responses check HTTP status before reading the body", async () => {
  for (const [httpStatus, status] of [[409, "used"], [404, "notFound"], [503, "error"]]) {
    const h = scannerHarness(); h.render(); await flush();
    h.scanners[0].onDecode({ data: ticketCode });
    h.requests[0].resolve({ ok: false, status: httpStatus, json() { assert.fail("Do not parse error/provider bodies"); } });
    await flush();
    assert.equal(h.find(h.render(), ScanResult).props.result.status, status);
    h.unmount();
  }
});
test("backgrounding pauses camera and unmount aborts uncertain in-flight requests", async () => {
  const h = scannerHarness(); h.render(); await flush();
  h.document.hidden = true; h.visibility.get("visibilitychange")();
  assert.equal(h.scanners[0].stopped, true);
  h.render(); assert.equal(h.scanners[0].destroyed, true);
  h.unmount();
  const pending = scannerHarness(); pending.render(); await flush();
  pending.scanners[0].onDecode({ data: ticketCode }); pending.unmount();
  assert.equal(pending.requests[0].options.signal.aborted, true);
  pending.requests[0].resolve(Response.json(success)); await flush();
});

test("renewing the same user's token preserves scanner state, while changing account resets it", async () => {
  let cursor = 0, state = [], authListener, initialized = false;
  const router = { replace() {}, refresh() {} };
  const { DashboardSession } = load("components/dashboard-session.tsx", {
    react: {
      createContext: () => ({ Provider: "session-provider" }), useContext: () => "",
      useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; },
      useEffect(effect) { if (!initialized) { initialized = true; effect(); } },
    },
    "react/jsx-runtime": jsx,
    "@/lib/supabase/browser": { browserClient: { auth: { onAuthStateChange(listener) { authListener = listener; return { data: { subscription: { unsubscribe() {} } } }; } } } },
    "@/lib/supabase/browser-session": {
      clearOrganizerSession: async () => {},
      syncOrganizerSession: async token => ({ userId: token.startsWith("owner-a") ? "user-a" : "user-b", email: "owner@example.com" }),
    },
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/registration-controls": { Skeleton: "div" },
    "next/navigation": { useRouter: () => router },
  }, { queueMicrotask });
  const render = () => { cursor = 0; return DashboardSession({ children: "scanner", showControls: false }); };
  const scannerKey = tree => tree.props.children.at(-1).key;
  render();
  authListener("SIGNED_IN", { access_token: "owner-a-token-1" }); await flush();
  const originalKey = scannerKey(render());
  assert.equal(originalKey, "user-a");
  authListener("TOKEN_REFRESHED", { access_token: "owner-a-token-2" }); await flush();
  assert.equal(scannerKey(render()), originalKey, "The same scanner must not remount on token renewal");
  authListener("SIGNED_IN", { access_token: "owner-b-token-1" }); await flush();
  assert.equal(scannerKey(render()), "user-b", "A different account must not keep prior scanner state");
});
