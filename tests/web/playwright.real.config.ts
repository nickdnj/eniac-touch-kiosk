// Playwright e2e against the REAL bridge and the real simulator core
// (architecture 11.2/11.3): `eniac-bridge serve --dev` built with
// `make bridge-dev`, serving src/web through esbuild's Go API.
// Prerequisite: `make upstream` (the darwin core). Run from src/web:
//   npm run e2e:real          (or `make e2e` from the repo root)
// The bridge's debug log (every core stdin write as `core< ...`) goes to
// build/e2e/bridge.log; the specs read it to check exactly what the core got.

import { defineConfig, devices } from "@playwright/test";

export const REAL_PORT = 8752;

export default defineConfig({
  testDir: "./e2e-real",
  outputDir: "./.playwright-results-real",
  fullyParallel: false,
  workers: 1, // one bridge, one core, like the kiosk
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${REAL_PORT}`,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: false,
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "make -C ../.. bridge-dev && mkdir -p ../../build/e2e && exec ../../build/dev/eniac-bridge serve --dev --config e2e-real/config.e2e.yaml 2> ../../build/e2e/bridge.log",
    cwd: __dirname,
    url: `http://127.0.0.1:${REAL_PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
