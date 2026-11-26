import { test, expect } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const eventId = "d98afce0-d1e2-4fc9-a5ed-e50d547812da";
const ownerId = "d98afce0-d1e2-4fc9-a5ed-e50d547812db";
const typeId = "d98afce0-d1e2-4fc9-a5ed-e50d547812dd";
const ticketCode = "a".repeat(64);
const minimumMessage = "El aforo no puede ser inferior al número de asistentes ya registrados en este tipo de entrada.";
const maximumMessage = "El aforo supera el disponible para este evento. Revisa los datos.";
const registration = { id: "d98afce0-d1e2-4fc9-a5ed-e50d547812dc", name: "Ana Pérez", email: "ana@example.com", ticketType: "General", ticketStatus: "valid", ticketCode, checkedInAt: null };

// Uses production components, the real SDK and real RHF. No database is contacted.
async function fixture(page, baseURL) {
  test.skip(!baseURL?.includes(":3117"), "Requires the isolated forms preview on port 3117");
  const state = {
    auth: [], writes: [], searches: [], admissions: [], unexpected: [], writeFailure: null, authFailure: false,
    searchStatus: 200, ticketStatus: "valid", delay: 0,
    event: { id: eventId, title: "Encuentro de prueba", description: "Datos ficticios", venue: "Sala de prueba", starts_at: "2027-01-01T20:00:00Z", status: "published", capacity: 100, event_covers: [], ticket_types: [{ id: typeId, event_id: eventId, name: "General", capacity: 30 }, { id: "type-b", event_id: eventId, name: "VIP", capacity: 60 }] },
  };
  const expiresAt = 4102444800;
  const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: ownerId, exp: expiresAt })).toString("base64url"), "fixture"].join(".");
  const session = { access_token: jwt, refresh_token: "fixture-refresh", token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user: { id: ownerId, email: "owner@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } };
  await page.route("**/*", async route => {
    const request = route.request(); const url = new URL(request.url());
    const json = (body, status = 200) => route.fulfill({ status, json: body });
    if (url.hostname === "forms.supabase.invalid") {
      if (url.pathname === "/auth/v1/token") {
        state.auth.push(request.postDataJSON());
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
        return state.authFailure ? json({ error_code: "invalid_credentials", msg: "PRIVATE provider error" }, 400) : json(session);
      }
      if (url.pathname === "/auth/v1/logout") return json({});
      if (url.pathname === "/auth/v1/user") return json(session.user);
      if (url.pathname === "/rest/v1/events" || url.pathname === "/rest/v1/ticket_types") {
        if (request.method() === "GET") return json([state.event]);
        const body = request.postDataJSON();
        state.writes.push({ table: url.pathname.split("/").at(-1), method: request.method(), body, search: url.search });
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
        if (state.writeFailure) return json(state.writeFailure, 400);
        if (url.pathname.endsWith("/events")) { Object.assign(state.event, body); return json({ id: eventId }); }
        if (request.method() === "POST") state.event.ticket_types.push({ id: "type-new", ...body });
        else Object.assign(state.event.ticket_types.find(type => type.id === typeId), body);
        return json(null);
      }
    }
    if (url.origin === baseURL) {
      if (url.pathname === "/api/organizador/sesion") return json({ userId: ownerId, email: session.user.email });
      if (/\/api\/organizador\/eventos\/[^/]+\/portada$/.test(url.pathname)) return json({ coverRevision: null, cover: null });
      if (url.pathname === "/api/organizador/eventos") return json({ events: [{ id: eventId, title: state.event.title, status: "published" }] });
      if (url.pathname === "/api/organizador/check-in/buscar") {
        state.searches.push(request.postDataJSON());
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
        return json(state.searchStatus === 200 ? { registration: { ...registration, ticketStatus: state.ticketStatus, ticketCode: state.ticketStatus === "valid" ? ticketCode : null } } : { error: "PRIVATE provider error" }, state.searchStatus);
      }
      if (url.pathname === "/api/organizador/check-in") {
        state.admissions.push(request.postDataJSON());
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
        return json({ status: "valid", name: registration.name, ticketType: "General", checkedInAt: "2026-11-26T20:00:00Z" });
      }
      if (!url.pathname.startsWith("/api/")) return route.continue();
    }
    state.unexpected.push(url.origin + url.pathname); return route.abort();
  });
  return state;
}
async function login(page) {
  await page.goto("/organizador");
  await page.getByLabel("Correo", { exact: true }).fill("owner@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill(" pass word ");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tus eventos", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Encuentro de prueba", exact: true })).toBeVisible();
}
async function openType(page) {
  await page.getByRole("listitem").filter({ hasText: "General ·" }).getByRole("button", { name: "Editar", exact: true }).click();
  return page.getByRole("dialog");
}
async function fillEvent(dialog) {
  await dialog.getByLabel("Nombre del evento", { exact: true }).fill(" Nuevo encuentro ");
  await dialog.getByLabel("Descripción", { exact: true }).fill(" Descripción nueva ");
  await dialog.getByLabel("Lugar", { exact: true }).fill(" Sala nueva ");
  await dialog.getByLabel("Fecha y hora", { exact: true }).fill("2027-01-01T15:00");
  await dialog.getByLabel("Límite de asistentes", { exact: true }).fill("100");
}

test("organizer login validates locally, preserves password, reports safe errors and retries", async ({ page, baseURL }) => {
  const h = await fixture(page, baseURL); await page.goto("/organizador");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Correo", { exact: true })).toBeFocused();
  await expect(page.getByText("Ingresa tu contraseña.", { exact: true })).toBeVisible();
  expect(h.auth).toHaveLength(0);
  await page.getByLabel("Correo", { exact: true }).fill("owner@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill(" pass word ");
  h.authFailure = true; h.delay = 100;
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Entrando…", exact: true })).toBeDisabled();
  await expect(page.getByText("El correo o la contraseña no son correctos. Revisa tus datos e inténtalo de nuevo.")).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue(" pass word ");
  expect(h.auth[0].password).toBe(" pass word ");
  expect(await page.locator("body").textContent()).not.toContain("PRIVATE");
  h.authFailure = false;
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tus eventos", exact: true })).toBeVisible();
  expect(h.unexpected).toEqual([]);
});

for (const width of [390, 1280]) test(`event forms validate, create, reset and preserve pending cover at ${width}px`, async ({ page, baseURL }) => {
  const h = await fixture(page, baseURL);
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.emulateMedia({ reducedMotion: "reduce" }); await login(page);
  await page.getByRole("button", { name: "Crear evento", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Crear evento", exact: true }).click();
  await expect(dialog.getByLabel("Nombre del evento", { exact: true })).toBeFocused();
  expect(h.writes).toHaveLength(0);
  await fillEvent(dialog);
  // A local preview must survive saving unrelated Event values.
  await dialog.getByLabel("Imagen de portada", { exact: true }).setInputFiles({ name: "preview.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS7sAAAAASUVORK5CYII=", "base64") });
  await expect(dialog.getByText("Vista previa sin guardar", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Crear evento", exact: true }).click();
  await expect(dialog.getByText("Evento creado. Guarda ahora la portada.", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Vista previa sin guardar", { exact: true })).toBeVisible();
  expect(h.writes[0].body).toMatchObject({ title: "Nuevo encuentro", description: "Descripción nueva", venue: "Sala nueva", capacity: 100, starts_at: "2027-01-01T20:00:00.000Z" });
  expect(h.writes[0].body).not.toHaveProperty("startsAt");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Crear evento", exact: true }).click();
  await expect(dialog.getByLabel("Nombre del evento", { exact: true })).toHaveValue("");
  await expect(dialog.locator('[aria-invalid="true"]')).toHaveCount(0);
  await dialog.getByLabel("Nombre del evento", { exact: true }).fill("Un encuentro con un título muy largo para comprobar la distribución del formulario en pantallas pequeñas");
  await dialog.getByRole("button", { name: "Crear evento", exact: true }).click();
  await expect(dialog.getByLabel("Descripción", { exact: true })).toBeFocused();
  await expect(dialog.getByLabel("Descripción", { exact: true })).toHaveAccessibleDescription("Ingresa la descripción del evento.");
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel("Imagen de portada", { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), `door-list-event-form-${width}.png`) });
  expect(h.unexpected).toEqual([]);
});

test("event editing enforces allocation and handles a server constraint without losing inputs", async ({ page, baseURL }) => {
  const h = await fixture(page, baseURL); await login(page);
  await page.getByRole("button", { name: "Editar evento", exact: true }).click();
  const dialog = page.getByRole("dialog"); const capacity = dialog.getByLabel("Límite de asistentes", { exact: true });
  await capacity.fill("89"); await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog.getByText("El límite debe ser al menos 90, el aforo ya asignado.")).toBeVisible();
  expect(h.writes).toHaveLength(0);
  await capacity.fill("90"); h.writeFailure = { code: "23514", message: "private constraint" };
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(capacity).toBeFocused(); await expect(capacity).toHaveAttribute("aria-invalid", "true");
  await expect(capacity).toHaveValue("90");
  h.writeFailure = null; await capacity.fill("100");
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog).toBeHidden(); expect(h.writes).toHaveLength(2); expect(h.unexpected).toEqual([]);
});

for (const failure of ["minimum", "maximum", "unknown"]) test(`type form maps ${failure} errors, prevents duplicates and retries`, async ({ page, baseURL }) => {
  const h = await fixture(page, baseURL); await login(page); const dialog = await openType(page);
  const capacity = dialog.getByLabel("Aforo", { exact: true }); const name = dialog.getByLabel("Nombre del tipo", { exact: true });
  await capacity.fill("41"); await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog.getByText("El aforo disponible para este tipo es 40.")).toBeVisible(); expect(h.writes).toHaveLength(0);
  await capacity.fill("20"); await name.fill("General con nombre largo que conservamos al fallar el guardado");
  h.writeFailure = failure === "minimum" ? { code: "23514", message: "El aforo no puede ser menor que los registros existentes" } : failure === "maximum" ? { code: "23514", message: "La suma de aforos de las entradas supera el límite del evento" } : { code: "42501", message: "PRIVATE permission" };
  h.delay = 200;
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Guardando…", exact: true })).toBeDisabled();
  // A programmatic duplicate submission is guarded as well as the disabled button.
  await dialog.locator("form").evaluate(form => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  await expect(dialog.getByRole("alert")).toHaveText(failure === "minimum" ? minimumMessage : failure === "maximum" ? maximumMessage : "No pudimos guardar el tipo de entrada. Inténtalo de nuevo.");
  expect(h.writes).toHaveLength(1); await expect(capacity).toHaveValue("20"); await expect(name).toHaveValue("General con nombre largo que conservamos al fallar el guardado");
  await expect(capacity).toHaveAttribute("aria-invalid", failure === "unknown" ? "false" : "true");
  if (failure !== "unknown") await expect(capacity).toBeFocused();
  h.writeFailure = null; await capacity.fill("25");
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click(); await expect(dialog).toBeHidden();
  expect(h.writes[1]).toMatchObject({ table: "ticket_types", body: { capacity: 25, event_id: eventId } });
  expect(h.writes[1].search).toContain(`id=eq.${typeId}`);
  expect(h.unexpected).toEqual([]);
});

test("type creation resets errors and respects zero available capacity", async ({ page, baseURL }) => {
  const h = await fixture(page, baseURL); await login(page);
  await openType(page); await page.getByLabel("Aforo", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByLabel("Aforo", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Agregar tipo", exact: true }); await trigger.click();
  const dialog = page.getByRole("dialog"); await expect(dialog.getByLabel("Aforo", { exact: true })).toHaveValue("");
  await expect(dialog.locator('[aria-invalid="true"]')).toHaveCount(0);
  await dialog.getByLabel("Nombre del tipo", { exact: true }).fill("Estudiantes"); await dialog.getByLabel("Aforo", { exact: true }).fill("10");
  await dialog.getByRole("button", { name: "Guardar tipo", exact: true }).click(); await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused(); expect(h.writes[0]).toMatchObject({ method: "POST", body: { name: "Estudiantes", capacity: 10 } });
  h.event.capacity = h.event.ticket_types.reduce((sum, type) => sum + type.capacity, 0);
  await page.reload(); await trigger.click();
  await expect(dialog.getByRole("button", { name: "Guardar tipo", exact: true })).toBeDisabled();
  await expect(dialog.getByText(/No quedan plazas disponibles/)).toBeVisible(); expect(h.unexpected).toEqual([]);
});

test("session recovery validates credentials and preserves Event and cover drafts", async ({ page, baseURL }) => {
  const h = await fixture(page, baseURL); await login(page);
  await page.getByRole("button", { name: "Crear evento", exact: true }).click();
  const dialog = page.getByRole("dialog"); await fillEvent(dialog);
  await dialog.getByLabel("Imagen de portada", { exact: true }).setInputFiles({ name: "preview.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS7sAAAAASUVORK5CYII=", "base64") });
  await page.evaluate(() => { const channel = new BroadcastChannel("sb-forms-auth-token"); channel.postMessage({ event: "SIGNED_OUT", session: null }); channel.close(); });
  const recovery = page.getByRole("form", { name: "Recuperar sesión" }); await expect(recovery).toBeVisible();
  await recovery.getByRole("button", { name: "Recuperar sesión", exact: true }).click();
  await expect(recovery.getByText("Ingresa tu contraseña.")).toBeVisible(); expect(h.auth).toHaveLength(1);
  await recovery.getByLabel("Contraseña", { exact: true }).fill(" pass word ");
  await recovery.getByRole("button", { name: "Recuperar sesión", exact: true }).click(); await expect(recovery).toBeHidden();
  await expect(dialog.getByLabel("Nombre del evento", { exact: true })).toHaveValue(" Nuevo encuentro ");
  await expect(dialog.getByText("Vista previa sin guardar", { exact: true })).toBeVisible();
  expect(h.unexpected).toEqual([]);
});

test("manual codes show inline errors and submit normalized input once", async ({ page, baseURL }) => {
  const h = await fixture(page, baseURL); await login(page); await page.goto("/scan");
  await page.getByRole("button", { name: "Ingresar código", exact: true }).click();
  const input = page.getByLabel("Código de la entrada", { exact: true });
  await input.fill("short"); await page.getByRole("button", { name: "Validar entrada", exact: true }).click();
  await expect(input).toBeFocused(); await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Ingresa el código completo de 64 caracteres que aparece debajo del QR.")).toBeVisible();
  expect(h.admissions).toHaveLength(0);
  await input.fill(` ${ticketCode} `); h.delay = 200;
  await page.getByRole("button", { name: "Validar entrada", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmando ingreso…", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Válida", exact: true })).toBeVisible();
  expect(h.admissions).toEqual([{ eventId, ticketCode }]); expect(h.unexpected).toEqual([]);
});

test("email form validates and normalizes, preserves lookup results and requires explicit admission", async ({ page, baseURL }) => {
  const h = await fixture(page, baseURL); await login(page); await page.goto("/scan");
  await page.getByRole("button", { name: "Buscar por email", exact: true }).click();
  const email = page.getByLabel("Email del asistente", { exact: true }); const search = () => page.getByRole("button", { name: "Buscar asistente", exact: true }).click();
  await email.fill("bad"); await search(); await expect(email).toHaveAttribute("aria-invalid", "true"); expect(h.searches).toHaveLength(0);
  await email.fill(" ANA@EXAMPLE.COM "); await search();
  const admit = page.getByRole("button", { name: "Registrar ingreso", exact: true }); await expect(admit).toBeEnabled();
  expect(h.searches).toEqual([{ eventId, email: "ana@example.com" }]); expect(h.admissions).toHaveLength(0);
  await email.fill("other@example.com"); await expect(admit).toBeDisabled();
  await email.fill("ana@example.com"); h.searchStatus = 503; await search();
  await expect(page.getByText("No pudimos buscar al asistente. Revisa la conexión y vuelve a buscar.")).toBeVisible(); await expect(admit).toBeDisabled();
  expect(await page.locator("body").textContent()).not.toContain("PRIVATE");
  h.searchStatus = 200;
  for (const status of ["used", "revoked", null]) { h.ticketStatus = status; await search(); await expect(admit).toBeDisabled(); }
  h.ticketStatus = "valid"; await search(); await expect(admit).toBeEnabled(); await admit.click();
  await expect(page.getByRole("heading", { name: "Válida", exact: true })).toBeVisible(); expect(h.admissions).toHaveLength(1); expect(h.unexpected).toEqual([]);
});

test("email not-found stays a status, duplicate searches are blocked and switching mode aborts", async ({ page, baseURL }) => {
  const h = await fixture(page, baseURL); await login(page); await page.goto("/scan");
  await page.getByRole("button", { name: "Buscar por email", exact: true }).click();
  await page.getByLabel("Email del asistente", { exact: true }).fill("ana@example.com");
  h.searchStatus = 404; await page.getByRole("button", { name: "Buscar asistente", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "No encontramos un registro con ese email" })).toBeVisible();
  h.searchStatus = 200; h.delay = 500;
  await page.getByRole("button", { name: "Buscar asistente", exact: true }).click();
  await expect(page.getByRole("button", { name: "Buscando asistente…", exact: true })).toBeDisabled();
  await page.locator("form").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  let aborted = false; page.on("requestfailed", request => { if (request.url().endsWith("/check-in/buscar")) aborted = true; });
  await page.getByRole("button", { name: "Ingresar código", exact: true }).click();
  await expect.poll(() => aborted).toBe(true); expect(h.searches).toHaveLength(2); expect(h.admissions).toHaveLength(0); expect(h.unexpected).toEqual([]);
});
