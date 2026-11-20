import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const localEnvironment = fileURLToPath(new URL("./tests/e2e/.env.local", import.meta.url));
if (existsSync(localEnvironment)) loadEnvFile(localEnvironment);

// No server is started implicitly: the operator chooses the authorized test DB
// when starting the app. Listing tests never opens a database connection.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.mjs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  preserveOutput: "never",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    timezoneId: "America/Guayaquil",
    // Login credentials and ticket codes must not be saved in traces/reports.
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
