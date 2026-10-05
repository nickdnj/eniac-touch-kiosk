// S6 room view (run/roomview.ts): a header button swaps the mission's own
// view for the whole room, on the visitor's own lamps, and back. The rail
// stays, so INIT works while looking at the room.

import { test, expect, type Page } from "@playwright/test";
import { tap, tapSlow, toRun } from "./helpers.ts";

/** Decodes an accumulator from the lit lamps under `root` (exactly one per column). */
async function lampValue(page: Page, root: string, n: number): Promise<number> {
  return page.evaluate(
    ([root, n]) => {
      let digits = "";
      for (let d = 1; d <= 10; d++) {
        const lit = [...document.querySelectorAll(`${root} [id^="lamp:acc.${n}.d.${d}."].on`)];
        if (lit.length !== 1) return -1;
        digits += lit[0].id.split(".").pop();
      }
      return Number(digits);
    },
    [root, n] as const,
  );
}

async function pressInitAndSettle(page: Page): Promise<void> {
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".init-btn")).toHaveClass(/busy/);
  await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 15_000 });
  await page.waitForTimeout(450);
}

test("See the whole room and back: the room shows the mission's real lamps, and INIT still works there", async ({ page }) => {
  await toRun(page);
  const btn = page.locator(".hdr-room");
  const room = page.locator(".run-room");
  await expect(btn).toHaveText("See the whole room");
  await expect(room).toBeHidden();
  await expect(page.locator(".run-stage")).toBeVisible();
  await pressInitAndSettle(page); // (1, 1) in the mission view

  await tapSlow(page, btn);
  await expect(btn).toHaveText("Back to the mission view");
  await expect(room).toBeVisible();
  await expect(page.locator(".run-stage")).toBeHidden();
  await expect(page.locator(".ex-minimap")).toBeVisible();
  await expect(page.locator(".ex-readout")).toHaveText("You are looking at: Initiating Unit to Accumulator 2");
  await expect(page.locator(".run-room-note")).toHaveText("These are your mission's lamps, live, on the whole machine.");
  // Squares uses the Initiating Unit, the Cycling Unit and Accumulators 1 and 2: marked on the map.
  expect(await page.locator(".ex-cells .mc.hl").count()).toBeGreaterThanOrEqual(4);
  // The room opened on the machine as it is now, and follows the next press.
  expect([await lampValue(page, ".run-room", 1), await lampValue(page, ".run-room", 2)]).toEqual([1, 1]);
  await pressInitAndSettle(page);
  expect([await lampValue(page, ".run-room", 1), await lampValue(page, ".run-room", 2)]).toEqual([2, 4]);
  // The arrows and the map move the view.
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await expect(page.locator(".ex-readout")).not.toHaveText("You are looking at: Initiating Unit to Accumulator 2");
  await expect(page.locator(".ex-arrow.l")).not.toHaveClass(/disabled/);

  // Back: the mission view kept up while it was hidden.
  await tapSlow(page, btn);
  await expect(btn).toHaveText("See the whole room");
  await expect(room).toBeHidden();
  await expect(page.locator(".run-stage")).toBeVisible();
  await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText("4");
  expect(await lampValue(page, ".run-stage", 2)).toBe(4);
  await expect(page.locator(".tape-row")).toHaveCount(2);
  // And the room again: lamps changed while hidden are redrawn.
  await pressInitAndSettle(page);
  await tapSlow(page, btn);
  expect([await lampValue(page, ".run-room", 1), await lampValue(page, ".run-room", 2)]).toEqual([3, 9]);
});
