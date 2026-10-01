// Re-records the walkthrough video against the REAL bridge and simulator core
// (docs/video/). Not part of CI. From src/web:
//   npx playwright test -c ../../tests/web/video/playwright.config.ts
// then: ffmpeg -i ../../build/video/out/*/video.webm -c:v libx264 -crf 24 -pix_fmt yuv420p \
//   -movflags +faststart ../../docs/video/eniac-touch-walkthrough-squares.mp4
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  outputDir: "../../../build/video/out",
  workers: 1,
  timeout: 600_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:8762",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: false,
    bypassCSP: true,
    video: { mode: "on", size: { width: 1920, height: 1080 } },
  },
  webServer: {
    command:
      "make -C ../../.. bridge-dev && mkdir -p ../../../build/video && exec ../../../build/dev/eniac-bridge serve --dev --config config.video.yaml 2> ../../../build/video/bridge.log",
    cwd: __dirname,
    url: "http://127.0.0.1:8762/healthz",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
