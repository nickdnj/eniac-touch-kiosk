// Shared e2e helpers. All input is touch (page.touchscreen.tap), which
// Chromium turns into pointer events: pointerdown + pointerup on release.

import { expect, type Page, type Locator } from "@playwright/test";

export async function mock(page: Page, path: string, body?: unknown): Promise<any> {
  const r = await page.request.post(`/__mock/${path}`, { data: body ?? {} });
  return r.json();
}
export async function mockGet(page: Page, path: string): Promise<any> {
  const r = await page.request.get(`/__mock/${path}`);
  return r.json();
}

/** Messages the UI sent to the bridge, in order. */
export async function sent(page: Page): Promise<any[]> {
  return mockGet(page, "log");
}

/** Tap the centre of an element (or an offset from it) with a touch. */
export async function tap(page: Page, target: Locator | { x: number; y: number }, offset = { x: 0, y: 0 }): Promise<void> {
  let x: number, y: number;
  if ("boundingBox" in target) {
    await expect(target).toBeVisible();
    const b = (await target.boundingBox())!;
    x = b.x + b.width / 2;
    y = b.y + b.height / 2;
  } else ({ x, y } = target);
  await page.touchscreen.tap(x + offset.x, y + offset.y);
}

/** Taps respecting the 400 ms debounce of step actions (UX 9.3). */
export async function tapSlow(page: Page, target: Locator | { x: number; y: number }, offset = { x: 0, y: 0 }): Promise<void> {
  await tap(page, target, offset);
  await page.waitForTimeout(450);
}

export async function fresh(page: Page, query = ""): Promise<void> {
  await mock(page, "reset");
  await page.goto(`/${query}`);
  await expect(page.locator("#app")).toHaveAttribute("data-view", /start|boot/);
}

/** From S1 to the Squares briefing. */
export async function toBriefing(page: Page): Promise<void> {
  await fresh(page);
  await expect(page.locator("#app")).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator("#app")).toHaveAttribute("data-view", "picker");
  await tapSlow(page, page.getByRole("button", { name: "Start", exact: true }).first());
  await expect(page.locator("#app")).toHaveAttribute("data-view", "mission");
  await expect(page.locator(".step-card h2")).toHaveText("Mission 1: Squares");
}

export const view = (page: Page) => page.locator("#app");
