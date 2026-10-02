// Feature clip: S14 Explore ENIAC and the glossary (docs/video/explore.mp4),
// on the REAL bridge and core (the room's lamps are the live attract flight).
// Not part of CI. From src/web:
//   NARRATE=1 npx playwright test -c ../../tests/web/video/playwright.config.ts clip-explore

import { test, expect, type Page } from "@playwright/test";
import { tap, tapSlow, view } from "../e2e/helpers.ts";
import { card, cap, capAt, overlays, pause, say, sayOver } from "./overlay.ts";
import { cutFrom, cutTo, finishNarration, narration } from "./narrate.ts";

const tapMinimap = async (page: Page, panel: number) => {
  const mm = (await page.locator(".ex-minimap").boundingBox())!;
  await page.touchscreen.tap(mm.x + 18 + panel * 33 + 16, mm.y + mm.height / 2);
  await page.waitForTimeout(950);
};

test("clip: explore", async ({ page }) => {
  test.setTimeout(600_000);
  await overlays(page);
  await narration(page, "explore");
  await cutFrom(page, "loading");
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await page.waitForTimeout(700);
  await tapSlow(page, page.locator(".pk-explore"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".ex-live")).toHaveText(/LIVE/, { timeout: 30_000 });
  await expect(page.locator(".pano .lamp.on").first()).toBeAttached({ timeout: 30_000 });
  await cutTo(page);
  await card(page, "<h1>Explore ENIAC</h1><p>Walk around the whole machine, panel by panel, with its lamps live from Brian L. Stuart's simulator.</p><small>ENIAC Touch Kiosk · recorded live on the real simulator</small>", 4000);

  await capAt(page, 700, 150);
  await cap(page, "Forty panels in a U, with live lamps");
  sayOver(page, "(explore: pan)");
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await page.waitForTimeout(1500);
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await page.waitForTimeout(1500);
  await tapMinimap(page, 30);
  await page.waitForTimeout(1200);
  await tapSlow(page, page.locator(".ex-walk"));
  await expect(page.locator(".ex-rail h2")).toHaveText("Initiating Unit");
  await cap(page, "Walk the room: twelve cards, one for each kind of unit");
  await tapSlow(page, page.locator(".ex-next"));
  await expect(page.locator(".ex-rail h2")).toHaveText("Cycling Unit");
  await say(page, "(explore: cycling)");
  await tapSlow(page, page.locator(".ex-next"));
  await expect(page.locator(".ex-rail h2")).toHaveText("Master Programmer");
  await say(page, "(explore: master programmer)");
  await tapMinimap(page, 27);
  await tapSlow(page, page.locator('.pano-chip[data-id="a18"]'));
  await expect(page.locator(".ex-rail .live-line")).toHaveText(/^Right now, Accumulator 18 holds/);
  await cap(page, "Tap any panel: this number is live");
  await pause(page, 1500);
  await tapSlow(page, page.locator(".ex-rail .close"));
  await tapSlow(page, page.locator('.ex-mchips .mchip[data-mission="squares"]'));
  await cap(page, "Tap a mission: the room lights up the units it uses");
  await pause(page, 1000);
  await tapSlow(page, page.locator('.ex-mchips .mchip[data-mission="trajectory"]'));
  await expect(page.locator(".pano-unit.k-acc.hl")).toHaveCount(19);
  await tapMinimap(page, 18);
  await say(page, "(explore: trajectory)");
  await pause(page, 1500);
  await tapSlow(page, page.locator(".ex-gloss-btn"));
  await expect(page.locator(".gl-tile")).toHaveCount(8);
  await cap(page, "The glossary: ENIAC's words, in plain English");
  await tapSlow(page, page.locator(".gl-page"));
  await page.waitForTimeout(1800);
  await tapSlow(page, page.locator(".gl-page"));
  await expect(page.locator(".gl-tile b").first()).toHaveText("Vacuum tube");
  await pause(page, 2500);
  await cap(page, null);
  await tapSlow(page, page.locator(".gl-close"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await pause(page, 1500);
  await card(page, "<h1>Thank you</h1><p>Simulator: Brian L. Stuart, Drexel University — github.com/blstuart/eniac-simulator</p><small>ENIAC Touch Kiosk · Vintage Computer Federation museum</small>", 5000);
  await finishNarration(page);
});
