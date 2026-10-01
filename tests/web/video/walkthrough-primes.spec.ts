// The Primes walkthrough (docs/video/eniac-touch-walkthrough-primes.mp4),
// recorded live on the REAL bridge and simulator core, like the Squares one.
// Not part of CI. From src/web:
//   npx playwright test -c ../../tests/web/video/playwright.config.ts walkthrough-primes
// then convert build/video/out/<this test>/video.webm with ffmpeg (see
// playwright.config.ts).

import { test, expect, type Page } from "@playwright/test";
import { tap, tapSlow, hit, mainBtn, feedback, view } from "../e2e/helpers.ts";
import { card, cap, overlays, pause } from "./overlay.ts";

const cards = (page: Page) => page.evaluate(() => (window as any).__eniac.cards.count as number);

test("ENIAC touch kiosk walkthrough: Primes", async ({ page }) => {
  test.setTimeout(600_000);
  await overlays(page);
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await card(page, "<h1>Mission 2: Primes</h1><p>ENIAC hunts for prime numbers, the way D. H. Lehmer ran it in July 1946. Brian L. Stuart's simulator, live.</p><small>Prototype · Primes mission · recorded live on the real simulator</small>", 5000);

  await tap(page, page.locator(".screen.start"));
  await expect(page.locator('.mission-card[data-mission="primes"]')).toBeVisible();
  await cap(page, "Missions in a suggested order. Primes is number 2");
  await pause(page, 3500);
  await tapSlow(page, page.locator('.mission-card[data-mission="primes"] .mc-start'));

  await expect(page.locator(".step-card h2")).toHaveText("What is a prime?");
  await cap(page, "What is a prime? Share cookies evenly, on the same tile floor");
  await pause(page, 9500);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  await cap(page, "The trick: group checkers try 3, 5, 7 and more, all at once");
  await pause(page, 11_000);
  await tapSlow(page, mainBtn(page));

  await expect(page.locator(".step-card h2")).toHaveText("Count up by 2");
  await cap(page, "Step 1: only odd numbers, so ENIAC counts up by 2");
  await pause(page, 3000);
  await tapSlow(page, hit(page, "sw:c.k1"));
  await pause(page, 900);
  await tapSlow(page, page.locator('.picker .pick[data-value="2"]'));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2000);
  await tapSlow(page, mainBtn(page));

  await cap(page, "Step 2: the groups-of-3 checker calls out 'fits!' on trunk 1-7");
  await pause(page, 3000);
  await tapSlow(page, hit(page, "jack:a1.12o"));
  await pause(page, 800);
  await tapSlow(page, hit(page, "trunk:1-7"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2500);
  await tapSlow(page, mainBtn(page));

  await cap(page, "Step 3: the Master Programmer listens. A wrong jack gets a hint, never the simulator");
  await pause(page, 3000);
  await tapSlow(page, hit(page, "trunk:1-7"));
  await pause(page, 800);
  await tapSlow(page, hit(page, "jack:p.Ai"));
  await pause(page, 3000);
  await tapSlow(page, hit(page, "jack:p.Adi"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2500);

  await cap(page, "Skip the last two steps: the rest is wired for you, 264 cables and 285 switches");
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await pause(page, 3000);
  await tapSlow(page, mainBtn(page));

  await expect(view(page)).toHaveAttribute("data-view", "run");
  await cap(page, "Press INIT. Slow: every odd number is tested by 14 checkers at once");
  await pause(page, 3000);
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".card-label")).toHaveText("Prime number 1: 3", { timeout: 30_000 });
  await cap(page, "3 won't split into equal groups: a real punched card");
  await expect(page.locator(".gcheck.fits").first()).toBeVisible({ timeout: 20_000 });
  await cap(page, "9 splits into 3 groups of 3: the checker calls 'fits!', so no card");
  await pause(page, 4000);
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 40_000 });
  await cap(page, "Full speed: the card punch sets the pace, a card every 0.6 s");
  await tapSlow(page, page.locator('.speed-btn[data-speed="full"]'));
  await expect.poll(() => cards(page), { timeout: 90_000, intervals: [1000] }).toBeGreaterThanOrEqual(80);
  await cap(page, "Skip to the answer: the first 100 primes");
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(page.locator(".result-answer h2")).toBeVisible({ timeout: 60_000 });
  await cap(page, "Card 100 is 547. The result stays live: ENIAC keeps counting to 2,801");
  await pause(page, 9000);
  await cap(page, null);

  await card(page, "<h1>Thank you</h1><p>Simulator: Brian L. Stuart, Drexel University — github.com/blstuart/eniac-simulator</p><p>Program: sieve.e, after D. H. Lehmer's July 1946 runs, as reconstructed by L. De Mol and M. Bullynck</p><small>Primes mission · M2 prototype · not for distribution</small>", 6000);
});
