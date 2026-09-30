// #13 smoke (M1-17, M1-18): page loads, pings, footer on screen, gestures inert.

import { test, expect } from "@playwright/test";
import { fresh, sent, view } from "./helpers.ts";

test("loads, pings the bridge and shows the credit footer at 24 px", async ({ page }) => {
  await fresh(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  const footer = page.locator("#footer");
  await expect(footer).toHaveText("ENIAC simulator by Brian L. Stuart, Drexel University");
  expect(await footer.evaluate((e) => getComputedStyle(e).fontSize)).toBe("24px");
  await expect.poll(async () => (await sent(page)).some((m) => m.t === "ping")).toBe(true);
});

test("the 1920x1080 stage is scaled and letterboxed as one unit", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1024 });
  await fresh(page);
  const box = (await page.locator("#app").boundingBox())!;
  expect(Math.round(box.width)).toBe(1280);
  expect(Math.round(box.height)).toBe(720);
  expect(Math.round(box.y)).toBe(152);
});

test("pinch, swipe, long-press, selection and a second touch do nothing", async ({ page }) => {
  await fresh(page);
  const url = page.url();
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, points: { x: number; y: number; id: number }[]) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points } as any);
  // Two-finger pinch.
  await touch("touchStart", [{ x: 800, y: 500, id: 1 }, { x: 1000, y: 500, id: 2 }]);
  await touch("touchMove", [{ x: 600, y: 500, id: 1 }, { x: 1200, y: 500, id: 2 }]);
  await touch("touchEnd", []);
  // Swipe from the left edge (back gesture) and pull-to-refresh.
  await touch("touchStart", [{ x: 2, y: 500, id: 3 }]);
  await touch("touchMove", [{ x: 900, y: 520, id: 3 }]);
  await touch("touchEnd", []);
  await touch("touchStart", [{ x: 900, y: 50, id: 4 }]);
  await touch("touchMove", [{ x: 900, y: 900, id: 4 }]);
  await touch("touchEnd", []);
  // A pinch's first finger and a swipe are not taps: still on S1.
  await expect(view(page)).toHaveAttribute("data-view", "start");
  // Long-press.
  await touch("touchStart", [{ x: 960, y: 300, id: 5 }]);
  await page.waitForTimeout(1200);
  await touch("touchEnd", []);
  expect(page.url()).toBe(url);
  expect(await page.evaluate(() => String(window.getSelection()))).toBe("");
  expect(await page.evaluate(() => visualViewport?.scale ?? 1)).toBe(1);
  // The swipe and long-press lifted inside the S1 target: a *drag* that ends
  // elsewhere must not act, but a stationary long-press is still one tap on
  // release. Nothing above may have started a mission.
  expect((await sent(page)).some((m) => m.t === "start_mission")).toBe(false);
});

