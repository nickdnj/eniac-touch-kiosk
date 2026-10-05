// The Home button (beside the wordmark): back to the mission picker from
// every visitor screen, in one tap however deep the visitor went. Hidden on
// S1 and on the picker itself. Mission and run screens confirm first
// (setup.spec.ts "Home: no confirm before any step; confirm after one").

import { test, expect, type Page } from "@playwright/test";
import { devMission, fresh, sent, tap, tapSlow, view } from "./helpers.ts";

const home = (page: Page) => page.locator("#home-btn");

async function toPicker(page: Page): Promise<void> {
  await fresh(page);
  await expect(home(page)).toBeHidden();
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await expect(home(page)).toBeHidden();
  await page.waitForTimeout(650); // the picker ignores the S1 visitor's double tap
}

test("hidden on S1 and the picker; one tap home from Explore > Keeping ENIAC alive > Glossary", async ({ page }) => {
  await toPicker(page);
  await tap(page, page.locator(".pk-explore"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(home(page)).toBeVisible();
  await tapSlow(page, page.locator(".ex-tubes-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await expect(home(page)).toBeVisible();
  await tapSlow(page, page.locator(".tb-gloss-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "glossary");
  await expect(home(page)).toBeVisible();
  // Home sits clear of the admin corner (120 x 96, top left) and of the header's own buttons.
  const box = (await home(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(136);
  await tapSlow(page, home(page));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await expect(home(page)).toBeHidden();
  // Leaving Explore's live room for the picker stops attract, as Back used to.
  expect((await sent(page)).filter((m) => m.t === "attract_stop").map((m) => m.reason)).toEqual(["touch", "menu"]);
});

test("from the honor roll", async ({ page }) => {
  await toPicker(page);
  await tap(page, page.locator(".picker-honor"));
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  await tapSlow(page, home(page));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
});

test("from Explore opened in a briefing: the mission's session ends (no cables yet, so no confirm)", async ({ page }) => {
  await devMission(page);
  await tapSlow(page, page.locator(".rail .explore-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await tapSlow(page, home(page));
  await expect(page.locator(".dialog.confirm")).toHaveCount(0);
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  expect((await sent(page)).some((m) => m.t === "end_session" && m.reason === "menu")).toBe(true);
});
