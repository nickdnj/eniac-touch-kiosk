// THROWAWAY F2 (Shorts footage): Squares at Full, one unbroken run 0 to 144 (3 INIT taps, then "Keep pressing for me"),
// hold >= 3.5 s, CLEAR, spare second run, hold. No overlays; event log in-page.
//   CLEAN=1 npx playwright test -c ../../tests/web/video/playwright.config.ts clip-squares-fullspeed
import { test, expect, type Page } from "@playwright/test";
import { tap, tapSlow, mainBtn, view } from "../e2e/helpers.ts";
import { logEvents, events } from "./shorts-events.ts";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

test("F2 squares full speed", async ({ page }) => {
  test.setTimeout(600_000);
  await logEvents(page);
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await page.waitForTimeout(1500);
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator('.mission-card[data-mission="squares"]')).toBeVisible();
  await page.waitForTimeout(2500);
  await tapSlow(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await page.waitForTimeout(2500);
  const marks: Record<string, number> = {};
  const now = () => page.evaluate(() => Math.round(performance.now()));
  const run = async (n: string) => {
    for (let i = 0; i < 3; i++) {
      await tap(page, page.locator(".init-btn"));
      await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText(String((i + 1) * (i + 1)), { timeout: 30_000 });
      await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 30_000 });
      await page.waitForTimeout(250);
    }
    await expect(page.locator(".keep-btn")).toBeVisible();
    await tap(page, page.locator(".keep-btn"));
    await expect(page.locator(".keep-btn")).toHaveClass(/running/);
    await expect(page.locator(".keep-btn")).not.toHaveClass(/running/, { timeout: 120_000 });
    // Keep pressing stops at its answer checkpoint (Accumulator 2 = 121, Accumulator 1 = 12); one more INIT reaches 12 x 12.
    marks[n + "_keep_stopped"] = await now();
    await page.waitForTimeout(900);
    // Only if Keep pressing stopped one short, one more INIT reaches 12 x 12.
    if ((await page.locator('.readout-value[data-acc="2"]').textContent()) === "121") {
      marks[n + "_extra_init"] = await now();
      await tap(page, page.locator(".init-btn"));
    }
    marks[n + "_end"] = await now();
    await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText("144");
    await page.waitForTimeout(3800);
  };
  await tapSlow(page, page.locator('.speed-btn[data-speed="full"]'));
  marks.full = await now();
  await page.waitForTimeout(800);
  marks.run1_start = await now();
  await run("run1");
  await tapSlow(page, page.locator(".clear-btn"));
  await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText("0");
  await page.waitForTimeout(900);
  marks.run2_start = await now();
  await run("run2");
  marks.end = await now();
  writeFileSync(join(__dirname, "..", "..", "..", "build", "video", "takes", "fullspeed-events.json"), JSON.stringify({ marks, events: await events(page) }, null, 1));
});
