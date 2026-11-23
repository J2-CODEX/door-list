import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const source = ts.transpileModule(readFileSync(new URL("../lib/ticket-type-errors.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(source, { exports, require: name => assert.fail(`Unexpected import: ${name}`) });
const { getTicketTypeSaveError } = exports;
const minimumMessage = "El aforo no puede ser inferior al número de asistentes ya registrados en este tipo de entrada.";
const maximumMessage = "El aforo supera el disponible para este evento. Revisa los datos.";
const fallbackMessage = "No pudimos guardar el tipo de entrada. Inténtalo de nuevo.";

test("minimum and maximum constraint failures have distinct owned messages", () => {
  assert.equal(getTicketTypeSaveError({ code: "23514", message: "El aforo no puede ser menor que los registros existentes" }), minimumMessage);
  assert.equal(getTicketTypeSaveError({ code: "23514", message: "La suma de aforos de las entradas supera el límite del evento" }), maximumMessage);
});

test("unknown failures never expose provider message, details or hint", () => {
  const error = { code: "23514", message: "private-provider-message", details: "private-details", hint: "private-hint" };
  assert.equal(getTicketTypeSaveError(error), fallbackMessage);
});

test("only exact code and message pairs are classified as capacity errors", () => {
  const cases = [
    { code: "23514", message: "No se puede mover una entrada con registros" },
    { code: "23514", message: "Unknown constraint with aforo and registros" },
    { code: "42501", message: "permission denied" },
    { code: "", message: "TypeError: fetch failed" },
    { code: "42501", message: "El aforo no puede ser menor que los registros existentes" },
    { code: "42501", message: "La suma de aforos de las entradas supera el límite del evento" },
    { code: "23514", message: "El aforo no puede ser menor que los registros existentes extra" },
    { code: "23514", message: " La suma de aforos de las entradas supera el límite del evento" },
  ];
  for (const error of cases) assert.equal(getTicketTypeSaveError(error), fallbackMessage, JSON.stringify(error));
});

test("the installed SDK parses failed PostgREST updates using an entirely mocked fetch", async () => {
  const cases = [
    ["23514", "El aforo no puede ser menor que los registros existentes", minimumMessage],
    ["23514", "La suma de aforos de las entradas supera el límite del evento", maximumMessage],
    ["23514", "private-unknown-constraint", fallbackMessage],
  ];
  for (const [code, message, expected] of cases) {
    let calls = 0;
    const client = createClient("https://sdk-fixture.invalid", "fake-key", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (url, options) => {
        calls++;
        const target = new URL(url);
        assert.equal(target.origin, "https://sdk-fixture.invalid");
        assert.equal(target.pathname, "/rest/v1/ticket_types");
        assert.equal(target.searchParams.get("id"), "eq.type-a");
        assert.equal(target.searchParams.get("event_id"), "eq.event-a");
        assert.equal(options.method, "PATCH");
        assert.equal(JSON.parse(options.body).capacity, 19);
        return new Response(JSON.stringify({ code, message, details: "private-details", hint: "private-hint" }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      } },
    });
    const { error } = await client.from("ticket_types").update({ capacity: 19 }).eq("id", "type-a").eq("event_id", "event-a");
    assert.equal(calls, 1);
    assert.equal(error.code, code);
    assert.equal(error.message, message);
    assert.equal(getTicketTypeSaveError(error), expected);
  }
});
