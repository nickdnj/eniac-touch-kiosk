// #22: S1 start, S2 picker and S0 waking stand-ins (UX 7.1, 7.2; FR-23, FR-31).

import { test, expect } from "@playwright/test";
import { fresh, sent, tap, tapSlow, view } from "./helpers.ts";

test("S1 shows the title, the pill (no footer: the plates carry the credit), and the room only from the attract session (UX 14.2)", async ({ page }) => {
  await fresh(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await expect(page.locator(".start-title")).toHaveText("ENIAC");
  await expect(page.locator(".start-sub")).toHaveText("The room-sized computer of 1946. Now you program it.");
  // Layout size (the 1 Hz pulse scales the drawn pill by up to 2 %).
  expect(await page.locator(".start-pill").evaluate((e: HTMLElement) => [e.offsetWidth, e.offsetHeight])).toEqual([720, 120]);
  await expect(page.locator(".start-pill")).toHaveText("Touch to program ENIAC");
  await expect(page.locator("#footer")).toBeHidden();
  // The only machine drawn is the room panorama, and its lamps are lit only by the attract core.
  await expect(page.locator(".lamp").first()).toBeAttached();
  expect(await page.locator(".lamp:not(.att-room .lamp)").count()).toBe(0);
  await expect.poll(() => page.evaluate(() => (window as any).__eniac.attract.phase)).toMatch(/reading|flying|landed/);
});

test("touchstart alone sends nothing; the action fires on release", async ({ page }) => {
  await fresh(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 960, y: 500, id: 1 }] } as any);
  await page.waitForTimeout(300);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] } as any);
  await expect(view(page)).toHaveAttribute("data-view", "picker");
});

test("the first touch only leaves S1; a stray second tap never starts a mission (FR-31)", async ({ page }) => {
  await fresh(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  const start = (await page.locator(".start-pill").boundingBox())!;
  // Double tap on the pill, which overlaps the picker's card and Start area.
  await page.touchscreen.tap(start.x + 360, start.y + 10);
  await page.waitForTimeout(120);
  await page.touchscreen.tap(start.x + 360, start.y + 10);
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await page.waitForTimeout(500);
  expect((await sent(page)).some((m) => m.t === "start_mission")).toBe(false);
});

test("S2 shows available missions only, with Start here and a 96 px Start; S0 while waking", async ({ page }) => {
  await fresh(page);
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await expect(page.locator(".mission-card .mc-title")).toHaveText(["Squares", "Primes", "Trajectory"]);
  await expect(page.locator('.mission-card[data-mission="trajectory"] .mc-steps')).toHaveText("You wire 5 steps and read a card");
  await expect(page.locator(".mc-order")).toHaveText(/1, then 2, then 3/);
  await expect(page.locator(".mc-here")).toHaveCount(1);
  await expect(page.locator('.mission-card[data-mission="squares"] .mc-here')).toHaveText(/Start here/i);
  await expect(page.locator('.mission-card[data-mission="squares"] .mc-steps')).toHaveText("You wire 7 steps");
  await expect(page.locator('.mission-card[data-mission="squares"] .mc-min')).toHaveText("About 3 min");
  const b = (await page.locator('.mission-card[data-mission="squares"] .mc-start').boundingBox())!;
  expect(b.height).toBeGreaterThanOrEqual(96);
  expect(b.width).toBeGreaterThanOrEqual(480);
  await page.waitForTimeout(650);
  await tap(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));
  // S0 never shows stale lamps.
  await expect(page.locator(".screen.waking, .screen.mission")).toHaveCount(1);
  if (await page.locator(".screen.waking").count()) await expect(page.locator(".lamp.on")).toHaveCount(0);
  await expect(view(page)).toHaveAttribute("data-view", "mission");
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  expect((await sent(page)).filter((m) => m.t === "start_mission")).toHaveLength(1);
});

test("starting while the previous visitor's session is still alive waits for the NEW session", async ({ page }) => {
  // Found against the real bridge: the old session is reported, then ended,
  // after start_mission. S0 must not take it for the new one.
  await fresh(page);
  await tap(page, page.locator(".screen.start"));
  await page.waitForTimeout(650);
  await tapSlow(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await page.goto("/"); // a reload leaves the session alive on the bridge
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await page.waitForTimeout(650);
  await tapSlow(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await page.waitForTimeout(1000);
  await expect(view(page)).toHaveAttribute("data-view", "mission");
});

test("the whole mission card is a target too", async ({ page }) => {
  await fresh(page);
  await tap(page, page.locator(".screen.start"));
  await page.waitForTimeout(650);
  await tapSlow(page, page.locator('.mission-card[data-mission="squares"] .mc-title'));
  await expect(view(page)).toHaveAttribute("data-view", /waking|mission/);
});
