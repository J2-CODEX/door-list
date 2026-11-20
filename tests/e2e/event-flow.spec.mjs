import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { receiveTicketEmail } from "./support/inbox.mjs";
import { installQrCamera } from "./support/qr-camera.mjs";

test.skip(process.env.RUN_E2E_DB_TESTS !== "1", "Requires explicit database authorization and RUN_E2E_DB_TESTS=1");

test.beforeAll(() => {
  const required = ["E2E_ORGANIZER_EMAIL", "E2E_ORGANIZER_PASSWORD", "MAILOSAUR_SERVER_ID", "MAILOSAUR_API_KEY"];
  const missing = required.filter(name => !process.env[name]);
  expect(missing, "Configure the dedicated organizer and controlled test inbox before running").toEqual([]);
});

test("publish an event, register, receive its ticket and scan it exactly once", async ({ page, browser, baseURL }) => {
  const runId = randomUUID();
  const eventTitle = `E2E Door List ${runId}`;
  const attendeeName = `Asistente E2E ${runId.slice(0, 8)}`;
  const ticketTypeName = "General E2E";
  const recipient = `door-list-${runId}@${process.env.MAILOSAUR_SERVER_ID}.mailosaur.net`;
  const receivedAfter = new Date().toISOString();
  const attendeeContext = await browser.newContext({ baseURL, timezoneId: "America/Guayaquil" });
  const attendee = await attendeeContext.newPage();
  let eventId;
  let ticketPath;
  let ticketCode;
  let qr;

  try {
    await test.step("Log in as the test organizer", async () => {
      await page.goto("/iniciar-sesion");
      await page.getByLabel("Correo electrónico", { exact: true }).fill(process.env.E2E_ORGANIZER_EMAIL);
      await page.getByLabel("Contraseña", { exact: true }).fill(process.env.E2E_ORGANIZER_PASSWORD);
      await page.getByRole("button", { name: "Entrar a mi panel", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    await test.step("Create a draft, assign its TicketType and publish through the UI", async () => {
      await page.goto("/organizador");
      await page.getByRole("button", { name: "Crear evento" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Nombre del evento", { exact: true }).fill(eventTitle);
      await dialog.getByLabel("Descripción", { exact: true }).fill("Evento aislado para comprobar el flujo completo.");
      await dialog.getByLabel("Lugar", { exact: true }).fill("Puerta de pruebas E2E");
      // A future date makes the test independent of the Ecuador registration cutoff.
      const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
      await dialog.getByLabel("Fecha y hora", { exact: true }).fill(`${futureDate}T18:00`);
      await dialog.getByLabel("Límite de asistentes", { exact: true }).fill("2");
      await dialog.getByLabel("Estado", { exact: true }).selectOption("draft");
      await dialog.getByRole("button", { name: "Crear evento", exact: true }).click();
      await expect(dialog).toBeHidden();
      const event = page.getByRole("article").filter({ has: page.getByRole("heading", { name: eventTitle, exact: true }) });
      await expect(event).toBeVisible();
      await expect(event.getByRole("link", { name: "Ver página de registro" })).toHaveCount(0);
      const headingId = await event.getByRole("heading", { name: eventTitle, exact: true }).getAttribute("id");
      eventId = headingId?.replace(/^event-/, "");
      expect(eventId).toMatch(/^[0-9a-f-]{36}$/);
      await attendee.goto(`/eventos/${eventId}/registro`);
      await expect(attendee.getByRole("heading", { name: "Este evento no está disponible para registro", exact: true })).toBeVisible();
      await page.bringToFront();
      await event.getByRole("button", { name: "Agregar tipo", exact: true }).click();
      await dialog.getByLabel("Nombre del tipo", { exact: true }).fill(ticketTypeName);
      await dialog.getByLabel("Aforo", { exact: true }).fill("2");
      await dialog.getByRole("button", { name: "Guardar tipo", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(event.getByText(`${ticketTypeName} · 2 plazas`, { exact: true })).toBeVisible();
      await event.getByRole("button", { name: "Editar evento", exact: true }).click();
      await dialog.getByLabel("Estado", { exact: true }).selectOption("published");
      await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
      await expect(dialog).toBeHidden();
      const link = event.getByRole("link", { name: "Ver página de registro" });
      await expect(link).toBeVisible();
      const path = await link.getAttribute("href");
      expect(path).toBe(`/eventos/${eventId}/registro`);
      await attendee.goto(path);
    });

    await test.step("Register anonymously and open the issued Ticket", async () => {
      await expect(attendee.getByRole("heading", { name: eventTitle, exact: true })).toBeVisible();
      await attendee.getByRole("radio", { name: new RegExp(ticketTypeName) }).check();
      await attendee.getByLabel("Tu nombre").fill(attendeeName);
      await attendee.getByLabel("Correo electrónico").fill(recipient);
      const registrationResponse = attendee.waitForResponse(response => response.url().endsWith("/api/registros") && response.request().method() === "POST");
      await attendee.getByRole("button", { name: "Confirmar mi registro" }).click();
      const response = await registrationResponse;
      expect(response.status()).toBe(201);
      const registration = await response.json();
      expect(registration.emailStatus, "Resend must accept the initial confirmation email").toBe("sent");
      await expect(attendee.getByRole("heading", { name: "Tu lugar está confirmado", exact: true })).toBeVisible();
      const ticketLink = attendee.getByRole("link", { name: "Ver mi entrada y QR" });
      ticketPath = await ticketLink.getAttribute("href");
      ticketCode = ticketPath?.match(/^\/entradas\/([0-9a-f]{64})$/)?.[1];
      expect(ticketCode).toBeTruthy();
      expect(registration.ticketCode).toBe(ticketCode);
      await ticketLink.click();
      await expect(attendee.getByRole("heading", { name: "Tu entrada", exact: true })).toBeVisible();
      await expect(attendee.getByText(attendeeName, { exact: true })).toBeVisible();
      await expect(attendee.getByText(recipient, { exact: true })).toBeVisible();
      await expect(attendee.getByRole("img", { name: "Código QR de tu entrada", exact: true })).toBeVisible();
      await attendee.reload();
      await expect(attendee.getByText("Válida", { exact: true })).toBeVisible();
    });

    await test.step("Receive the real confirmation email and its matching QR attachment", async () => {
      const delivered = await receiveTicketEmail({
        serverId: process.env.MAILOSAUR_SERVER_ID,
        apiKey: process.env.MAILOSAUR_API_KEY,
        recipient, eventTitle, receivedAfter,
      });
      expect(delivered.message.to.some(address => address.email.toLowerCase() === recipient)).toBe(true);
      expect(delivered.message.subject).toBe(`Tu entrada para ${eventTitle} | Door List`);
      expect(delivered.message.text.body).toContain(attendeeName);
      expect(delivered.message.text.body).toContain(ticketTypeName);
      expect(delivered.message.text.body).toContain(`Código de la entrada: ${ticketCode}`);
      expect(delivered.message.html.body).toContain("cid:door-list-ticket-qr");
      qr = delivered.qr;
    });

    await test.step("Scan the delivered QR with the real decoder and persist check-in", async () => {
      await installQrCamera(page, qr);
      await page.bringToFront();
      const checkInResponse = page.waitForResponse(response => response.url().endsWith("/api/organizador/check-in") && response.request().method() === "POST");
      await page.goto(`/scan?eventId=${encodeURIComponent(eventId)}`);
      await expect(page.getByLabel("Evento que estás controlando")).toHaveValue(eventId);
      const response = await checkInResponse;
      expect(response.status()).toBe(200);
      expect(response.request().postDataJSON()).toEqual({ eventId, ticketCode });
      const result = await response.json();
      expect(result).toMatchObject({ status: "valid", name: attendeeName, ticketType: ticketTypeName });
      expect(Number.isNaN(Date.parse(result.checkedInAt))).toBe(false);
      await expect(page.getByRole("heading", { name: "Válida", exact: true })).toBeVisible();
      await expect(page.getByText("Puede ingresar", { exact: true })).toBeVisible();
      await expect(page.getByText(attendeeName, { exact: true })).toBeVisible();
      await attendee.reload();
      await expect(attendee.getByRole("heading", { name: "Entrada utilizada", exact: true })).toBeVisible();
    });

    await test.step("Reject a second scan of the same Ticket", async () => {
      await page.bringToFront();
      const duplicateResponse = page.waitForResponse(response => response.url().endsWith("/api/organizador/check-in") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Escanear otra entrada", exact: true }).click();
      const response = await duplicateResponse;
      expect(response.status()).toBe(409);
      expect(await response.json()).toEqual({ error: expect.any(String) });
      await expect(page.getByRole("heading", { name: "Usada", exact: true })).toBeVisible();
      await expect(page.getByText("No permitir ingreso", { exact: true })).toBeVisible();
    });
  } finally {
    // Fixtures remain in the isolated project for inspection. No service-role key,
    // direct SQL, deletion of registrations or production cleanup is performed.
    await attendeeContext.close();
  }
});
