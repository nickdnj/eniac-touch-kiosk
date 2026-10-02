// #19: run view. Real lamps, readouts and tape; INIT guard; captions from
// real lamp changes; CLEAR; speed (test plan M1-06, M1-07, M1-08, M1-11, M1-12).

import { test, expect, type Page } from "@playwright/test";
import { mock, mockGet, sent, tap, tapSlow, toRun } from "./helpers.ts";

/** Decodes an accumulator from the lit DOM lamps (exactly one per column). */
async function lampValue(page: Page, n: number): Promise<number> {
  return page.evaluate((n) => {
    let digits = "";
    for (let d = 1; d <= 10; d++) {
      const lit = [...document.querySelectorAll(`.run-stage [id^="lamp:acc.${n}.d.${d}."].on`)];
      if (lit.length !== 1) return -1;
      digits += lit[0].id.split(".").pop();
    }
    return Number(digits);
  }, n);
}

async function pressInitAndSettle(page: Page): Promise<void> {
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".init-btn")).toHaveClass(/busy/);
  await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 15_000 });
  await page.waitForTimeout(450);
}

test("presses 1-4 give (1,1) (2,4) (3,9) (4,16); lamps, readout, websocket value and tape agree (M1-06)", async ({ page }) => {
  await toRun(page);
  await expect(page.locator(".run-prompt")).toHaveText("Press INIT");
  expect(await lampValue(page, 1)).toBe(0);
  const want = [[1, 1], [2, 4], [3, 9], [4, 16]];
  for (const [i, [x, sq]] of want.entries()) {
    await pressInitAndSettle(page);
    await expect(page.locator('.readout-value[data-acc="1"]')).toHaveText(String(x));
    await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText(String(sq));
    expect(await lampValue(page, 1)).toBe(x);
    expect(await lampValue(page, 2)).toBe(sq);
    const { machine } = await mockGet(page, "session");
    expect([machine.acc["1"].value, machine.acc["2"].value]).toEqual([x, sq]);
    await expect(page.locator(".tape-row")).toHaveCount(i + 1);
    await expect(page.locator(".tape-row").nth(i)).toHaveText(`${x} x ${x} = ${sq}`);
    await expect(page.locator('.run-stage [id="lamp:acc.1.sign.P"].on')).toHaveCount(1);
  }
  await expect(page.locator(".run-hint")).toBeVisible();
  await expect(page.locator(".show-me")).toBeVisible();
});

test("captions follow real lamp changes, then the answer line", async ({ page }) => {
  await toRun(page);
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".run-prompt")).toHaveText("Watch the lamps");
  await expect(page.locator(".run-caption")).toHaveText("Accumulator 1 sends its number: 0, twice.");
  await expect(page.locator(".run-caption")).toHaveText("Now everyone adds 1.");
  await expect(page.locator(".run-caption")).toHaveText("1 x 1 = 1");
  await expect(page.locator(".run-prompt")).toHaveText("Press INIT again");
});

test("double-tap INIT sends exactly one b i; taps while busy send nothing (M1-08)", async ({ page }) => {
  await toRun(page);
  const b = (await page.locator(".init-btn").boundingBox())!;
  await page.touchscreen.tap(b.x + 100, b.y + 40);
  await page.waitForTimeout(120);
  await page.touchscreen.tap(b.x + 100, b.y + 40);
  await page.waitForTimeout(700);
  await page.touchscreen.tap(b.x + 100, b.y + 40); // busy now
  await expect(page.locator(".init-btn")).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 15_000 });
  const inits = (await sent(page)).filter((m) => m.t === "button" && m.b === "init");
  expect(inits).toHaveLength(1);
  expect((await mockGet(page, "session")).stdin.filter((l: string) => l === "b i")).toHaveLength(1);
});

test("Slow is legible: at least two intermediate Acc 2 values on press 3 (M1-07)", async ({ page }) => {
  await toRun(page);
  await pressInitAndSettle(page);
  await pressInitAndSettle(page);
  await tap(page, page.locator(".init-btn"));
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) {
    seen.add((await page.locator('.readout-value[data-acc="2"]').textContent()) ?? "");
    if (seen.has("9")) break;
    await page.waitForTimeout(50);
  }
  expect([...seen].filter((v) => v === "6" || v === "8").length).toBeGreaterThanOrEqual(2);
});

test("CLEAR resets both accumulators and restarts the tape (M1-12)", async ({ page }) => {
  await toRun(page);
  for (let i = 0; i < 3; i++) await pressInitAndSettle(page);
  await expect(page.locator(".tape-row")).toHaveCount(3);
  await tap(page, page.locator(".clear-btn"));
  await expect(page.locator('.readout-value[data-acc="1"]')).toHaveText("0", { timeout: 10_000 });
  await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText("0");
  await expect(page.locator(".tape-row")).toHaveCount(0);
  await page.waitForTimeout(450);
  await pressInitAndSettle(page);
  await expect(page.locator(".tape-row")).toHaveText(["1 x 1 = 1"]);
});

test("speed: Slow is default; Full and back send only table speeds (M1-11)", async ({ page }) => {
  await toRun(page);
  await expect(page.locator('.speed-btn[data-speed="slow"]')).toHaveAttribute("aria-pressed", "true");
  await tapSlow(page, page.locator('.speed-btn[data-speed="full"]'));
  await tapSlow(page, page.locator('.speed-btn[data-speed="slow"]'));
  const speeds = (await sent(page)).filter((m) => m.t === "set_speed").map((m) => m.speed);
  expect(speeds).toEqual(["full", "slow"]);
  const stdin: string[] = (await mockGet(page, "session")).stdin;
  expect(stdin.filter((l) => l.startsWith("s cy.rate"))).toEqual(["s cy.rate 0", "s cy.rate 13"]);
});

test("lamps go blank if the core goes down mid-run", async ({ page }) => {
  await toRun(page);
  await pressInitAndSettle(page);
  await tap(page, page.locator(".init-btn"));
  await page.waitForTimeout(300);
  await mock(page, "fault", { code: "E-CORE-DOWN", recoverAfterMs: 60_000 });
  await expect.poll(() => page.locator(".lamp.on").count()).toBe(0);
});

test("run view touch targets: INIT 96 tall, CLEAR 64, speed 96", async ({ page }) => {
  await toRun(page);
  expect((await page.locator(".init-btn").boundingBox())!.height).toBeGreaterThanOrEqual(96);
  expect((await page.locator(".clear-btn").boundingBox())!.height).toBeGreaterThanOrEqual(64);
  for (const b of await page.locator(".speed-btn").all()) {
    const bb = (await b.boundingBox())!;
    expect(bb.height).toBeGreaterThanOrEqual(96);
    expect(bb.width).toBeGreaterThanOrEqual(200);
  }
});
