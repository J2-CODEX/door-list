import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

// All data and authentication are fixtures; these tests never access a database.
function loadModule(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Date, Intl, Map, Response, require: name => {
    assert.ok(name in dependencies, `Unexpected import: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const dates = loadModule("../lib/dates.ts");
const series = loadModule("../lib/registration-series.ts", { "./dates": dates });
const eventId = "d98afce0-d1e2-4fc9-a5ed-e50d547812da";
const counts = { eventId, publishedAt: "2026-11-07T06:00:00Z", firstRegistrationAt: "2026-11-09T18:00:00Z", days: [{ date: "2026-11-09", count: 2501 }] };
const plain = value => JSON.parse(JSON.stringify(value));

test("includes publication day, today and zero days before, between and after registrations", () => {
  const result = series.buildRegistrationSeries(counts, new Date("2026-11-10T18:00:00Z"));
  assert.deepEqual(plain(result.days), [
    { date: "2026-11-07", count: 0 }, { date: "2026-11-08", count: 0 },
    { date: "2026-11-09", count: 2501 }, { date: "2026-11-10", count: 0 },
  ]);
  assert.equal(result.days.reduce((sum, day) => sum + day.count, 0), 2501);
});

test("publication and today follow Ecuador's calendar around UTC midnight", () => {
  const result = series.buildRegistrationSeries({ ...counts, publishedAt: "2026-11-08T02:00:00Z", days: [] }, new Date("2026-11-09T03:00:00Z"));
  assert.equal(result.startDate, "2026-11-07");
  assert.equal(result.endDate, "2026-11-08");
  assert.equal(result.days.length, 2);
});

test("a new event with no registrations still has a zero point on its publication day", () => {
  const result = series.buildRegistrationSeries({ ...counts, firstRegistrationAt: null, days: [] }, new Date("2026-11-07T18:00:00Z"));
  assert.deepEqual(plain(result.days), [{ date: "2026-11-07", count: 0 }]);
});

test("unknown historical publication uses the first registration without inventing a timestamp", () => {
  const result = series.buildRegistrationSeries({ ...counts, publishedAt: null }, new Date("2026-11-10T18:00:00Z"));
  assert.equal(result.publishedAt, null);
  assert.equal(result.startDate, "2026-11-09");
  assert.equal(result.days.length, 2);
  const empty = series.buildRegistrationSeries({ ...counts, publishedAt: null, firstRegistrationAt: null, days: [] });
  assert.equal(empty.startDate, null);
  assert.equal(empty.days.length, 0);
});

test("calendar iteration crosses leap days and years without shifting date labels", () => {
  assert.equal(dates.nextCalendarDate("2024-02-28"), "2024-02-29");
  assert.equal(dates.nextCalendarDate("2026-12-31"), "2027-01-01");
  assert.match(dates.formatCalendarDate("2026-11-07", "long"), /7.*noviembre.*2026/);
});

function handler(auth, buildRegistrationSeries = series.buildRegistrationSeries) {
  return loadModule("../app/api/organizador/eventos/[eventId]/registros-por-dia/route.ts", {
    zod: { z }, "@/lib/supabase/organizer": { authenticateOrganizer: auth },
    "@/lib/registration-series": { buildRegistrationSeries },
  }).GET;
}
const params = { params: Promise.resolve({ eventId }) };
const request = () => new Request(`http://localhost/api/organizador/eventos/${eventId}/registros-por-dia`);

test("endpoint rejects invalid IDs and unauthenticated requests before reading counts", async () => {
  const invalid = handler(() => assert.fail("Must not authenticate an invalid ID"));
  assert.equal((await invalid(request(), { params: Promise.resolve({ eventId: "invalid" }) })).status, 404);
  assert.equal((await handler(async () => null)(request(), params)).status, 401);
});

test("endpoint returns 404 when ownership-protected RPC finds no event", async () => {
  const get = handler(async () => ({ client: { rpc: async (name, args) => {
    assert.equal(name, "get_event_registration_counts");
    assert.equal(args.p_event_id, eventId);
    return { data: null, error: null };
  } } }));
  const response = await get(request(), params);
  assert.equal(response.status, 404);
  assert.equal(typeof (await response.json()).error, "string");
});

test("endpoint returns a private camelCase series independently of attendee filters", async () => {
  const get = handler(async () => ({ client: { rpc: async (_name, args) => {
    assert.deepEqual(plain(args), { p_event_id: eventId });
    return { data: counts, error: null };
  } } }), data => series.buildRegistrationSeries(data, new Date("2026-11-10T18:00:00Z")));
  const response = await get(new Request(`${request().url}?search=Ana&page=2&ticketTypeId=ignored`), params);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const body = await response.json();
  assert.equal(body.eventId, eventId);
  assert.equal(body.days[2].count, 2501);
  assert.equal(body.days.length, 4);
  assert.ok(!JSON.stringify(body).includes("email"));
});

test("provider and authentication failures return safe JSON errors with 500", async () => {
  for (const auth of [
    async () => { throw new Error("secret auth details"); },
    async () => ({ client: { rpc: async () => ({ data: null, error: { message: "secret database details" } }) } }),
  ]) {
    const response = await handler(auth)(request(), params);
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.deepEqual(Object.keys(body), ["error"]);
    assert.doesNotMatch(body.error, /secret/);
  }
});
