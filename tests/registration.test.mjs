import assert from "node:assert/strict";
import test from "node:test";
import { registrationSchema } from "../lib/registration.ts";
const valid = { eventId: "d98afce0-d1e2-4fc9-a5ed-e50d547812da", ticketTypeId: "10129bb0-a573-4683-b5af-aaf4af114958", name: " Juan Pérez ", email: " JUAN@example.com " };
test("normalizes surrounding whitespace and email case", () => {
  const parsed = registrationSchema.parse(valid);
  assert.equal(parsed.name, "Juan Pérez");
  assert.equal(parsed.email, "juan@example.com");
});
test("rejects empty names, invalid email, missing ticket and oversized values", () => {
  for (const override of [{ name: "   " }, { email: "invalid" }, { ticketTypeId: "" }, { eventId: "invalid" }, { name: "x".repeat(201) }, { email: `${"x".repeat(250)}@example.com` }]) {
    assert.equal(registrationSchema.safeParse({ ...valid, ...override }).success, false);
  }
});
