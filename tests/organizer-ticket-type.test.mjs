import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const minimumError = { code: "23514", message: "El aforo no puede ser menor que los registros existentes" };
const minimumMessage = "El aforo no puede ser inferior al número de asistentes ya registrados en este tipo de entrada.";
const flush = () => new Promise(resolve => setImmediate(resolve));
const eventFixture = () => ({
  id: "event-a", title: "Encuentro de prueba", description: "Datos ficticios", venue: "Sala de prueba",
  starts_at: "2027-01-01T20:00:00Z", status: "draft", capacity: 100,
  ticket_types: [{ id: "type-a", event_id: "event-a", name: "General", capacity: 30 }, { id: "type-b", event_id: "event-a", name: "VIP", capacity: 60 }],
});

// Run the real component handlers with isolated hooks and persistence transport.
// The double returns scripted results; it does not implement database constraints.
async function createHarness(event = eventFixture()) {
  const slots = [];
  const effects = [];
  const requests = [];
  let cursor = 0;
  let tree;
  let reads = 0;
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "owner-a" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from(table) {
      if (table === "events") {
        reads++;
        const query = { select: () => query, eq: () => query, order: async () => ({ data: [event], error: null }) };
        return query;
      }
      assert.equal(table, "ticket_types", "Must not read registrations or tickets");
      return {
        update(values) {
          const filters = [];
          const response = new Promise((resolve, reject) => requests.push({ values, filters, resolve, reject }));
          const query = { eq: (...args) => { filters.push(args); return query; }, then: (resolve, reject) => response.then(resolve, reject) };
          return query;
        },
      };
    },
  };
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      const old = slots[index];
      if (!old || dependencies.some((value, i) => value !== old.dependencies[i])) {
        old?.cleanup?.();
        const record = { dependencies };
        slots[index] = record;
        effects.push(() => { record.cleanup = effect(); });
      }
    },
  };
  const element = (type, props) => ({ type, props });
  const helperUrl = new URL("../lib/ticket-type-errors.ts", import.meta.url);
  const helperExports = {};
  if (existsSync(helperUrl)) vm.runInNewContext(ts.transpileModule(readFileSync(helperUrl, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: helperExports });
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL("../app/organizador/page.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "@/lib/supabase/browser") return { browserClient: client };
      if (name === "@/lib/ticket-type-errors") return helperExports;
      if (name === "@/lib/dates") return { ecuadorDate: () => "2027-01-01", formatLocalDate: () => "1 ene 2027" };
      if (name === "next/link") return { __esModule: true, default: "Link" };
      if (name.startsWith("@/components/")) return new Proxy({}, { get: (_target, key) => key === "buttonStyles" ? () => "" : key });
      assert.fail(`Unexpected import: ${name}`);
    },
  });
  function render() {
    cursor = 0;
    tree = exports.default();
    while (effects.length) effects.shift()();
  }
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  const find = predicate => { const result = nodes(tree).find(predicate); assert.ok(result, "Element missing"); return result; };
  const input = id => find(node => node.props?.id === id);
  const form = () => input("ticketType-form");
  const h = {
    requests, render, input, form, nodes: () => nodes(tree),
    get reads() { return reads; },
    change(id, value) { input(id).props.onChange({ target: { value } }); render(); },
    submit() { const promise = form().props.onSubmit({ preventDefault() {} }); render(); return promise; },
    sheet() { return find(node => node.type === "Sheet" && nodes(node).some(child => child.props?.id === "ticketType-form")); },
    async respond(index, error = null) { requests[index].resolve({ error }); await flush(); render(); await flush(); render(); },
  };
  render(); await flush(); render(); await flush(); render();
  // Enter through the actual edit action, rather than seeding private hook slots.
  const edit = find(node => node.type === "Button" && node.props.children === "Editar");
  edit.props.onClick({ currentTarget: { focus() {} } }); render();
  return h;
}

test("minimum failure preserves input and open form, announces error, then retries successfully", async () => {
  const h = await createHarness();
  h.change("ticket-type-name", "General actualizado");
  h.change("ticket-type-capacity", "19");
  const pending = h.submit();
  await flush();
  assert.equal(h.requests.length, 1);
  const reads = h.reads;
  await h.respond(0, minimumError); await pending;
  const alert = h.nodes().find(node => node.props?.role === "alert");
  assert.equal(alert.props.children, minimumMessage);
  assert.equal(h.sheet().props.open, true);
  assert.equal(h.input("ticket-type-name").props.value, "General actualizado");
  assert.equal(h.input("ticket-type-capacity").props.value, "19");
  assert.equal(h.input("ticket-type-capacity").props["aria-invalid"], true);
  assert.ok(h.input("ticket-type-capacity").props["aria-describedby"].split(" ").includes(alert.props.id));
  assert.ok(h.input("ticket-type-capacity").props["aria-describedby"].includes("ticketType-capacity-help"));
  assert.equal(h.form().props["aria-busy"], false);
  assert.equal(h.reads, reads, "Failure must not refresh");
  assert.ok(!h.nodes().some(node => node.props?.children === "Tipo de entrada guardado."));
  assert.equal(JSON.stringify(h.requests[0].filters), JSON.stringify([["id", "type-a"], ["event_id", "event-a"]]));
  h.change("ticket-type-capacity", "20");
  const retry = h.submit(); await flush();
  assert.ok(!h.nodes().some(node => node.props?.role === "alert"));
  await h.respond(1); await retry;
  assert.equal(h.requests[1].values.capacity, 20);
  assert.equal(h.requests[1].values.name, "General actualizado");
  assert.equal(h.sheet().props.open, false);
  assert.ok(h.nodes().some(node => node.props?.children === "Tipo de entrada guardado."));
  assert.equal(h.reads, reads + 1);
});

test("a deferred minimum rejection uses the save response and blocks duplicate submission while busy", async () => {
  const h = await createHarness();
  h.change("ticket-type-capacity", "20");
  const pending = h.submit(); await flush();
  assert.equal(h.form().props["aria-busy"], true);
  assert.equal(h.nodes().find(node => node.type === "fieldset" && node.props.children?.[0]?.props?.children === "Detalles del tipo de entrada").props.disabled, true);
  await h.submit();
  assert.equal(h.requests.length, 1);
  await h.respond(0, minimumError); await pending;
  assert.equal(h.nodes().find(node => node.props?.role === "alert").props.children, minimumMessage);
  assert.equal(h.input("ticket-type-capacity").props.value, "20");
  assert.equal(h.sheet().props.open, true);
});

test("equal, reduced and maximum capacities retain native constraints and can save", async () => {
  for (const capacity of [20, 25, 40]) {
    const h = await createHarness();
    const field = h.input("ticket-type-capacity").props;
    assert.equal(field.required, true);
    assert.equal(field.type, "number");
    assert.equal(field.min, "1");
    assert.equal(field.max, 40);
    assert.equal(field.step, "1");
    h.change("ticket-type-capacity", String(capacity));
    const pending = h.submit(); await flush();
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].values.capacity, capacity);
    await h.respond(0); await pending;
    assert.equal(h.sheet().props.open, false);
  }
});

test("41 exceeds the local maximum without sending, while a stale maximum uses the server error", async () => {
  const h = await createHarness();
  h.change("ticket-type-capacity", "41");
  await h.submit();
  assert.equal(h.requests.length, 0);
  assert.equal(h.nodes().find(node => node.props?.role === "alert").props.children, "El aforo disponible para este tipo es 40.");
  assert.equal(h.input("ticket-type-capacity").props["aria-invalid"], true);
  const event = eventFixture(); event.ticket_types[1].capacity = 50;
  const stale = await createHarness(event);
  assert.equal(stale.input("ticket-type-capacity").props.max, 50);
  stale.change("ticket-type-capacity", "41");
  const pending = stale.submit(); await flush();
  await stale.respond(0, { code: "23514", message: "La suma de aforos de las entradas supera el límite del evento" }); await pending;
  assert.equal(stale.nodes().find(node => node.props?.role === "alert").props.children, "El aforo supera el disponible para este evento. Revisa los datos.");
  assert.equal(stale.input("ticket-type-capacity").props.value, "41");
  assert.equal(stale.sheet().props.open, true);
});

test("other types and Ticket states introduce no client registration-count validation", async () => {
  // These fixtures do not test SQL counting; the mocked server decides outcomes.
  for (const [capacity, count, otherCount] of [[5, 5, 25], [1, 0, 0], [20, 20, 0]]) {
    const event = eventFixture();
    event.ticket_types[0].capacity = count === 20 ? 30 : 10;
    event.ticket_types[1].capacity = 40;
    const registrations = Array.from({ length: count }, (_, index) => ({
      id: `registration-${index}`, ticketTypeId: "type-a",
      ticket: { registrationId: `registration-${index}`, status: index < 15 ? "valid" : index < 19 ? "used" : "revoked" },
    }));
    const snapshot = JSON.stringify(registrations);
    // Supplemental data must not become a pre-save client count or state filter.
    event.ticket_types[0].registrations = registrations;
    event.ticket_types[1].registrationCount = otherCount;
    const h = await createHarness(event);
    h.change("ticket-type-capacity", String(capacity));
    const pending = h.submit(); await flush();
    assert.equal(h.requests.length, 1);
    await h.respond(0); await pending;
    assert.equal(h.sheet().props.open, false);
    assert.equal(JSON.stringify(registrations), snapshot);
  }
});

test("invalid capacity or blank name preserves values and makes no save request", async () => {
  for (const capacity of ["", "0", "-1", "1.5", "2147483648"]) {
    const h = await createHarness();
    h.change("ticket-type-capacity", capacity);
    await h.submit();
    assert.equal(h.requests.length, 0);
    assert.equal(h.input("ticket-type-capacity").props.value, capacity);
    assert.equal(h.nodes().find(node => node.props?.role === "alert").props.children, "Indica un nombre y un aforo válido.");
  }
  const h = await createHarness();
  h.change("ticket-type-name", "   ");
  await h.submit();
  assert.equal(h.requests.length, 0);
});

test("unknown constraints, permission failures and thrown transport errors remain generic and retryable", async () => {
  for (const failure of [{ code: "23514", message: "private-constraint" }, { code: "42501", message: "private-permission" }, new Error("private-network")]) {
    const h = await createHarness();
    h.change("ticket-type-capacity", "19");
    const reads = h.reads;
    const pending = h.submit(); await flush();
    if (failure instanceof Error) {
      h.requests[0].reject(failure); await pending; h.render();
    } else { await h.respond(0, failure); await pending; }
    assert.equal(h.nodes().find(node => node.props?.role === "alert").props.children, "No pudimos guardar el tipo de entrada. Inténtalo de nuevo.");
    assert.equal(h.input("ticket-type-capacity").props["aria-invalid"], false);
    assert.equal(h.input("ticket-type-capacity").props["aria-describedby"], "ticketType-capacity-help");
    assert.equal(h.input("ticket-type-capacity").props.value, "19");
    assert.equal(h.form().props["aria-busy"], false);
    assert.equal(h.sheet().props.open, true);
    assert.equal(h.reads, reads);
  }
});
