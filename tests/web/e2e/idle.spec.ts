// #23: inactivity reset with shortened config (IDLE-05, IDLE-07; FR-32/33).

import { test, expect } from "@playwright/test";
import { devMission, mock, mockGet, sent, tap, toRun, toStep1, view } from "./helpers.ts";

const SHORT = { idle: { setupS: 4, runS: 6, countdownS: 3 } };

test("setup: 'Still there?' after setupS, counts down, then resets to S1 with a clean core", async ({ page }) => {
  await devMission(page);
  await mock(page, "config", SHORT);
  await toStep1(page);
  const t0 = Date.now();
  const overlay = page.locator(".still");
  await expect(overlay).toBeVisible({ timeout: 8000 });
  expect(Date.now() - t0).toBeGreaterThan(3500);
  const box = (await overlay.boundingBox())!;
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([1000, 520]);
  expect((await page.locator(".still-here").boundingBox())!.height).toBeGreaterThanOrEqual(120);
  await expect(page.locator(".count-num")).toHaveText("3");
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 6000 });
  await expect(overlay).toHaveCount(0);
  const log = await sent(page);
  expect(log.some((m) => m.t === "end_session" && m.reason === "idle")).toBe(true);
  expect(log.find((m) => m.t === "metric" && m.ev === "idle_reset")).toMatchObject({ screen: "mission" });
  expect((await mockGet(page, "session")).session).toBeNull();
});

test("any touch on the overlay dismisses it and does not leak through", async ({ page }) => {
  await devMission(page);
  await mock(page, "config", SHORT);
  await toStep1(page);
  await expect(page.locator(".still")).toBeVisible({ timeout: 8000 });
  // Tap where the J-dial window's target sits, under the scrim.
  const dial = (await page.locator('.windows .hit[data-id="sw:c.j1"]').boundingBox())!;
  await page.touchscreen.tap(dial.x + 60, dial.y + 60);
  await expect(page.locator(".still")).toHaveCount(0);
  await expect(page.locator(".picker")).toHaveCount(0);
  await expect(view(page)).toHaveAttribute("data-view", "mission");
  // Full timeout again after dismissal.
  await page.waitForTimeout(2500);
  await expect(page.locator(".still")).toHaveCount(0);
});

test("run view uses runS, and S1 never times out", async ({ page }) => {
  await toRun(page);
  await mock(page, "config", SHORT);
  await tap(page, page.locator(".init-btn"));
  const t0 = Date.now();
  await expect(page.locator(".still")).toBeVisible({ timeout: 10_000 });
  expect(Date.now() - t0).toBeGreaterThan(5000);
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 6000 });
  await page.waitForTimeout(6000);
  await expect(page.locator(".still")).toHaveCount(0);
  await expect(view(page)).toHaveAttribute("data-view", "start");
});

test("next visitor after a reset starts clean: new session, step 1, no tape", async ({ page }) => {
  await toRun(page);
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".tape-row")).toHaveCount(1, { timeout: 10_000 });
  await mock(page, "config", SHORT);
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 15_000 });
  expect(await page.evaluate(() => (window as any).__eniac.tape.length)).toBe(0);
  await tap(page, page.locator(".screen.start"));
  await page.waitForTimeout(650);
  await tap(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  const { session, machine } = await mockGet(page, "session");
  expect(session.applied).toEqual([]);
  expect(machine.acc["1"].value).toBe(0);
});
