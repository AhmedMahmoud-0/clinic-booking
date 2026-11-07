import { createRequire } from "node:module";
import { defineConfig, devices } from "@playwright/test";

// @next/env is exposed as a CommonJS module in the installed Next.js runtime.
// Use createRequire so Playwright's ESM config loader does not rely on Node's
// static named-export detection for a CommonJS package.
const require = createRequire(import.meta.url);
const nextEnv = require("@next/env") as {
  loadEnvConfig: (projectDir: string, dev?: boolean) => unknown;
};

// Load the same development environment that Next.js uses so Playwright and
// Better Auth share one canonical application origin.
nextEnv.loadEnvConfig(process.cwd(), true);

const configuredAuthUrl = process.env.BETTER_AUTH_URL?.trim();
if (!configuredAuthUrl) {
  throw new Error(
    "BETTER_AUTH_URL must be set in the project environment before running Playwright.",
  );
}

let authUrl: URL;
try {
  authUrl = new URL(configuredAuthUrl);
} catch {
  throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
}

if (authUrl.protocol !== "http:" && authUrl.protocol !== "https:") {
  throw new Error("BETTER_AUTH_URL must use HTTP or HTTPS.");
}

if (
  authUrl.username ||
  authUrl.password ||
  authUrl.pathname !== "/" ||
  authUrl.search ||
  authUrl.hash
) {
  throw new Error(
    "BETTER_AUTH_URL must contain only the application origin, without a path or credentials.",
  );
}

const baseURL = authUrl.origin;
const hostname = authUrl.hostname;
const port = authUrl.port || (authUrl.protocol === "https:" ? "443" : "80");
const httpsFlag = authUrl.protocol === "https:" ? " --experimental-https" : "";
const webServerCommand = `npm run dev -- --hostname ${hostname} --port ${port}${httpsFlag}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  outputDir: "test-results",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: `${baseURL}/login`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
