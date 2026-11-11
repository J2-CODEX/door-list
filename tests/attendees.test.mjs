import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
// The same TypeScript/VM approach as the existing dashboard tests, with aliases.
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
      exports, Response, URL, URLSearchParams, Date, AbortController, setTimeout, clearTimeout, ...globals,
      require: name => {
        if (Object.hasOwn(overrides, name)) return overrides[name];
        if (name === "server-only") return {};
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
const { buildAttendeesCsv, attendeesFilename } = loadTs("lib/export/attendees.ts");
const eventId = "d98afce0-d1e2-4fc9-a5ed-e50d547812da";
const typeId = "d98afce0-d1e2-4fc9-a5ed-e50d547812db";
const ownerId = "d98afce0-d1e2-4fc9-a5ed-e50d547812dc";
const endpoint = `https://app.test/dashboard/eventos/${eventId}/asistentes`;
const params = { params: Promise.resolve({ eventId }) };
const exportRegistration = {
  name: 'Ana "La Jefa" Pérez, Jr.\nEquipo de puerta', email: "ana@example.com", ticketTypeName: "General",
  ticketCode: "a".repeat(64), createdAt: "2026-11-11T02:00:00Z", ticketStatus: "valid",
};

test("CSV uses a UTF-8 BOM, ordered headers, CRLF, quotes and embedded newlines", () => {
  const csv = buildAttendeesCsv([exportRegistration]);
  assert.deepEqual([...Buffer.from(csv).subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.ok(csv.startsWith("\uFEFFnombre,email,tipo de entrada,código de ticket,fecha de compra,estado del ticket\r\n"));
  assert.ok(csv.includes('"Ana ""La Jefa"" Pérez, Jr.\nEquipo de puerta",ana@example.com,General,'));
  assert.ok(csv.endsWith(",2026-11-10,Válida\r\n"));
});
test("empty CSV contains only the header row and inactive tickets never appear", () => {
  const empty = buildAttendeesCsv([]);
  assert.equal(empty.split("\r\n").length, 2);
  for (const ticketStatus of ["revoked", "cancelled", "canceled", "refunded", "unknown"]) {
    assert.equal(buildAttendeesCsv([{ ...exportRegistration, ticketStatus }]), empty);
  }
  assert.match(buildAttendeesCsv([{ ...exportRegistration, ticketStatus: "used" }]), /Utilizada\r\n$/);
});
test("CSV neutralizes spreadsheet formulas without treating quoting as protection", () => {
  for (const name of ["=1+1", "+SUM(1,2)", "-1+2", "@SUM(1)", "  =1+1", "\tformula", "\rformula", "\nformula"]) {
    const row = buildAttendeesCsv([{ ...exportRegistration, name }]).split("\r\n")[1];
    assert.ok(row.startsWith("'") || row.startsWith('"\''), name);
  }
});
test("filename uses a safe title slug and download day in Ecuador, with an ID fallback", () => {
  assert.equal(attendeesFilename("¡Encuentro de Música!", eventId, new Date("2026-11-11T02:00:00Z")), "asistentes-encuentro-de-musica-2026-11-10.csv");
  assert.equal(attendeesFilename("🎉", eventId, new Date("2026-11-11T12:00:00Z")), `asistentes-${eventId}-2026-11-11.csv`);
  assert.ok(!attendeesFilename('A/B\\C\r\n"D', eventId).includes("\r"));
});

function registration(index, status = "valid") {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, event_id: eventId, ticket_type_id: typeId,
    name: `Attendee ${index}`, email: `person${index}@example.com`, created_at: "2026-11-11T02:00:00Z",
    tickets: { code: index.toString(16).padStart(64, "0"), status }, ticket_types: { name: "General" },
  };
}
// Use the installed Supabase SDK against a fake HTTP transport. Assert the
// actual PostgREST requests, including JWT propagation and !inner filters.
function handlerFixture({ userId = ownerId, rows = [], types = [{ id: typeId, name: "General", capacity: 3000 }], rowCap = 1000, failure, counts } = {}) {
  const requests = [];
  const client = createClient("https://supabase.test", "test-publishable-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer owner-token" }, fetch: async (input, init) => {
      const url = new URL(String(input));
      const table = url.pathname.split("/").at(-1);
      const headers = new Headers(init.headers);
      requests.push({ url, method: init.method, headers });
      assert.equal(headers.get("authorization"), "Bearer owner-token");
      assert.ok(!url.pathname.includes("/rpc/"));
      if (failure?.(table, url, init)) return Response.json({ message: "SECRET provider detail" }, { status: 500 });
      if (table === "events") {
        assert.equal(url.searchParams.get("select"), "id,title");
        assert.equal(url.searchParams.get("id"), `eq.${eventId}`);
        assert.equal(url.searchParams.get("owner_id"), `eq.${userId}`);
        return Response.json(userId === ownerId ? [{ id: eventId, title: "Encuentro de Música" }] : []);
      }
      assert.equal(url.searchParams.get("event_id"), `eq.${eventId}`);
      const after = url.searchParams.get("id")?.slice(3);
      const limit = Math.min(Number(url.searchParams.get("limit") ?? rowCap), rowCap);
      if (table === "ticket_types") return Response.json(types.filter(type => !after || type.id > after).slice(0, limit));
      assert.equal(table, "registrations");
      assert.equal(url.searchParams.get("tickets.status"), "in.(valid,used)");
      assert.match(url.searchParams.get("select"), /tickets!inner\(/);
      let eligible = rows.filter(row => ["valid", "used"].includes(row.tickets.status));
      const selectedType = url.searchParams.get("ticket_type_id")?.slice(3);
      if (selectedType) eligible = eligible.filter(row => row.ticket_type_id === selectedType);
      if (init.method === "HEAD") {
        assert.equal(headers.get("prefer"), "count=exact");
        return new Response(null, { headers: { "Content-Range": `*/${counts?.[selectedType] ?? eligible.length}` } });
      }
      assert.equal(url.searchParams.get("order"), "id.asc");
      if (after) eligible = eligible.filter(row => row.id > after);
      return Response.json(eligible.slice(0, limit));
    } },
  });
  const { GET } = loadTs("app/dashboard/eventos/[eventId]/asistentes/route.ts", {
    "@/lib/supabase/organizer": { authenticateOrganizer: async () => userId ? { client, userId } : null },
  });
  return { requests, get: (query = "", context = params) => GET(new Request(endpoint + query), context) };
}

test("missing authentication and invalid IDs/formats fail before reading any data", async () => {
  const h = handlerFixture({ userId: null });
  assert.equal((await h.get()).status, 401);
  assert.equal((await h.get("", { params: Promise.resolve({ eventId: "invalid" }) })).status, 404);
  assert.equal((await h.get("?format=xlsx")).status, 400);
  assert.equal(h.requests.length, 0);
});
test("an authenticated non-owner receives 403 and cannot query another event's attendees or codes", async () => {
  for (const query of ["", "?format=csv"]) {
    const h = handlerFixture({ userId: "another-owner", rows: [registration(1)] });
    const response = await h.get(query);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Evento no disponible o sin permiso de acceso." });
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(h.requests.length, 1);
    assert.ok(h.requests[0].url.pathname.endsWith("/events"));
  }
});
test("sales counts and CSV exclude revoked, cancelled and refunded tickets but include used ones", async () => {
  const rows = [registration(1), registration(2, "used"), registration(3, "revoked"), registration(4, "cancelled"), registration(5, "refunded")];
  const h = handlerFixture({ rows });
  const summary = await h.get();
  assert.deepEqual(await summary.json(), { ticketTypes: [{ id: typeId, name: "General", capacity: 3000, soldCount: 2 }] });
  const csv = await (await h.get("?format=csv&search=does-not-match&page=99")).text();
  assert.match(csv, /Attendee 1,/);
  assert.match(csv, /Attendee 2,/);
  for (const number of [3, 4, 5]) assert.ok(!csv.includes(`person${number}@example.com`));
});
test("CSV reads every keyset batch, even if the server returns fewer rows than requested", async () => {
  const rows = Array.from({ length: 1002 }, (_, index) => registration(index + 1));
  const h = handlerFixture({ rows, rowCap: 123 });
  const response = await h.get("?format=csv");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/csv; charset=utf-8");
  assert.match(response.headers.get("Content-Disposition"), /^attachment; filename="asistentes-encuentro-de-musica-\d{4}-\d{2}-\d{2}\.csv"$/);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const csv = bytes.toString("utf8");
  assert.equal(csv.split("\r\n").length, rows.length + 2);
  assert.equal(new Set(csv.split("\r\n").slice(1, -1)).size, rows.length);
  assert.ok(csv.includes("person1002@example.com"));
});
test("empty event still downloads the BOM and headers, and sales can exceed max_rows or have no capacity", async () => {
  const empty = handlerFixture();
  assert.equal(Buffer.from(await (await empty.get("?format=csv")).arrayBuffer()).toString("utf8"), buildAttendeesCsv([]));
  assert.equal((await (await empty.get()).json()).ticketTypes[0].soldCount, 0);
  const large = handlerFixture({ types: [{ id: typeId, name: "General", capacity: null }], counts: { [typeId]: 2501 } });
  assert.deepEqual(await (await large.get()).json(), { ticketTypes: [{ id: typeId, name: "General", capacity: null, soldCount: 2501 }] });
});
test("ticket type metadata is also paginated without losing types", async () => {
  const types = Array.from({ length: 3 }, (_, index) => ({ id: `${typeId}${index}`, name: `Type ${index}`, capacity: 10 }));
  const h = handlerFixture({ types, rowCap: 1 });
  assert.equal((await (await h.get()).json()).ticketTypes.length, 3);
});
test("provider failures return safe private JSON, including a failure after a partial CSV read", async () => {
  for (const table of ["events", "ticket_types", "registrations"]) {
    const h = handlerFixture({ failure: candidate => table === candidate });
    const response = await h.get();
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.deepEqual(await response.json(), { error: "No pudimos cargar los asistentes o sus ventas. Inténtalo de nuevo." });
  }
  const h = handlerFixture({ rows: [registration(1)], failure: (table, url) => table === "registrations" && url.searchParams.has("id") });
  const response = await h.get("?format=csv");
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Content-Disposition"), null);
  assert.ok(!(await response.text()).includes("person1@example.com"));
});

const { TicketSales } = loadTs("app/dashboard/eventos/[eventId]/asistentes/ticket-sales.tsx");
const renderSales = props => renderToStaticMarkup(createElement(TicketSales, { loading: false, error: "", onRetry() {}, ...props }));
test("sales UI shows sold/capacity, remaining seats, full capacity and no bar for unlimited types", () => {
  const html = renderSales({ data: { ticketTypes: [
    { id: "a", name: "General", capacity: 10, soldCount: 3 },
    { id: "b", name: "VIP", capacity: 2, soldCount: 3 },
    { id: "c", name: "Comunidad", capacity: null, soldCount: 4 },
  ] } });
  assert.match(html, /7 para llenar/);
  assert.match(html, /Aforo completo/);
  assert.match(html, /sin límite/);
  assert.equal((html.match(/role="progressbar"/g) ?? []).length, 2);
  assert.match(html, /3 de 10 plazas ocupadas/);
  assert.match(html, /aria-valuenow="100"/);
});
test("sales UI distinguishes initial failure, loading, empty and failed refresh", () => {
  assert.match(renderSales({ data: null, loading: true }), /aria-busy="true"/);
  const initialError = renderSales({ data: null, error: "SECRET provider detail" });
  assert.match(initialError, /No pudimos cargar las ventas/);
  assert.ok(!initialError.includes("Aún no hay tipos"));
  assert.ok(!initialError.includes("SECRET"));
  assert.match(renderSales({ data: { ticketTypes: [] } }), /Aún no hay tipos de entrada/);
  const refreshed = renderSales({ data: { ticketTypes: [{ id: "a", name: "General", capacity: 10, soldCount: 3 }] }, error: "Failed" });
  assert.match(refreshed, /última información disponible/);
  assert.match(refreshed, /7 para llenar/);
});

test("existing event detail integrates the download and ticket sales, and refreshes both queries", () => {
  const queries = [];
  const refreshed = [];
  let refresh;
  const { EventDetail } = loadTs("app/dashboard/eventos/[eventId]/event-detail.tsx", {
    "@/lib/use-dashboard-query": { useDashboardQuery: url => {
      queries.push(url);
      return {
        dataUrl: url, loading: false, error: "", refresh: () => refreshed.push(url),
        data: url.endsWith("/asistentes") ? { ticketTypes: [{ id: typeId, name: "General", capacity: 10, soldCount: 3 }] } : {
          event: { id: eventId, title: "Encuentro", description: "Prueba", startsAt: "2026-11-20T12:00:00Z", venue: "Quito", status: "published", capacity: 10, registrationCount: 5, ticketTypes: [{ id: typeId, name: "General", capacity: 10, registrationCount: 5 }] },
          registrations: [], total: 0, page: 1,
        },
      };
    } },
    "./registration-chart": { RegistrationChart: () => null },
    "@/components/dashboard-session": { useDashboardToken: () => "fixture-token" },
    "@/components/ui/registration-controls": { ...loadTs("components/ui/registration-controls.tsx"), Button: props => {
      if (props.children === "Actualizar ↻") refresh = props.onClick;
      return createElement("button", props);
    } },
  });
  const html = renderToStaticMarkup(createElement(EventDetail, { eventId }));
  assert.match(html, /Descargar CSV/);
  assert.match(html, /7 para llenar/);
  assert.ok(queries.includes(`/dashboard/eventos/${eventId}/asistentes`));
  refresh();
  assert.deepEqual(refreshed, queries);
});

function downloadHarness() {
  const states = [];
  let cursor = 0;
  let cleanup;
  const requests = [];
  const links = [];
  const revoked = [];
  const timers = [];
  const fakeUrl = class extends URL {
    static createObjectURL() { return "blob:attendees"; }
    static revokeObjectURL(value) { revoked.push(value); }
  };
  const { DownloadAttendeesButton } = loadTs("app/dashboard/eventos/[eventId]/asistentes/download-attendees-button.tsx", {
    react: {
      useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
      useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
      useEffect(effect) { cleanup ??= effect(); },
    },
    "@/components/dashboard-session": { useDashboardToken: () => "owner-token" },
  }, {
    URL: fakeUrl,
    fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
    setTimeout: callback => timers.push(callback),
    document: { createElement: () => { const link = { clicked: false, click() { this.clicked = true; }, remove() { this.removed = true; } }; links.push(link); return link; }, body: { appendChild() {} } },
  });
  return { requests, links, revoked, timers, unmount: () => cleanup(), render() { cursor = 0; return DownloadAttendeesButton({ eventId }); } };
}
test("download button starts an authenticated Blob download, disables duplicate clicks and releases its URL", async () => {
  const h = downloadHarness();
  const button = h.render().props.children[0];
  const pending = button.props.onClick();
  assert.equal(h.render().props.children[0].props.disabled, true);
  await button.props.onClick();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].options.headers.Authorization, "Bearer owner-token");
  assert.equal(h.requests[0].url, `/dashboard/eventos/${eventId}/asistentes?format=csv`);
  h.requests[0].resolve(new Response(buildAttendeesCsv([]), { headers: { "Content-Disposition": 'attachment; filename="asistentes-evento-2026-11-11.csv"' } }));
  await pending;
  assert.equal(h.links[0].clicked, true);
  assert.equal(h.links[0].removed, true);
  assert.equal(h.links[0].download, "asistentes-evento-2026-11-11.csv");
  assert.equal(h.render().props.children[0].props.disabled, false);
  assert.equal(h.revoked.length, 0);
  h.timers[0]();
  assert.deepEqual(h.revoked, ["blob:attendees"]);
});
test("failed downloads check response.ok before the body, show safe messages and allow retries", async () => {
  for (const status of [401, 403, 500]) {
    const h = downloadHarness();
    const pending = h.render().props.children[0].props.onClick();
    h.requests[0].resolve({ ok: false, status, blob: () => assert.fail("Must check response.ok first"), json: () => assert.fail("Must not display provider messages") });
    await pending;
    const result = h.render();
    assert.equal(result.props.children[0].props.disabled, false);
    assert.match(result.props.children[1].props.children, status === 401 ? /sesión terminó/ : status === 403 ? /No tienes permiso/ : /No pudimos descargar/);
    assert.equal(h.links.length, 0);
  }
});
test("unmounting aborts an in-progress download without triggering a file", async () => {
  const h = downloadHarness();
  const pending = h.render().props.children[0].props.onClick();
  h.unmount();
  assert.equal(h.requests[0].options.signal.aborted, true);
  h.requests[0].resolve(new Response("csv", { headers: { "Content-Disposition": 'attachment; filename="asistentes-evento-2026-11-11.csv"' } }));
  await pending;
  assert.equal(h.links.length, 0);
});
