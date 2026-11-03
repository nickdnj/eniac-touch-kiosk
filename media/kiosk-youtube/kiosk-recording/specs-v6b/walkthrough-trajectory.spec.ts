// The Trajectory walkthrough (docs/video/eniac-touch-walkthrough-trajectory.mp4),
// recorded live on the REAL bridge and simulator core, like the Squares and
// Primes ones. Not part of CI. From src/web:
//   npx playwright test -c ../../tests/web/video/playwright.config.ts walkthrough-trajectory

import { test, expect } from "@playwright/test";
import { tap, tapSlow, hit, mainBtn, feedback, view } from "../e2e/helpers.ts";
import { card, cap, overlays, pause } from "./overlay.ts";
import { finishNarration, narration } from "./narrate.ts";

test("ENIAC touch kiosk walkthrough: Trajectory", async ({ page }) => {
  test.setTimeout(600_000);
  await overlays(page);
  await narration(page, "trajectory");
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await card(page, "<h1>Mission 3: Trajectory</h1><p>ENIAC works out the path of a cannon shell, a punched card for every second of flight, from Brian L. Stuart's reconstruction of the shell trajectory from ENIAC's February 15, 1946 unveiling.</p><small>Prototype · Trajectory mission · recorded live on the real simulator</small>", 5000);

  await tap(page, page.locator(".screen.start"));
  await expect(page.locator('.mission-card[data-mission="trajectory"]')).toBeVisible();
  await cap(page, "Three missions in a suggested order. Trajectory is number 3");
  await pause(page, 3500);
  await tapSlow(page, page.locator('.mission-card[data-mission="trajectory"] .mc-start'));

  await expect(page.locator(".step-card h2")).toHaveText("The path of a shell");
  await cap(page, "Each card ENIAC punches is one dot. Join the dots: the path");
  await pause(page, 7500);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Hop by hop");
  await cap(page, "Each hop: one second of flight, in 50 tiny steps, then a card is punched");
  await pause(page, 9000);
  await tapSlow(page, mainBtn(page));

  await cap(page, "Step 1: the card reader tells ENIAC it is done");
  await pause(page, 2500);
  await tapSlow(page, hit(page, "jack:i.ro"));
  await pause(page, 800);
  await tapSlow(page, hit(page, "trunk:1-2"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2000);
  await tapSlow(page, mainBtn(page));

  await cap(page, "Step 2: punch the hop number on every card");
  await pause(page, 2500);
  await tapSlow(page, hit(page, "sw:pr.6"));
  await pause(page, 1200);
  await tapSlow(page, page.locator('.picker .pick[data-value="P"]'));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2000);

  await cap(page, "Skip ahead: 293 cables and 1,147 switches, most of them the drag table");
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await pause(page, 4000);
  await tapSlow(page, mainBtn(page));

  await expect(view(page)).toHaveAttribute("data-view", "run");
  await cap(page, "First READ: the real card of numbers goes into ENIAC");
  await pause(page, 3500);
  await tapSlow(page, page.locator(".read-btn"));
  await expect(page.locator(".init-btn")).not.toHaveClass(/disabled/, { timeout: 10_000 });
  await cap(page, "97,367 is in Accumulator 1. Now INIT: one press flies the shell");
  await pause(page, 3000);
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".card-label")).toHaveText("Hop 1", { timeout: 20_000 });
  await cap(page, "Each card is one hop: how far along, how high up. Each dot is a real card");
  await pause(page, 9000);
  await cap(page, "The multiplier and the drag table work between cards");
  await expect(page.locator(".arc-tag.apex")).toBeVisible({ timeout: 60_000 });
  await cap(page, "Highest point: from here the shell comes down");
  await expect(page.locator(".run-prompt")).toHaveText("You did it!", { timeout: 90_000 });
  await cap(page, "Landed: the height dropped below zero, and ENIAC stops on that card");
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 10_000 });
  await pause(page, 1500);
  await cap(page, "34 hops, 34 cards: the whole flight, drawn from the punched cards");
  await pause(page, 7000);
  await cap(page, null);

  await card(page, "<h1>Thank you</h1><p>Simulator: Brian L. Stuart, Drexel University — github.com/blstuart/eniac-simulator</p><p>Programs: trajdemo.e and drag.e</p><small>Trajectory mission · M2 prototype · not for distribution</small>", 6000);
  await finishNarration(page);
});
