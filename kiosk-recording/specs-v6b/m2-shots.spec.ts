// Screenshots of the M2 screens for review (docs/screenshots/m2), taken on
// the REAL bridge and simulator core: every lamp, number and card is real.
// Not part of CI; only with SHOTS=1. From src/web:
//   SHOTS=1 npx playwright test -c ../../tests/web/video/playwright.config.ts m2-shots

import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { tap, tapSlow, hit, mainBtn, feedback, view } from "../e2e/helpers.ts";

test.skip(!process.env.SHOTS, "set SHOTS=1");

const dir = join(__dirname, "..", "..", "..", "docs", "screenshots", "m2");
const shot = async (page: Page, name: string, settle = 600) => {
  mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(settle);
  await page.screenshot({ path: join(dir, `${name}.png`) });
};
const cards = (page: Page) => page.evaluate(() => (window as any).__eniac.cards.count as number);

test("M2 screenshots: picker and Primes", async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card").first()).toBeVisible();
  await shot(page, "01-picker");
  await page.waitForTimeout(400);
  await tapSlow(page, page.locator('.mission-card[data-mission="primes"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("What is a prime?");
  await expect(page.locator('.share-badge[data-badge="fits"]')).toBeVisible({ timeout: 5000 });
  await shot(page, "02-primes-briefing-fits", 900);
  await expect(page.locator('.share-badge[data-badge="x"]')).toBeVisible({ timeout: 6000 });
  await shot(page, "03-primes-briefing-left-over", 700);
  await expect(page.locator('.share-badge[data-badge="prime"]')).toBeVisible({ timeout: 6000 });
  await shot(page, "04-primes-briefing-prime", 700);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator('.checker[data-k="3"] .fits-chip')).toBeVisible({ timeout: 4000 });
  await shot(page, "05-primes-plan-nine", 300);
  await expect(page.locator(".share-math")).toHaveClass(/on/, { timeout: 12_000 });
  await shot(page, "06-primes-plan-math", 500);
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, hit(page, "sw:c.k1"));
  await shot(page, "07-primes-step1-k-dial", 500);
  await tapSlow(page, page.locator('.picker .pick[data-value="2"]'));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, hit(page, "jack:a1.12o"));
  await shot(page, "08-primes-step2-checker-jack", 300);
  await tapSlow(page, hit(page, "trunk:1-7"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await page.waitForTimeout(1800);
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, hit(page, "trunk:1-7"));
  await tapSlow(page, hit(page, "jack:p.Ai"));
  await shot(page, "09-primes-step3-wrong-tap-hint", 300);
  await tapSlow(page, hit(page, "jack:p.Adi"));
  await page.waitForTimeout(1800);
  await shot(page, "10-primes-workbench-mp", 200);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await shot(page, "11-primes-rest-done-for-you", 400);
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await shot(page, "12-primes-run-before", 500);
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".gcheck.fits").first()).toBeVisible({ timeout: 40_000 });
  await shot(page, "13-primes-run-slow-checker-fits", 50);
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 40_000 });
  await tapSlow(page, page.locator('.speed-btn[data-speed="full"]'));
  await expect.poll(() => cards(page), { timeout: 90_000, intervals: [1000] }).toBeGreaterThanOrEqual(60);
  await shot(page, "14-primes-run-full-cards", 100);
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(page.locator(".result-waiting")).toBeVisible();
  await shot(page, "15-primes-result-waiting", 300);
  await expect(page.locator(".result-answer h2")).toBeVisible({ timeout: 90_000 });
  await shot(page, "16-primes-result", 1500);
  await tapSlow(page, page.locator(".result-actions .menu-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await shot(page, "17-picker-primes-done", 500);
});

test("M2 screenshots: Trajectory", async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await shot(page, "20-picker-three-missions");
  await page.waitForTimeout(400);
  await tapSlow(page, page.locator('.mission-card[data-mission="trajectory"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("The path of a shell");
  await expect(page.locator('[data-figure="traj-briefing"] .arc-trace')).toHaveClass(/on/, { timeout: 6000 });
  await shot(page, "21-traj-briefing-dots", 500);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".hop-label.gravity")).toBeVisible({ timeout: 5000 });
  await shot(page, "22-traj-plan-gravity", 200);
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, hit(page, "jack:i.ro"));
  await shot(page, "23-traj-step1-reader-jack", 300);
  await tapSlow(page, hit(page, "trunk:1-2"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await page.waitForTimeout(1800);
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, hit(page, "sw:pr.6"));
  await shot(page, "24-traj-step2-printer-picker", 500);
  await tapSlow(page, page.locator('.picker .pick[data-value="P"]'));
  await page.waitForTimeout(1500);
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page)); // step 3: Do it for me
  await page.waitForTimeout(1800);
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, hit(page, "jack:a19.6o"));
  await shot(page, "25-traj-step4-wrong-tap", 300);
  await tapSlow(page, hit(page, "jack:a19.5o"));
  await tapSlow(page, hit(page, "trunk:1-4"));
  await page.waitForTimeout(1800);
  await shot(page, "26-traj-workbench", 200);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await shot(page, "27-traj-rest-done-for-you", 400);
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await shot(page, "28-traj-run-before-read", 600);
  await tapSlow(page, page.locator(".read-btn"));
  await expect(page.locator(".init-btn")).not.toHaveClass(/disabled/, { timeout: 10_000 });
  await shot(page, "29-traj-run-card-read", 600);
  await tap(page, page.locator(".init-btn"));
  await expect.poll(() => cards(page), { timeout: 60_000, intervals: [500] }).toBeGreaterThanOrEqual(18);
  await shot(page, "30-traj-run-apex", 100);
  await expect(page.locator(".run-prompt")).toHaveText("You did it!", { timeout: 90_000 });
  await shot(page, "31-traj-run-landed", 300);
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 10_000 });
  await shot(page, "32-traj-result", 800);
});
