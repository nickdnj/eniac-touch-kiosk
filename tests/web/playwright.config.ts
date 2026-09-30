// Playwright e2e against the DEV-ONLY mock bridge (tests/web/mock).
// Run from src/web:  npm run e2e
// The real-bridge suite (tests/e2e, architecture 11.3) reuses these specs
// once #8-#11 land; only the base URL and the /__mock controls differ.

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 8751);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./.playwright-results",
  fullyParallel: false,
  workers: 1, // one mock bridge = one machine, like the kiosk
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: false,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node ./mock/devserver.mjs`,
    cwd: __dirname,
    env: { PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
