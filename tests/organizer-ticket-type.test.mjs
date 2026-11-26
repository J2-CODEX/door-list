import assert from "node:assert/strict";
import test from "node:test";
import { createEventFormSchema, createTicketTypeFormSchema } from "../lib/organizer-forms.ts";
import { manualCheckInSchema } from "../lib/check-in.ts";

// Component submissions are exercised with real hooks in e2e/forms-ui.spec.mjs.
const event = { title: " Encuentro ", description: " Descripción ", venue: " Sala ", startsAt: "2027-01-01T15:00", status: "draft", capacity: "100" };
test("event values trim text, keep camelCase and convert capacity once", () => {
  assert.deepEqual(createEventFormSchema().parse(event), { ...event, title: "Encuentro", description: "Descripción", venue: "Sala", capacity: 100 });
});
test("event fields and calendar dates report Spanish validation errors", () => {
  for (const [field, value] of [["title", "   "], ["description", ""], ["venue", "  "], ["startsAt", ""], ["startsAt", "invalid"], ["startsAt", "2027-02-30T15:00"], ["status", "other"]]) {
    const result = createEventFormSchema().safeParse({ ...event, [field]: value });
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].path[0], field);
    assert.match(result.error.issues[0].message, /Ingresa|Selecciona/);
  }
});
test("capacities reject blanks, decimals, non-finite values and integer overflow", () => {
  for (const capacity of ["", " ", "0", "-1", "1.5", "2147483648", "Infinity", "NaN"]) {
    assert.equal(createEventFormSchema().safeParse({ ...event, capacity }).success, false);
    assert.equal(createTicketTypeFormSchema(2147483647).safeParse({ name: "General", capacity }).success, false);
  }
  assert.equal(createTicketTypeFormSchema(2147483647).parse({ name: " General ", capacity: "2147483647" }).capacity, 2147483647);
});
test("allocated event capacity and available type capacity enforce current boundaries", () => {
  assert.equal(createEventFormSchema(100).safeParse(event).success, true);
  assert.equal(createEventFormSchema(101).safeParse(event).error.issues[0].path[0], "capacity");
  for (const capacity of ["1", "20", "25", "40"]) assert.equal(createTicketTypeFormSchema(40).parse({ name: "General", capacity }).capacity, Number(capacity));
  assert.equal(createTicketTypeFormSchema(40).safeParse({ name: "General", capacity: "41" }).error.issues[0].message, "El aforo disponible para este tipo es 40.");
  assert.equal(createTicketTypeFormSchema(0).safeParse({ name: "General", capacity: "1" }).success, false);
  assert.equal(createTicketTypeFormSchema(40).safeParse({ name: "   ", capacity: "1" }).error.issues[0].path[0], "name");
});
test("manual codes trim without following URLs", () => {
  assert.equal(manualCheckInSchema.parse({ ticketCode: ` ${"a".repeat(64)} ` }).ticketCode, "a".repeat(64));
  for (const ticketCode of ["", "short", "A".repeat(64), `https://example.com/${"a".repeat(64)}`]) {
    const result = manualCheckInSchema.safeParse({ ticketCode });
    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /código completo/);
  }
});
