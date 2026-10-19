// S8 Finale (UX 14.5, FR-45) on the REAL bridge and core: a visitor does all
// four missions (Squares with two steps by hand, Primes and Trajectory with
// the rest done for them), taps Finish, and the finale shows that visit's
// real numbers and the room with the real attract flight's lamps. With
// SCREENSHOTS=1 it writes docs/screenshots/m3/finale-*.png from the real core.

import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { SQUARES_STEPS, doStepByTouch, mainBtn, tap, tapSlow, toStep1, view } from "../e2e/helpers.ts";
import { recordSent, sent } from "./real.ts";

const SHOTS = !!process.env.SCREENSHOTS;
const dir = join(__dirname, "..", "..", "..", "docs", "screenshots", "m3");
const shot = async (page: Page, name: string, settle = 700) => {
  if (!SHOTS) return;
  await page.waitForTimeout(settle);
  await page.screenshot({ path: join(dir, `${name}.png`) });
};
const beat = (page: Page) => page.locator(".fin-beat");

test.beforeEach(async ({ page }) => {
  await recordSent(page);
});

/** The bridge's core is up (this bridge's own /healthz). */
async function coreReady(page: Page): Promise<void> {
  await expect.poll(async () => (await (await page.request.get("/healthz")).json()).core?.state, { timeout: 60_000 }).toBe("up");
}

test("a whole visit on the real core ends in the finale with that visit's real numbers", async ({ page }) => {
  test.setTimeout(480_000);
  await page.goto("/");
  await coreReady(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await page.waitForTimeout(650);

  // Mission 1, Squares: the first two steps by hand, the rest skipped; Skip to the answer.
  await tapSlow(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await toStep1(page);
  await doStepByTouch(page, SQUARES_STEPS[0]);
  await tapSlow(page, mainBtn(page));
  await doStepByTouch(page, SQUARES_STEPS[1]);
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 90_000 });
  await expect(page.locator(".next-btn")).toHaveText("Next: Primes");

  // Mission 2, Primes: setup done for us, INIT, Skip to the answer (card 100).
  await tapSlow(page, page.locator(".next-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("What is a prime?");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 40_000 });
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(page.locator(".result-answer h2")).toBeVisible({ timeout: 150_000 });
  await expect(page.locator(".next-btn")).toHaveText("Next: Trajectory");

  // Mission 3, Trajectory: setup done for us, READ, INIT, the whole flight.
  await tapSlow(page, page.locator(".next-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("The path of a shell");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".read-btn"));
  await expect(page.locator(".init-btn")).not.toHaveClass(/disabled/, { timeout: 10_000 });
  await tap(page, page.locator(".init-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 150_000 });
  await expect(page.locator(".live-line")).toHaveText(/\d+ hops, \d+ cards/, { timeout: 30_000 });
  await expect(page.locator(".next-btn")).toHaveText("Next: Difference");

  // Mission 4, Difference: setup done for us, INIT, then Skip to the answer (row 20).
  await tapSlow(page, page.locator(".next-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("A table, made by adding");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 40_000 });
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(page.locator(".result-answer h2")).toBeVisible({ timeout: 150_000 });
  await expect(page.locator(".finish-btn")).toHaveText("Finish");
  await shot(page, "finale-0-result-finish");

  await tapSlow(page, page.locator(".finish-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  const s = await page.evaluate(() => (window as any).__eniac.visit.summary());
  expect(s.done).toEqual(["squares", "primes", "trajectory", "difference"]);
  expect(s.handCables).toBe(1);
  expect(s.handSwitches).toBe(1);

  // F1: the store's real numbers, as the visitor made them.
  const plates = page.locator(".fin-mplate");
  await expect(plates).toHaveCount(4);
  const sq = s.missions.squares.squares;
  await expect(plates.nth(0)).toContainText(`${sq.n}`);
  await expect(plates.nth(1)).toContainText(`${s.missions.primes.cards.cards} cards punched. The last prime was ${s.missions.primes.cards.last.toLocaleString("en-US")}.`);
  await expect(plates.nth(2)).toContainText(`A shell's flight, in ${s.missions.trajectory.flight.hops} hops.`);
  await expect(plates.nth(3)).toContainText(`ENIAC built ${s.missions.difference.cards.cards} rows of a table, by adding alone.`);
  await shot(page, "finale-1-you-programmed-eniac");

  // F2: the room, 38 of 40 panels ringed, the attract flight's real lamps.
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "2");
  await expect(page.locator(".fin-caption")).toHaveText(/^You used 38 of ENIAC's 40 panels\./);
  await expect(page.locator(".fin-room [id^='lamp:'].on").first()).toBeAttached({ timeout: 20_000 });
  await shot(page, "finale-2-every-unit-you-used", 6000);
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "3");
  await shot(page, "finale-3-brian-stuart");
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "4");
  await expect(page.locator(".beat-f4 .person-plate.on")).toHaveCount(12, { timeout: 8000 });
  await shot(page, "finale-4-the-people", 800);
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "5");
  await shot(page, "finale-5-thanks");
  expect((await sent(page)).filter((m) => m.t === "metric" && m.ev === "finale_beat").map((m) => m.n)).toEqual([1, 2, 3, 4, 5]);
  await tap(page, page.locator(".fin-start-over"));
  await expect(view(page)).toHaveAttribute("data-view", "start");
});
