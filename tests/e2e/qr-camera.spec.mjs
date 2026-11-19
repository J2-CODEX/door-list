import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import QRCode from "qrcode";
import { expect, test } from "@playwright/test";
import { installQrCamera } from "./support/qr-camera.mjs";

const require = createRequire(import.meta.url);

test("the test camera feeds video frames to the real QR decoder without external services", async ({ page }) => {
  const scannerDirectory = dirname(require.resolve("qr-scanner"));
  const sourceFiles = new Map(await Promise.all(["qr-scanner.min.js", "qr-scanner-worker.min.js"].map(async file => [
    `/${file}`, await readFile(join(scannerDirectory, file)),
  ])));
  const server = createServer((request, response) => {
    const source = sourceFiles.get(request.url);
    if (source) {
      response.writeHead(200, { "Content-Type": "text/javascript" }).end(source);
      return;
    }
    if (request.url !== "/") { response.writeHead(404).end(); return; }
    response.writeHead(200, { "Content-Type": "text/html" }).end(`<!doctype html>
      <html lang="en"><title>QR camera verification</title><body>
      <video muted playsinline></video><output aria-label="Decoded QR"></output>
      <script type="module">
        import QrScanner from "/qr-scanner.min.js";
        const scanner = new QrScanner(document.querySelector("video"), result => {
          document.querySelector("output").textContent = result.data;
          scanner.stop();
        }, { returnDetailedScanResult: true });
        await scanner.start();
      </script></body></html>`);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const ticketCode = "0123456789abcdef".repeat(4);
    const png = await QRCode.toBuffer(ticketCode, { width: 360, margin: 4, errorCorrectionLevel: "M" });
    await installQrCamera(page, png);
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await expect(page.getByLabel("Decoded QR")).toHaveText(ticketCode);
  } finally {
    await page.close();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
