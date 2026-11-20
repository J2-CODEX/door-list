import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

// Mailosaur's REST API keeps this suite independent of an additional email SDK.
// https://mailosaur.com/docs/api
async function inboxRequest(path, apiKey, options = {}) {
  const response = await fetch(`https://mailosaur.com/api/${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });
  assert.ok(response.ok, `Test inbox request failed (HTTP ${response.status})`);
  return response;
}

export async function receiveTicketEmail({ serverId, apiKey, recipient, eventTitle, receivedAfter }) {
  const query = new URLSearchParams({ server: serverId, receivedAfter, itemsPerPage: "10" });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const response = await inboxRequest(`messages/search?${query}`, apiKey, {
      method: "POST",
      body: JSON.stringify({ sentTo: recipient, subject: eventTitle, match: "ALL" }),
    });
    const result = await response.json();
    const messageId = result.items?.[0]?.id;
    if (messageId) {
      const message = await (await inboxRequest(`messages/${encodeURIComponent(messageId)}`, apiKey)).json();
      const attachment = message.attachments?.find(file => file.fileName === "entrada-qr.png");
      assert.ok(attachment?.id, "Delivered email must include entrada-qr.png");
      assert.equal(attachment.contentType, "image/png");
      const file = await inboxRequest(`files/attachments/${encodeURIComponent(attachment.id)}`, apiKey);
      const qr = Buffer.from(await file.arrayBuffer());
      assert.ok(qr.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "QR attachment must be a PNG");
      return { message, qr };
    }
    await delay(2_000);
  }
  throw new Error("No ticket email arrived in the test inbox within 90 seconds");
}
