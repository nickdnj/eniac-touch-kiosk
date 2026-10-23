// Shared moves for the narrated videos (not part of CI): the quick way
// through Missions 2 and 3 on the real core, so the finale has a real visit.
import { expect, type Page } from "@playwright/test";
import { tap, tapSlow, mainBtn, view } from "../e2e/helpers.ts";

export const scene = (page: Page) => page.locator(".screen.attract");

/** The attract flight's punched cards so far (S1 or Explore). */
export const attractCards = (page: Page) => page.evaluate(() => (window as any).__eniac.attract.cards.count as number);

/** From the Squares result (S7): Primes, Trajectory, then Difference, each with Skip and
 *  Skip to the answer, ending on Difference's result with Finish showing. */
export async function primesAndTrajectoryQuickly(page: Page): Promise<void> {
  await expect(page.locator(".next-btn")).toHaveText("Next: Primes");
  await tapSlow(page, page.locator(".next-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("What is a prime?");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await tapSlow(page, mainBtn(page));
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 60_000 });
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(page.locator(".result-answer h2")).toBeVisible({ timeout: 240_000 });
  await expect(page.locator(".next-btn")).toHaveText("Next: Trajectory");

  await tapSlow(page, page.locator(".next-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("The path of a shell");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".read-btn"));
  await expect(page.locator(".init-btn")).not.toHaveClass(/disabled/, { timeout: 20_000 });
  await tap(page, page.locator(".init-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 300_000 });
  await expect(page.locator(".live-line")).toHaveText(/\d+ hops, \d+ cards/, { timeout: 30_000 });
  await expect(page.locator(".next-btn")).toHaveText("Next: Difference");

  await tapSlow(page, page.locator(".next-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("A table, made by adding");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await tapSlow(page, mainBtn(page));
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 60_000 });
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(page.locator(".result-answer h2")).toBeVisible({ timeout: 240_000 });
  await expect(page.locator(".finish-btn")).toHaveText("Finish");
}

/** Squares from the picker, with Skip and Skip to the answer, to its result. */
export async function squaresQuickly(page: Page): Promise<void> {
  await tapSlow(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 120_000 });
}

/** Lets a finale beat play out, but never past its own auto-advance (15 s). */
export async function onBeat(page: Page, n: number): Promise<void> {
  await expect(page.locator(".fin-beat")).toHaveAttribute("data-beat", String(n));
}
