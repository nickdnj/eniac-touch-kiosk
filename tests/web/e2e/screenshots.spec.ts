// Screenshots of the key M1 screens for review (docs/screenshots/m1-web).
// Only runs with SCREENSHOTS=1 (npm run screenshots), 1920x1080, against the
// dev mock. Everything on screen still comes from the mock bridge's
// simulated session; nothing here is bundled.

import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { devMission, fresh, hit, mainBtn, mock, tap, tapSlow, toRun, toStep1, view } from "./helpers.ts";

test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 (npm run screenshots)");

const dir = join(__dirname, "..", "..", "..", "docs", "screenshots", "m1-web");
const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(700); // let the 250 ms screen cross-fade settle
  await page.screenshot({ path: join(dir, `${name}.png`) });
};

test("capture key screens", async ({ page }) => {
  test.setTimeout(240_000);
  await fresh(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await shot(page, "01-start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mc-meta")).toHaveText(/You wire/);
  await shot(page, "02-picker");

  await devMission(page);
  await page.waitForTimeout(500);
  await shot(page, "03-briefing");
  await tapSlow(page, mainBtn(page));
  await shot(page, "04-plan");
  await tapSlow(page, mainBtn(page));
  await page.waitForTimeout(600);
  await shot(page, "05-switch-step");
  await tapSlow(page, hit(page, "sw:c.j1"));
  await page.waitForTimeout(400);
  await shot(page, "06-switch-picker");
  await tapSlow(page, page.locator('.pick[data-value="1"]'));
  await expect(mainBtn(page)).toHaveText("Next step");
  await tapSlow(page, mainBtn(page));
  await page.waitForTimeout(600);
  await tapSlow(page, hit(page, "jack:c.26i"));
  await tapSlow(page, hit(page, "jack:c.o"));
  await page.waitForTimeout(300);
  await shot(page, "07-jack-closeup");
  await tapSlow(page, hit(page, "trunk:1"));
  await page.waitForTimeout(2200);
  await shot(page, "08-workbench-step");
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 10_000 });
  await page.waitForTimeout(500);
  await shot(page, "09-rest-done-for-you");

  await toRun(page);
  await mock(page, "speed", { slow: 60 });
  for (let i = 0; i < 3; i++) {
    await tap(page, page.locator(".init-btn"));
    await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 15_000 });
    await page.waitForTimeout(450);
  }
  await mock(page, "speed", { slow: 400 });
  await tap(page, page.locator(".init-btn"));
  await page.waitForTimeout(1500);
  await shot(page, "10-run-busy");
  await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 15_000 });
  await page.waitForTimeout(500);
  await shot(page, "11-run");
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 60_000 });
  await page.waitForTimeout(400);
  await shot(page, "12-result");
  await mock(page, "config", { idle: { setupS: 2, runS: 2, countdownS: 12 } });
  await expect(page.locator(".still")).toBeVisible({ timeout: 6000 });
  await page.waitForTimeout(1200);
  await shot(page, "13-still-there");
  await mock(page, "fault", { code: "E-CORE-DOWN", recoverAfterMs: 60_000 });
  await expect(view(page)).toHaveAttribute("data-view", "error");
  await page.waitForTimeout(300);
  await shot(page, "14-error-resting");
  await mock(page, "reset");
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await mock(page, "fault", { code: "E-RETRY-BUDGET", final: true });
  await expect(page.locator(".err-body")).toHaveText(/Staff:/);
  await shot(page, "15-error-staff");
  await mock(page, "reset");
  void toStep1;
});
