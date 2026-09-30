// #17: guided step stage. Workbench, close-up windows, picker, guide,
// feedback, hit areas (UX 4, 5.2, 6.6, 7.3; test plan M1-03, M1-16).

import { test, expect } from "@playwright/test";
import { devMission, feedback, hit, mainBtn, sent, tap, tapSlow, toStep1 } from "./helpers.ts";

test.beforeEach(async ({ page }) => {
  await devMission(page);
  await toStep1(page);
});

test("workbench shows four 300 px cards, both trunk rails, live lamps and the caption", async ({ page }) => {
  for (const u of ["i", "c", "a1", "a2"]) {
    const w = await page.locator(`.workbench [data-unit="${u}"]`).evaluate((e) => (e as HTMLElement).offsetWidth);
    expect(w).toBe(300);
  }
  await expect(page.locator(".workbench .trunkrail")).toHaveCount(2);
  await expect(page.locator(".wb-caption")).toContainText("We moved these units next to each other");
  // Lamps are the real machine: a fresh core shows 0 in every column.
  await expect(page.locator('.workbench [id="lamp:acc.1.d.10.0"].on')).toHaveCount(1);
  await expect(page.locator('.workbench [id^="lamp:acc.1.d."].on')).toHaveCount(10);
});

test("switch step: dial, picker with only valid values, wrong value then right value", async ({ page }) => {
  const target = hit(page, "sw:c.j1");
  const tb = (await target.boundingBox())!;
  expect(Math.round(tb.width)).toBe(120);
  await expect(page.locator(".guide-ring")).toHaveCount(1);
  await tapSlow(page, target);
  const picks = page.locator(".picker .pick");
  await expect(picks).toHaveCount(10);
  for (const b of await picks.all()) {
    const bb = (await b.boundingBox())!;
    expect(bb.width).toBeGreaterThanOrEqual(120);
    expect(bb.height).toBeGreaterThanOrEqual(120);
  }
  await expect(page.locator(".picker .pick.correct")).toHaveCount(0); // not pre-highlighted
  await tapSlow(page, page.locator('.pick[data-value="7"]'));
  await expect(feedback(page)).toHaveText(/Not quite\. Not that number\. We need a 1\./);
  await tapSlow(page, page.locator('.pick[data-value="1"]'));
  await expect(feedback(page)).toHaveText(/Now it holds the number 1/);
  await expect(mainBtn(page)).toHaveText("Next step");
  expect((await mainBtn(page).boundingBox())!.height).toBeGreaterThanOrEqual(96);
  const log = await sent(page);
  expect(log.filter((m) => m.t === "apply_step")).toEqual([expect.objectContaining({ step: "j1-one", assisted: false })]);
});

test("plug step: decoy, right source, wrong destination, right destination (M1-03)", async ({ page }) => {
  await tapSlow(page, hit(page, "sw:c.j1"));
  await tapSlow(page, page.locator('.pick[data-value="1"]'));
  await expect(mainBtn(page)).toHaveText("Next step");
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".win")).toHaveCount(2);
  for (const b of await page.locator(".windows .hit").all()) {
    const bb = (await b.boundingBox())!;
    expect(bb.width).toBe(88);
    expect(bb.height).toBe(88);
  }
  // Wrong #1 on a decoy: X badge, specific hint, nothing sent to the core.
  await tap(page, hit(page, "jack:c.26i"));
  await expect(page.locator(".xbadge")).toHaveCount(1);
  await expect(feedback(page)).toHaveText(/That is a jack for signals/);
  await page.waitForTimeout(450);
  // Right source arms it; the destination ring moves to window 2.
  await tapSlow(page, hit(page, "jack:c.o"));
  await expect(page.locator(".preview")).toHaveCount(1);
  await expect(page.locator(".win[data-win='1'] .chip.active")).toHaveCount(1);
  // Wrong destination (#2): snaps back, source stays armed, glowing-ring text, thicker ring.
  await tapSlow(page, hit(page, "trunk:2"));
  await expect(feedback(page)).toHaveText(/Look for the glowing ring/);
  await expect(page.locator(".guide-ring.lvl2")).toHaveCount(1);
  await expect(page.locator(".preview")).toHaveCount(1);
  // Right destination.
  await tapSlow(page, hit(page, "trunk:1"));
  await expect(feedback(page)).toHaveText(/The cable is in/);
  await expect(page.locator('.workbench .cable[data-cable="c.o>1"]')).toHaveCount(1);
  const log = await sent(page);
  expect(log.filter((m) => m.t === "apply_step").map((m) => m.step)).toEqual(["j1-one", "const-to-trunk1"]);
  expect(log.filter((m) => m.t === "metric" && m.ev === "wrong_tap")).toHaveLength(2);
});

test("third wrong tap fills 'Do it for me'; empty taps are neutral", async ({ page }) => {
  await tapSlow(page, page.locator(".stage"), { x: -600, y: 380 }); // empty space in the dim area
  await expect(feedback(page)).toHaveCount(0);
  for (const id of ["sw:c.j2", "sw:c.j3", "sw:c.j4"]) await tapSlow(page, hit(page, id));
  await expect(feedback(page)).toHaveText(/Want us to do this one\?/);
  await expect(mainBtn(page)).toHaveClass(/pulse/);
  await expect(mainBtn(page)).not.toHaveClass(/outline/);
});

test("glove tolerance: a tap 16 px outside the hit area still counts", async ({ page }) => {
  const b = (await hit(page, "sw:c.j1").boundingBox())!;
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height + 15);
  await expect(page.locator(".picker")).toHaveCount(1);
});

test("feedback appears within 100 ms of release (UX-08)", async ({ page }) => {
  const b = (await hit(page, "sw:c.j2").boundingBox())!;
  const ms = await page.evaluate(async ({ x, y }) => {
    const target = document.elementFromPoint(x, y)!;
    const t0 = performance.now();
    const opts = { bubbles: true, isPrimary: true, pointerId: 7, pointerType: "touch", clientX: x, clientY: y };
    target.dispatchEvent(new PointerEvent("pointerdown", opts));
    target.dispatchEvent(new PointerEvent("pointerup", opts));
    await new Promise(requestAnimationFrame);
    const shown = !!document.querySelector(".step-card .feedback");
    return shown ? performance.now() - t0 : 9999;
  }, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
  expect(ms).toBeLessThan(100);
});
