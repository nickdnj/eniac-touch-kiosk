// Feature clip: S16 Keeping ENIAC alive and the "Find the dead tube"
// re-enactment (docs/video/tubes.mp4), on the REAL bridge. Not part of CI.
// From src/web:
//   NARRATE=1 npx playwright test -c ../../tests/web/video/playwright.config.ts clip-tubes

import { test, expect, type Page } from "@playwright/test";
import { tap, tapSlow, view } from "../e2e/helpers.ts";
import { card, cap, capAt, overlays, pause, say } from "./overlay.ts";
import { cutFrom, cutTo, finishNarration, narration } from "./narrate.ts";

const rail = (page: Page) => page.locator(".tb-rail");
const target = (page: Page, i: number) => page.locator(`.tb-target[data-i="${i}"]`);

test("clip: tubes", async ({ page }) => {
  test.setTimeout(600_000);
  await overlays(page);
  await narration(page, "tubes");
  await cutFrom(page, "loading");
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await page.waitForTimeout(700);
  await tapSlow(page, page.locator(".pk-explore"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".ex-live")).toHaveText(/LIVE/, { timeout: 30_000 });
  await cutTo(page);
  await card(page, "<h1>Keeping ENIAC alive</h1><p>About 18,000 vacuum tubes, and how a crew found the one that died.</p><small>ENIAC Touch Kiosk · recorded live</small>", 4000);

  await capAt(page, 700, 150);
  await tapSlow(page, page.locator(".ex-tubes-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await expect(rail(page).locator("h2")).toHaveText("The tubes");
  await cap(page, "Each dot is one vacuum tube");
  await pause(page, 1500);
  await tapSlow(page, rail(page).locator(".tb-next"));
  await cap(page, "Power and heat: about 150 kilowatts");
  await pause(page, 1500);
  await tapSlow(page, rail(page).locator(".tb-myth-link"));
  await cap(page, "Myth check");
  await pause(page, 1500);
  await tapSlow(page, rail(page).locator(".tb-myth-back"));
  await tapSlow(page, rail(page).locator(".tb-next"));
  await cap(page, "Why tubes burned out");
  await pause(page, 1000);
  await tapSlow(page, rail(page).locator(".tb-next"));
  await cap(page, "The hunt: which unit, which circuit, which tube?");
  await tapSlow(page, rail(page).locator(".tb-cta"));
  await expect(rail(page).locator("h2")).toHaveText("Run the test");
  await cap(page, "A re-enactment that follows the 1946 maintenance manual");
  await tapSlow(page, rail(page).locator(".tb-run"));
  await expect(rail(page).locator("h2")).toHaveText("Which panel is wrong?");
  await say(page, "(tubes: which panel)");
  await tap(page, target(page, 0));
  await expect(rail(page).locator(".tb-fb")).toContainText("Not quite");
  await pause(page, 1200);
  await tapSlow(page, target(page, 1));
  await expect(target(page, 2)).toHaveClass(/ring2/);
  await say(page, "(tubes: the ring)");
  await tapSlow(page, target(page, 2));
  await expect(rail(page).locator("h2")).toHaveText("Which digit place?");
  await say(page, "(tubes: which place)");
  await tapSlow(page, target(page, 3));
  await expect(rail(page).locator("h2")).toHaveText("Which tube?");
  await say(page, "(tubes: which tube)");
  await tapSlow(page, target(page, 0));
  await pause(page, 900);
  await tapSlow(page, target(page, 1));
  await pause(page, 900);
  await tapSlow(page, target(page, 2));
  await expect(rail(page).locator("h2")).toHaveText("Plug in a fresh unit");
  await say(page, "(tubes: cold)");
  await tapSlow(page, rail(page).locator(".tb-plug"));
  await expect(rail(page).locator(".tb-win")).toBeVisible();
  await cap(page, "Fixed! Every lamp lines up on 5");
  await pause(page, 2500);
  await cap(page, null);
  await card(page, "<h1>Thank you</h1><p>Simulator: Brian L. Stuart, Drexel University — github.com/blstuart/eniac-simulator</p><p>Sources: the 1946 Report on the ENIAC and its maintenance manual; J. Presper Eckert, interviewed in 1989</p><small>ENIAC Touch Kiosk · Vintage Computer Federation museum</small>", 5000);
  await finishNarration(page);
});
