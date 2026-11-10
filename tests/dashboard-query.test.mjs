import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise query transitions with deferred HTTP fixtures; no network or database.
function createQueryHarness() {
  let token = "organizer-a";
  const state = [];
  let cursor = 0;
  let dependencies;
  let cleanup;
  let pendingEffect;
  const requests = [];
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL("../lib/use-dashboard-query.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, AbortController,
    fetch: (_url, options) => new Promise((resolve, reject) => requests.push({ resolve, reject, signal: options.signal })),
    require: name => {
      if (name === "react") return {
        useState: initial => {
          const index = cursor++;
          if (!(index in state)) state[index] = initial;
          return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
        },
        useEffect: (effect, next) => {
          if (!dependencies || next.some((value, index) => value !== dependencies[index])) {
            dependencies = next;
            cleanup?.();
            pendingEffect = effect;
          }
        },
      };
      if (name === "@/components/dashboard-session") return { useDashboardToken: () => token };
      if (name === "@/lib/supabase/browser") return { browserClient: null };
      assert.fail(`Unexpected import: ${name}`);
    },
  });
  return {
    requests,
    setToken(value) { token = value; },
    render(url = "/events?page=1") {
      cursor = 0;
      const result = exports.useDashboardQuery(url);
      if (pendingEffect) { const effect = pendingEffect; pendingEffect = undefined; cleanup = effect(); }
      return result;
    },
    async complete(index, data, status = 200) {
      requests[index].resolve({ ok: status === 200, status, json: async () => data });
      await new Promise(resolve => setImmediate(resolve));
    },
  };
}

test("refresh keeps the last successful rows while loading and after HTTP failure", async () => {
  const h = createQueryHarness();
  assert.equal(h.render().loading, true);
  const rows = { registrations: [{ name: "Ana", email: "ana@example.com" }] };
  await h.complete(0, rows);
  const ready = h.render();
  assert.equal(ready.data, rows);
  ready.refresh();
  assert.equal(h.render().loading, true);
  assert.equal(h.render().data, rows);
  await h.complete(1, { error: "Provider details must stay private" }, 500);
  const failed = h.render();
  assert.equal(failed.loading, false);
  assert.equal(failed.data, rows);
  assert.match(failed.error, /No pudimos cargar/);
  assert.doesNotMatch(failed.error, /Provider/);
});

test("an empty filtered result and its query survive a failed update", async () => {
  const h = createQueryHarness();
  const url = "/events?page=1&search=sin-coincidencias";
  h.render(url);
  const empty = { registrations: [], total: 0 };
  await h.complete(0, empty);
  h.render(url).refresh();
  assert.equal(h.render(url).data, empty);
  await h.complete(1, {}, 500);
  assert.equal(h.render(url).data, empty);
  assert.equal(h.render(url).dataUrl, url);
});

test("failed pagination preserves the page associated with the displayed rows", async () => {
  const h = createQueryHarness();
  h.render();
  const firstPage = { registrations: [{ name: "Ana" }] };
  await h.complete(0, firstPage);
  h.render("/events?page=2");
  await h.complete(1, {}, 500);
  const result = h.render("/events?page=2");
  assert.equal(result.data, firstPage);
  assert.equal(result.dataUrl, "/events?page=1");
});

test("initial failures stay distinct from successful empty results", async () => {
  const h = createQueryHarness();
  h.render();
  await h.complete(0, {}, 500);
  const failed = h.render();
  assert.equal(failed.data, null);
  assert.ok(failed.error);
  failed.refresh();
  h.render();
  await h.complete(1, { registrations: [] });
  assert.ok(h.render().data);
  assert.equal(h.render().error, "");
});

test("a different organizer never receives the previous organizer's cached rows", async () => {
  const h = createQueryHarness();
  h.render();
  await h.complete(0, { registrations: [{ name: "Private attendee" }] });
  h.render();
  h.setToken("organizer-b");
  assert.equal(h.render().data, null);
  await h.complete(1, {}, 500);
  assert.equal(h.render().data, null);
});

test("a cancelled filter response cannot replace a newer successful result", async () => {
  const h = createQueryHarness();
  h.render("/events?search=old");
  h.render("/events?search=new");
  assert.equal(h.requests[0].signal.aborted, true);
  const latest = { registrations: [{ name: "New result" }] };
  await h.complete(1, latest);
  await h.complete(0, { registrations: [{ name: "Old result" }] });
  assert.equal(h.render("/events?search=new").data, latest);
});
