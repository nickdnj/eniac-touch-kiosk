// THROWAWAY F1 (Shorts footage): attract untouched 24 s, ONE tap on the pill, Pick a mission 6 s after fade-in, ONE tap on Squares Start, 3.5 s.
//   CLEAN=1 npx playwright test -c ../../tests/web/video/playwright.config.ts clip-attract-tap
import { test, expect } from "@playwright/test";
import { view } from "../e2e/helpers.ts";
import { logEvents, events } from "./shorts-events.ts";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

test("F1 attract-tap", async ({ page }) => {
  test.setTimeout(300_000);
  await logEvents(page);
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await page.waitForTimeout(24_000);
  const pill = page.locator(".start-pill");
  const b = (await pill.boundingBox())!;
  await page.touchscreen.tap(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
  await expect(page.locator('.mission-card[data-mission="squares"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getAnimations().length), { timeout: 15_000 }).toBe(0);
  await page.waitForTimeout(6_000);
  const s = (await page.locator('.mission-card[data-mission="squares"] .mc-start').boundingBox())!;
  await page.touchscreen.tap(Math.round(s.x + s.width / 2), Math.round(s.y + s.height / 2));
  await page.waitForTimeout(3_500);
  writeFileSync(join(__dirname, "..", "..", "..", "build", "video", "takes", "attract-tap-events.json"), JSON.stringify({ pillBox: b, events: await events(page) }, null, 1));
});
