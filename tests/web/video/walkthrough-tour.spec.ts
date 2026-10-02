// The flagship tour (docs/video/eniac-touch-tour.mp4), narrated by Nick and
// recorded live on the REAL bridge and simulator core: S1 attract, Explore
// ENIAC, the glossary, Keeping ENIAC alive with "Find the dead tube", the
// honor roll, Squares the quick way, then (cut: Missions 2 and 3 off camera)
// the finale. Not part of CI. From src/web:
//   NARRATE=1 npx playwright test -c ../../tests/web/video/playwright.config.ts walkthrough-tour
// then tests/web/video/narration-mux.py tour <video.webm> docs/video/eniac-touch-tour.mp4

import { test, expect, type Page } from "@playwright/test";
import { tap, tapSlow, hit, mainBtn, feedback, view } from "../e2e/helpers.ts";
import { card, cap, capAt, overlays, pause, say, sayOver } from "./overlay.ts";
import { cutFrom, cutTo, finishNarration, narration } from "./narrate.ts";
import { attractCards, onBeat, primesAndTrajectoryQuickly, scene } from "./flows.ts";

const rail = (page: Page) => page.locator(".tb-rail");
const target = (page: Page, i: number) => page.locator(`.tb-target[data-i="${i}"]`);
const tapMinimap = async (page: Page, panel: number) => {
  const mm = (await page.locator(".ex-minimap").boundingBox())!;
  await page.touchscreen.tap(mm.x + 18 + panel * 33 + 16, mm.y + mm.height / 2);
  await page.waitForTimeout(950);
};

test("ENIAC touch kiosk: the whole tour", async ({ page }) => {
  test.setTimeout(1_500_000);
  await overlays(page);
  await narration(page, "tour");
  await cutFrom(page, "loading");
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 60_000 });
  await cutTo(page);
  await card(page, "<h1>ENIAC Touch Kiosk</h1><p>A tour of the whole exhibit, recorded live on Brian L. Stuart's ENIAC simulator.</p><small>Narrated by Nick, a docent at the Vintage Computer Federation museum</small>", 6000);

  // S1: the live attract flight.
  await cap(page, "Nobody is touching it, so ENIAC flies a shell, live");
  await expect.poll(() => attractCards(page), { timeout: 60_000 }).toBeGreaterThanOrEqual(3);
  await cap(page, "Every dot is a real punched card from the simulator");
  await pause(page, 4000);
  await cap(page, "A visitor walks up and touches the screen");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await cap(page, "Three missions, a walk around the room, and an honor roll");
  await pause(page, 1000);
  await tapSlow(page, page.locator(".pk-explore"));

  // S14 Explore ENIAC.
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await capAt(page, 700, 150);
  await expect(page.locator(".ex-live")).toHaveText(/LIVE/, { timeout: 30_000 });
  await cap(page, "Explore ENIAC: the real room, with live lamps");
  sayOver(page, "(tour: pan)");
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await page.waitForTimeout(1800);
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await page.waitForTimeout(1800);
  await tapSlow(page, page.locator(".ex-walk"));
  await tapSlow(page, page.locator(".ex-next"));
  await expect(page.locator(".ex-rail h2")).toHaveText("Cycling Unit");
  await cap(page, "Walk the room: one card for each kind of unit");
  await tapSlow(page, page.locator(".ex-next"));
  await expect(page.locator(".ex-rail h2")).toHaveText("Master Programmer");
  await say(page, "(tour: master programmer)");
  await pause(page, 1000);
  await tapMinimap(page, 27);
  await tapSlow(page, page.locator('.pano-chip[data-id="a18"]'));
  await expect(page.locator(".ex-rail .live-line")).toHaveText(/^Right now, Accumulator 18 holds/);
  await cap(page, "Right now: a live number from the simulator");
  await pause(page, 1500);
  await tapSlow(page, page.locator(".ex-rail .close"));
  await tapSlow(page, page.locator('.ex-mchips .mchip[data-mission="trajectory"]'));
  await expect(page.locator(".pano-unit.k-acc.hl")).toHaveCount(19);
  await cap(page, "Tap a mission to light up the units it uses");
  await tapMinimap(page, 18);
  await pause(page, 2500);
  await tapSlow(page, page.locator(".ex-gloss-btn"));
  await expect(page.locator(".gl-tile")).toHaveCount(8);
  await cap(page, "The glossary: ENIAC's words, in plain English");
  await tapSlow(page, page.locator(".gl-page"));
  await pause(page, 2500);
  await tapSlow(page, page.locator(".gl-close"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");

  // S16 Keeping ENIAC alive.
  await cap(page, null);
  await tapSlow(page, page.locator(".ex-tubes-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await expect(rail(page).locator("h2")).toHaveText("The tubes");
  await cap(page, "Keeping ENIAC alive: about 18,000 vacuum tubes");
  await pause(page, 1500);
  await tapSlow(page, rail(page).locator(".tb-next"));
  await cap(page, "About 150 kilowatts: as much as 1,500 bright bulbs");
  await pause(page, 1500);
  await tapSlow(page, rail(page).locator(".tb-myth-link"));
  await cap(page, "Myth check: did the lights of Philadelphia dim?");
  await pause(page, 1500);
  await tapSlow(page, rail(page).locator(".tb-myth-back"));
  await tapSlow(page, rail(page).locator(".tb-next"));
  await cap(page, "Why tubes burned out");
  await tapSlow(page, rail(page).locator(".tb-next"));
  await cap(page, "The hunt: which unit, which circuit, which tube?");
  await tapSlow(page, rail(page).locator(".tb-cta"));
  await expect(rail(page).locator("h2")).toHaveText("Run the test");
  await cap(page, "Find the dead tube: a re-enactment");
  await tapSlow(page, rail(page).locator(".tb-run"));
  await expect(rail(page).locator("h2")).toHaveText("Which panel is wrong?");
  await cap(page, "Every accumulator should show 5555555555");
  await tap(page, target(page, 0));
  await expect(rail(page).locator(".tb-fb")).toContainText("Not quite");
  await say(page, "(tour: not that one)");
  await tapSlow(page, target(page, 2));
  await expect(rail(page).locator("h2")).toHaveText("Which digit place?");
  await say(page, "(tour: acc 3)");
  await tapSlow(page, target(page, 3));
  await expect(rail(page).locator("h2")).toHaveText("Which tube?");
  await say(page, "(tour: place 4)");
  await tapSlow(page, target(page, 0));
  await expect(target(page, 0)).toHaveClass(/warm/);
  await say(page, "(tour: warm)");
  await tapSlow(page, target(page, 1));
  await pause(page, 900);
  await tapSlow(page, target(page, 2));
  await expect(rail(page).locator("h2")).toHaveText("Plug in a fresh unit");
  await say(page, "(tour: cold)");
  await tapSlow(page, rail(page).locator(".tb-plug"));
  await expect(rail(page).locator(".tb-win")).toBeVisible();
  await cap(page, "Fixed! Every lamp lines up again");
  await pause(page, 1500);
  await cap(page, null);
  await tapSlow(page, page.locator(".tb-back"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await tapSlow(page, page.locator(".ex-back"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await capAt(page);

  // S11 the honor roll.
  await page.waitForTimeout(700);
  await tapSlow(page, page.locator(".picker-honor"));
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  await capAt(page, 960, 40);
  await cap(page, "The honor roll: Brian L. Stuart");
  await pause(page, 1000);
  await tapSlow(page, page.locator(".honor-next"));
  await expect(page.locator(".honor-tab.on")).toHaveText("The first programmers");
  await cap(page, "ENIAC's first programmers");
  await pause(page, 1500);
  await cap(page, null);
  await tapSlow(page, page.locator(".honor-back"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await capAt(page);

  // Mission 1, Squares, the quick way.
  await page.waitForTimeout(700);
  await tapSlow(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await cap(page, "Mission 1, Squares: now I program ENIAC");
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  await say(page, "(tour: the trick)");
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Dial in the number 1");
  await cap(page, "Step 1: set a dial to 1");
  await tapSlow(page, hit(page, "sw:c.j1"));
  await pause(page, 800);
  await tapSlow(page, page.locator('.picker .pick[data-value="1"]'));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 1200);
  await tapSlow(page, mainBtn(page));
  await cap(page, "Step 2: plug a cable, one jack, then the other");
  await tapSlow(page, hit(page, "jack:c.o"));
  await pause(page, 800);
  await tapSlow(page, hit(page, "trunk:1"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 1200);
  await tapSlow(page, mainBtn(page));
  await cap(page, "Short on time? Skip: the rest is wired for you");
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await pause(page, 1500);
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await cap(page, "Press INIT, ENIAC's GO button");
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".init-btn")).toHaveClass(/busy/);
  await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 45_000 });
  await say(page, "(tour: one)");
  await cap(page, "Skip to the answer: every square up to 12 × 12");
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 120_000 });
  await pause(page, 3000);

  // Missions 2 and 3 off camera (said, and cut).
  await cap(page, "Fast-forward: Missions 2 and 3, the quick way");
  await cap(page, null);
  await cutFrom(page, "Missions 2 and 3, done off camera");
  await primesAndTrajectoryQuickly(page);
  await cutTo(page);
  await capAt(page, 1350, 330); // clear of the result's buttons
  await cap(page, "All three missions done: Finish");
  await pause(page, 1500);
  await cap(page, null);

  // S8 the finale.
  await tapSlow(page, page.locator(".finish-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  await onBeat(page, 1);
  await say(page, "(tour: f1)");
  await tap(page, page.locator(".fin-next"));
  await onBeat(page, 2);
  await say(page, "(tour: f2)");
  await page.waitForTimeout(2000); // F2 pans the room
  await tap(page, page.locator(".fin-next"));
  await onBeat(page, 3);
  await say(page, "(tour: f3)");
  await tap(page, page.locator(".fin-next"));
  await onBeat(page, 4);
  await say(page, "(tour: f4)");
  await tap(page, page.locator(".fin-next"));
  await onBeat(page, 5);
  await say(page, "(tour: f5)");
  await page.waitForTimeout(1500);

  await card(page, "<h1>Thank you</h1><p>To Brian L. Stuart of Drexel University, whose ENIAC simulator runs every lamp in this exhibit.</p><p>github.com/blstuart/eniac-simulator</p><small>ENIAC Touch Kiosk · Vintage Computer Federation museum</small>", 7000);
  await finishNarration(page);
});
