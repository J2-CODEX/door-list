import assert from "node:assert/strict";
import test from "node:test";
import { loginSchema, loginErrorMessage } from "../lib/login.ts";

test("login trims email but preserves the existing password exactly", () => {
  const values = loginSchema.parse({ email: " organizer@example.com ", password: " pass word " });
  assert.equal(values.email, "organizer@example.com");
  assert.equal(values.password, " pass word ");
  // Existing credentials must not be rejected by new signup complexity rules.
  assert.equal(loginSchema.safeParse({ email: "organizer@example.com", password: "short" }).success, true);
});
test("login rejects absent credentials and malformed emails with field-specific Spanish errors", () => {
  for (const email of ["", "   ", "not-an-email", "user@", `${"x".repeat(255)}@example.com`]) {
    const result = loginSchema.safeParse({ email, password: "password" });
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].path[0], "email");
    assert.match(result.error.issues[0].message, /correo/);
  }
  const result = loginSchema.safeParse({ email: "organizer@example.com", password: "" });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path[0], "password");
  assert.match(result.error.issues[0].message, /contraseña/);
});
test("login errors distinguish rate limits and service failures without exposing account existence", () => {
  assert.equal(loginErrorMessage(400), loginErrorMessage(401));
  assert.match(loginErrorMessage(429), /Espera unos minutos/);
  assert.match(loginErrorMessage(503), /servicio/);
  assert.match(loginErrorMessage(), /conexión/);
});
