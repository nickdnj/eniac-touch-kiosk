// Playwright config for the HQ clips: NO recordVideo (hqcap.ts captures), no webServer (run `make dev` first, :8740).
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  outputDir: "../../../build/video/hq/pw",
  workers: 1,
  timeout: 600_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:8740", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false, bypassCSP: true, video: "off" },
});
