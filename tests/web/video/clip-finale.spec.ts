// Feature clip: the S8 finale (docs/video/finale.mp4), after a real visit
// on the REAL bridge and core. The three missions are done off camera (the
// cut is logged and removed by the mux; the narration says so). Not part of
// CI. From src/web:
//   NARRATE=1 npx playwright test -c ../../tests/web/video/playwright.config.ts clip-finale

import { test, expect } from "@playwright/test";
import { tap, tapSlow, view } from "../e2e/helpers.ts";
import { card, cap, capAt, overlays, pause, say } from "./overlay.ts";
import { cutFrom, cutTo, finishNarration, narration } from "./narrate.ts";
import { onBeat, primesAndTrajectoryQuickly, squaresQuickly } from "./flows.ts";

test("clip: finale", async ({ page }) => {
  test.setTimeout(1_200_000);
  await overlays(page);
  await narration(page, "finale");
  await cutFrom(page, "a whole visit, off camera");
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await page.waitForTimeout(700);
  await squaresQuickly(page);
  await primesAndTrajectoryQuickly(page);
  await cutTo(page);
  await card(page, "<h1>The finale</h1><p>Finish all three missions, and the kiosk shows each visitor what they did, then thanks the people behind ENIAC.</p><small>ENIAC Touch Kiosk · recorded live on the real simulator</small>", 4000);

  await capAt(page, 1350, 330); // clear of the result's buttons
  await cap(page, "Mission 3 done: all three missions, so the button says Finish");
  await pause(page, 1500);
  await cap(page, null);
  await tapSlow(page, page.locator(".finish-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  await onBeat(page, 1);
  await say(page, "(finale: f1)");
  await tap(page, page.locator(".fin-next"));
  await onBeat(page, 2);
  await say(page, "(finale: f2)");
  await page.waitForTimeout(2500); // F2 pans the room
  await tap(page, page.locator(".fin-next"));
  await onBeat(page, 3);
  await say(page, "(finale: f3)");
  await tap(page, page.locator(".fin-next"));
  await onBeat(page, 4);
  await say(page, "(finale: f4)");
  await tap(page, page.locator(".fin-next"));
  await onBeat(page, 5);
  await say(page, "(finale: f5)");
  await page.waitForTimeout(1500);
  await card(page, "<h1>Thank you</h1><p>Simulator: Brian L. Stuart, Drexel University — github.com/blstuart/eniac-simulator</p><small>ENIAC Touch Kiosk · Vintage Computer Federation museum</small>", 5000);
  await finishNarration(page);
});
