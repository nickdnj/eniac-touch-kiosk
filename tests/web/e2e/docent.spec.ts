// The docents' touch point: the ENIAC wordmark in the top-left corner. It
// looks like a label; a tap asks "Go back to the welcome screen?" and, on
// yes, ends the visit and returns to S1 (App.startOver).

import { test, expect, type Page } from "@playwright/test";
import { devMission, fresh, sent, tap, tapSlow, view } from "./helpers.ts";

const mark = (page: Page) => page.locator("#admin-zone");
const dialog = (page: Page) => page.locator(".dialog.confirm");

test("from Explore: the wordmark asks first; Keep going stays, Yes goes to S1 and attract restarts", async ({ page }) => {
  await fresh(page);
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await page.waitForTimeout(650); // the picker ignores the S1 visitor's double tap
  await tap(page, page.locator(".pk-explore"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  // It reads as a label: no button role, no pointer cursor.
  await expect(mark(page)).toHaveText("ENIAC");
  expect(await mark(page).getAttribute("role")).toBeNull();
  expect(await mark(page).evaluate((e) => getComputedStyle(e).cursor)).not.toBe("pointer");

  await tapSlow(page, mark(page));
  await expect(dialog(page).locator("p")).toHaveText("Go back to the welcome screen? This visit will end.");
  // A second tap on the wordmark does not stack a second dialog.
  await tapSlow(page, mark(page));
  await expect(dialog(page)).toHaveCount(1);
  await tapSlow(page, dialog(page).getByText("Keep going"));
  await expect(dialog(page)).toHaveCount(0);
  await expect(view(page)).toHaveAttribute("data-view", "explore");

  await tapSlow(page, mark(page));
  await tapSlow(page, dialog(page).getByText("Yes, start over"));
  await expect(dialog(page)).toHaveCount(0);
  await expect(view(page)).toHaveAttribute("data-view", "start");
});

test("from a mission: the visitor's session ends", async ({ page }) => {
  await devMission(page);
  await expect(view(page)).toHaveAttribute("data-view", "mission");
  await tapSlow(page, mark(page));
  await tapSlow(page, dialog(page).getByText("Yes, start over"));
  await expect(view(page)).toHaveAttribute("data-view", "start");
  expect((await sent(page)).some((m) => m.t === "end_session")).toBe(true);
});

test("on S1 the corner asks nothing", async ({ page }) => {
  await fresh(page);
  await tapSlow(page, { x: 60, y: 48 });
  await page.waitForTimeout(300);
  await expect(dialog(page)).toHaveCount(0);
  await expect(view(page)).toHaveAttribute("data-view", "start");
});
