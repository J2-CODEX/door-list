import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

// Explicit opt-in, loopback only. Never use the application's remote .env here.
test.skip(process.env.RUN_CAPACITY_DB_TESTS !== "1", "Requires authorization and an isolated local Supabase stack");
const minimumMessage = "El aforo no puede ser inferior al número de asistentes ya registrados en este tipo de entrada.";
const maximumMessage = "El aforo supera el disponible para este evento. Revisa los datos.";
const evidence = [];
let admin;
let anonymous;
let ownerId;
let email;
let password;

function checked(result) {
  if (result.error) throw new Error(`Local fixture operation failed: ${result.error.code ?? "unknown"}`);
  return result.data;
}
function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function evidenceDirectory() {
  return resolve(process.env.CAPACITY_EVIDENCE_DIR ?? "test-results/ticket-type-capacity");
}

test.beforeAll(async () => {
  const url = new URL(process.env.CAPACITY_SUPABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55421");
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  admin = createClient(url.href, process.env.CAPACITY_SERVICE_ROLE_KEY, options);
  anonymous = createClient(url.href, process.env.CAPACITY_ANON_KEY, options);
  email = `capacity-${randomUUID()}@example.invalid`;
  password = `Test-${randomUUID()}!`;
  const result = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true }));
  ownerId = result.user.id;
});

test.afterAll(() => {
  mkdirSync(evidenceDirectory(), { recursive: true });
  writeFileSync(resolve(evidenceDirectory(), "database-scenarios.json"), JSON.stringify({
    environment: "isolated local Supabase :55421, repository migrations", scenarios: evidence,
  }, null, 2) + "\n");
  // Keep fixtures for inspection in the disposable stack; no destructive cleanup.
});

async function register(fixture, count, type = 0) {
  for (let index = 0; index < count; index++) {
    const data = checked(await anonymous.rpc("register_attendee", {
      p_event_id: fixture.id, p_ticket_type_id: fixture.types[type].id,
      p_name: `Asistente ficticio ${index}`, p_email: `${randomUUID()}@example.invalid`,
    }));
    assert.equal(data.code, "SUCCESS");
  }
}

async function fixture({ capacity = 30, otherCapacity = 60, count = 20, otherCount = 0 } = {}) {
  const event = checked(await admin.from("events").insert({
    owner_id: ownerId, title: `Prueba de aforo ${randomUUID()}`, description: "Solo datos ficticios",
    venue: "Sala de pruebas", starts_at: "2099-01-01T20:00:00Z", status: "draft", capacity: 100,
  }).select("id,title").single());
  event.types = checked(await admin.from("ticket_types").insert([
    { event_id: event.id, name: "General", capacity },
    { event_id: event.id, name: "Otro tipo", capacity: otherCapacity },
  ]).select("id,name,capacity"));
  event.types.sort((a, b) => a.name.localeCompare(b.name));
  checked(await admin.from("events").update({ status: "published" }).eq("id", event.id));
  await register(event, count);
  await register(event, otherCount, 1);
  return event;
}

async function snapshot(fixture) {
  const types = checked(await admin.from("ticket_types").select("id,name,capacity,event_id").eq("event_id", fixture.id).order("id"));
  const registrations = checked(await admin.from("registrations").select("id,event_id,ticket_type_id,tickets(id,registration_id,status,checked_in_at,checked_in_by)").eq("event_id", fixture.id).order("id"));
  return { types, registrations };
}

async function login(page) {
  const unexpected = [];
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" || !["3114", "55421"].includes(url.port) || url.pathname === "/api/registros") {
      unexpected.push(url.origin + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/organizador");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tus eventos", exact: true })).toBeVisible();
  expect(unexpected).toEqual([]);
}

async function openType(page, fixture) {
  const article = page.getByRole("article").filter({ has: page.getByRole("heading", { name: fixture.title, exact: true }) });
  const trigger = article.getByRole("listitem").filter({ hasText: "General ·" }).getByRole("button", { name: "Editar", exact: true });
  await trigger.click();
  return { dialog: page.getByRole("dialog"), trigger };
}

async function assertSave(page, fixture, capacity, expectedError = null) {
  const before = await snapshot(fixture);
  const { dialog } = await openType(page, fixture);
  await dialog.getByLabel("Aforo", { exact: true }).fill(String(capacity));
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  if (expectedError) {
    await expect(dialog.getByRole("alert")).toHaveText(expectedError);
    await expect(dialog.getByLabel("Aforo", { exact: true })).toHaveValue(String(capacity));
    await expect(dialog).toBeVisible();
  } else {
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: "Tipo de entrada guardado." })).toBeVisible();
  }
  const after = await snapshot(fixture);
  assert.deepEqual(after.registrations, before.registrations);
  if (expectedError) assert.deepEqual(after, before);
  else assert.equal(after.types.find(type => type.id === fixture.types[0].id).capacity, capacity);
  evidence.push({ scenario: `capacity ${capacity}${expectedError ? " rejected" : " accepted"}`, expectedError, before, after });
  if (expectedError) await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
}

test("minimum rejection preserves persisted identities and inputs; keyboard and responsive retry", async ({ page }) => {
  const event = await fixture();
  await login(page);
  const before = await snapshot(event);
  const { dialog, trigger } = await openType(page, event);
  const name = "General con nombre largo para comprobar conservación y distribución del formulario";
  await dialog.getByLabel("Nombre del tipo", { exact: true }).fill(name);
  const capacity = dialog.getByLabel("Aforo", { exact: true });
  await capacity.fill("19");
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(minimumMessage);
  await expect(capacity).toHaveValue("19");
  await expect(dialog.getByLabel("Nombre del tipo", { exact: true })).toHaveValue(name);
  await expect(capacity).toHaveAttribute("aria-invalid", "true");
  await expect(capacity).toHaveAttribute("aria-describedby", "ticketType-capacity-help ticketType-error");
  const after = await snapshot(event);
  assert.deepEqual(after, before);
  evidence.push({ scenario: "minimum 19 rejected with 20 registrations", before, after, message: minimumMessage });
  mkdirSync(evidenceDirectory(), { recursive: true });
  for (const [width, height, label] of [[390, 844, "mobile"], [1280, 900, "desktop"]]) {
    await page.setViewportSize({ width, height });
    await dialog.getByRole("alert").scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const bounds = await dialog.getByRole("alert").boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= height);
    await capacity.focus();
    await page.keyboard.press("Tab");
    const cancel = dialog.getByRole("button", { name: "Cancelar", exact: true });
    await expect(cancel).toBeFocused();
    assert.equal(await cancel.evaluate(element => element.matches(":focus-visible")), true);
    await page.screenshot({ path: resolve(evidenceDirectory(), `capacity-error-${label}.png`) });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog.getByRole("alert")).toHaveText(minimumMessage);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  // Reopen only for the keyboard review above; the acceptance retry below stays
  // in its own rejected form without reopening between 19 and 20.
  await trigger.click();
  await dialog.getByLabel("Nombre del tipo", { exact: true }).fill(name);
  await capacity.fill("19");
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(minimumMessage);
  await capacity.fill("20");
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog).toBeHidden();
  const retried = await snapshot(event);
  assert.deepEqual(retried.registrations, before.registrations);
  assert.equal(retried.types.find(type => type.id === event.types[0].id).capacity, 20);
  assert.equal(retried.types.find(type => type.id === event.types[0].id).name, name);
  evidence.push({ scenario: "same-form retry 19 to 20 with reduced motion", before: after, after: retried });
});

test("equal, valid reduction, maximum and invalid native values preserve registrations", async ({ page }) => {
  const event = await fixture();
  await login(page);
  for (const capacity of [20, 25, 40]) await assertSave(page, event, capacity);
  for (const value of ["41", "", "0", "-1", "1.5"]) {
    const before = await snapshot(event);
    const { dialog } = await openType(page, event);
    const capacity = dialog.getByLabel("Aforo", { exact: true });
    await capacity.fill(value);
    await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    assert.equal(await capacity.evaluate(element => element.validity.valid), false);
    await expect(dialog).toBeVisible();
    assert.deepEqual(await snapshot(event), before);
    evidence.push({ scenario: `native invalid ${JSON.stringify(value)}`, beforeHash: digest(before), afterHash: digest(await snapshot(event)) });
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  }
});

test("a stale local maximum receives the authoritative maximum error", async ({ page }) => {
  const event = await fixture({ otherCapacity: 50 });
  await login(page);
  const { dialog } = await openType(page, event);
  checked(await admin.from("ticket_types").update({ capacity: 60 }).eq("id", event.types[1].id));
  const before = await snapshot(event);
  await dialog.getByLabel("Aforo", { exact: true }).fill("41");
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(maximumMessage);
  assert.deepEqual(await snapshot(event), before);
  evidence.push({ scenario: "stale maximum 41 rejected after other type grows to 60", before, after: await snapshot(event), message: maximumMessage });
});

test("the minimum uses the edited type and permits capacity one with no registrations", async ({ page }) => {
  const counted = await fixture({ capacity: 10, otherCapacity: 40, count: 5, otherCount: 25 });
  const empty = await fixture({ capacity: 10, count: 0 });
  await login(page);
  await assertSave(page, counted, 5);
  await assertSave(page, empty, 1);
});

test("a new completed registration before save raises the current minimum", async ({ page }) => {
  const event = await fixture();
  await login(page);
  const { dialog } = await openType(page, event);
  await register(event, 1);
  const before = await snapshot(event);
  assert.equal(before.registrations.length, 21);
  await dialog.getByLabel("Aforo", { exact: true }).fill("20");
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(minimumMessage);
  await expect(dialog.getByLabel("Aforo", { exact: true })).toHaveValue("20");
  assert.deepEqual(await snapshot(event), before);
  evidence.push({ scenario: "new registration raises minimum to 21", before, after: await snapshot(event), message: minimumMessage });
});

test("15 valid plus 4 used plus 1 revoked still require capacity twenty", async ({ page }) => {
  const event = await fixture();
  const initial = await snapshot(event);
  const ids = initial.registrations.map(row => row.id);
  checked(await admin.from("tickets").update({ status: "used" }).in("registration_id", ids.slice(15, 19)));
  checked(await admin.from("tickets").update({ status: "revoked" }).eq("registration_id", ids[19]));
  await login(page);
  await assertSave(page, event, 19, minimumMessage);
  await assertSave(page, event, 20);
});
