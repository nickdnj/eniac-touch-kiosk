// The Squares walkthrough (docs/video/eniac-touch-walkthrough-squares.mp4).
import { test, expect } from "@playwright/test";
import { tap, tapSlow, hit, mainBtn, feedback, view } from "../e2e/helpers.ts";
import { card, cap, overlays, pause } from "./overlay.ts";

test("ENIAC touch kiosk walkthrough", async ({ page }) => {
  await overlays(page);
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await card(page, "<h1>ENIAC Touch Kiosk</h1><p>A touch-screen prototype for museum visitors, running Brian L. Stuart's pulse-level ENIAC simulator.</p><small>Prototype · Squares mission · recorded live on the real simulator</small>", 6000);

  await cap(page, "Attract screen: a visitor walks up and touches");
  await pause(page, 3000);
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator('.mission-card[data-mission="squares"]')).toBeVisible();
  await cap(page, "Pick a mission");
  await pause(page, 2500);
  await tapSlow(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));

  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await cap(page, "What is a square? Tiles on a floor");
  await pause(page, 6000);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  await cap(page, "The trick: a bigger square is a row, a column and a corner added");
  await pause(page, 10000);
  await tapSlow(page, mainBtn(page));

  await expect(page.locator(".step-card h2")).toHaveText("Dial in the number 1");
  await cap(page, "Step 1: set a dial on the Constant Transmitter");
  await pause(page, 3500);
  await tapSlow(page, hit(page, "sw:c.j1"));
  await pause(page, 1200);
  await tapSlow(page, page.locator('.picker .pick[data-value="4"]'));
  await cap(page, "A wrong choice gets a gentle hint, and never reaches the simulator");
  await pause(page, 3500);
  await tapSlow(page, hit(page, "sw:c.j1"));
  await pause(page, 800);
  await tapSlow(page, page.locator('.picker .pick[data-value="1"]'));
  await expect(feedback(page)).toHaveClass(/ok/);
  await cap(page, null);
  await pause(page, 2500);
  await tapSlow(page, mainBtn(page));

  await cap(page, "Step 2: plug a cable — tap one jack, then the other");
  await pause(page, 3500);
  await tapSlow(page, hit(page, "jack:c.o"));
  await pause(page, 900);
  await tapSlow(page, hit(page, "trunk:1"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 3000);
  await tapSlow(page, mainBtn(page));

  await cap(page, "Step 3: carry the number to Accumulator 1");
  await pause(page, 3000);
  await tapSlow(page, hit(page, "trunk:1"));
  await pause(page, 900);
  await tapSlow(page, hit(page, "jack:a1.α"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2500);

  await cap(page, "Short on time? Skip ahead — the rest is wired automatically");
  await pause(page, 2500);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await pause(page, 4000);
  await tapSlow(page, mainBtn(page));

  await expect(view(page)).toHaveAttribute("data-view", "run");
  await cap(page, "Press INIT — ENIAC's GO button. Lamps show the simulator's real accumulators.");
  await pause(page, 4000);
  for (let i = 0; i < 3; i++) {
    await tap(page, page.locator(".init-btn"));
    await expect(page.locator(".init-btn")).toHaveClass(/busy/);
    await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 30_000 });
    await pause(page, 3500);
  }
  await cap(page, "1, 4, 9 … each press adds a row, a column and a corner");
  await pause(page, 3500);
  await cap(page, "Skip to the answer: full speed up to 12 × 12");
  await pause(page, 2000);
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 90_000 });
  await cap(page, null);
  await pause(page, 8000);
  await cap(page, null);

  await card(page, "<h1>Thank you</h1><p>Simulator: Brian L. Stuart, Drexel University — github.com/blstuart/eniac-simulator</p><p>Touch front end: prototype for the Vintage Computer Federation museum</p><small>Squares mission · M1 prototype · not for distribution</small>", 7000);
});
