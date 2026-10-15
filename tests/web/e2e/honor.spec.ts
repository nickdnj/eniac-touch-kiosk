// S11 About and honor roll (UX 14.6, FR-41, FR-43, FR-44), its entry
// points (UX 14.9, 14.6.3), idle return (FR-32), the core-down behaviour
// (UX 14.7) and the visit store the finale reads (state/visit.ts, FR-45).
// Screenshots (docs/screenshots/m3/honor-*.png) only with SCREENSHOTS=1.

import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { SQUARES_STEPS, devMission, devMissionId, doStepByTouch, feedback, fresh, mainBtn, mock, oddPrimes, sent, tap, tapSlow, toStep1, view } from "./helpers.ts";

async function toPicker(page: Page): Promise<void> {
  await fresh(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await page.waitForTimeout(650); // the picker ignores the S1 double tap (600 ms)
}

async function toHonor(page: Page): Promise<void> {
  await toPicker(page);
  await tap(page, page.locator(".picker-honor"));
  await expect(view(page)).toHaveAttribute("data-view", "honor");
}

const tab = (page: Page, n: number) => page.locator(`.honor-tab[data-page="${n}"]`);
const pageEl = (page: Page) => page.locator(".honor-page");

/** Nothing on the page may fall outside 1920 x 1032 or overlap the actions row: no scrolling (FR-41). */
async function fitsOneScreen(page: Page): Promise<void> {
  const r = await page.evaluate(() => {
    const host = document.querySelector(".honor-host") as HTMLElement;
    const hb = host.getBoundingClientRect();
    let maxBottom = 0, maxRight = 0, minLeft = Infinity;
    for (const e of Array.from(host.querySelectorAll("*"))) {
      const b = (e as HTMLElement).getBoundingClientRect();
      if (!b.width || !b.height) continue;
      maxBottom = Math.max(maxBottom, b.bottom);
      maxRight = Math.max(maxRight, b.right);
      minLeft = Math.min(minLeft, b.left);
    }
    const over = Array.from(host.querySelectorAll("*")).some((e) => (e as HTMLElement).scrollHeight > (e as HTMLElement).clientHeight + 1 && getComputedStyle(e).overflow !== "visible");
    // Plate lines are one line each (UX 14.6.1): none may wrap.
    const wrapped = Array.from(host.querySelectorAll(".plate-name, .plate-later, .plate-line"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > parseFloat(getComputedStyle(e).lineHeight) * 1.5)
      .map((e) => e.textContent);
    return { top: hb.top, maxBottom, maxRight, minLeft, over, wrapped };
  });
  expect(r.wrapped).toEqual([]);
  expect(r.maxBottom).toBeLessThanOrEqual(232 + 668 + 1);
  expect(r.maxRight).toBeLessThanOrEqual(1841);
  expect(r.minLeft).toBeGreaterThanOrEqual(79);
  expect(r.over).toBe(false);
}

test("picker button opens S11 on Brian L. Stuart's page: plate, credit, three offline QR codes", async ({ page }) => {
  await toPicker(page);
  const b = (await page.locator(".picker-honor").boundingBox())!;
  expect([Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]).toEqual([912, 848, 480, 96]);
  await tap(page, page.locator(".picker-honor"));
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  await expect(tab(page, 1)).toHaveClass(/on/);
  await expect(page.locator(".page-stuart .stuart-plate .plate-name")).toHaveText("Brian L. Stuart");
  // FR-43: the name is big (>= 56 px; 96 px here) and the dependency is said plainly.
  const fs = await page.locator(".page-stuart .stuart-plate .plate-name").evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(fs).toBeGreaterThanOrEqual(96);
  await expect(page.locator(".page-stuart")).toContainText("Without his work, this exhibit would be an empty screen.");
  await expect(page.locator(".page-stuart")).toContainText("Simulating the ENIAC");
  // QR codes are inline SVG drawn from the URL (no image file, no network).
  const qrs = page.locator(".page-stuart .qr-block");
  await expect(qrs).toHaveCount(3);
  await expect(qrs.nth(0)).toHaveAttribute("data-url", "https://www.cs.drexel.edu/~bls96/eniac/simulator.html");
  await expect(qrs.nth(1)).toHaveAttribute("data-url", "https://github.com/blstuart/eniac-simulator");
  await expect(qrs.nth(2)).toHaveAttribute("data-url", "https://doi.org/10.1109/JPROC.2018.2813678");
  const main = (await page.locator(".page-stuart .qr-block.main svg").boundingBox())!;
  expect(Math.round(main.width)).toBe(280);
  await expect(page.locator(".page-stuart .qr-block.main .qr-print")).toHaveText("cs.drexel.edu/~bls96/eniac/simulator.html");
  await expect(page.locator(".honor img")).toHaveCount(0); // no photographs
  await fitsOneScreen(page);
  await expect(page.locator("#footer")).toHaveText("ENIAC designed by J. Presper Eckert and John W. Mauchly · Simulator by Brian L. Stuart, Drexel University");
});

test("all five pages render (no review gate) and each fits one screen; tabs are 96 px", async ({ page }) => {
  await toHonor(page);
  for (let n = 1; n <= 4; n++) {
    const b = (await tab(page, n).boundingBox())!;
    expect(Math.round(b.height)).toBe(96);
    expect(Math.round(b.y)).toBe(112);
  }
  await tap(page, tab(page, 2));
  await expect(pageEl(page)).toHaveAttribute("data-page", "2");
  const names = page.locator(".page-programmers .plate-name");
  await expect(names).toHaveText([
    "Kathleen “Kay” McNulty",
    "Betty Jean Jennings",
    "Frances Elizabeth “Betty” Snyder",
    "Marlyn Wescoff",
    "Frances “Fran” Bilas",
    "Ruth Lichterman",
  ]);
  await expect(page.locator(".page-programmers .plate-later")).toHaveText([
    "Later Kay McNulty Mauchly Antonelli",
    "Later Jean Jennings Bartik",
    "Later Betty Snyder Holberton",
    "Later Marlyn Wescoff Meltzer",
    "Later Frances Bilas Spence",
    "Later Ruth Lichterman Teitelbaum",
  ]);
  await fitsOneScreen(page);

  await tap(page, tab(page, 3));
  await expect(page.locator(".page-builders .plate-name")).toHaveText([
    "J. Presper Eckert",
    "John W. Mauchly",
    "Herman H. Goldstine",
    "Adele Goldstine",
    "Moore School of Electrical Engineering",
    "U.S. Army Ordnance",
  ]);
  await expect(page.locator(".page-builders .institution .plate-later")).toHaveText(["University of Pennsylvania", "Ballistic Research Laboratory"]);
  await fitsOneScreen(page);

  await tap(page, tab(page, 4));
  await expect(page.locator(".page-exhibit .src-what")).toHaveText(["Squares", "Primes", "Shell’s path"]);
  await expect(page.locator(".page-exhibit")).toContainText("D. H. Lehmer");
  await expect(page.locator(".page-exhibit")).toContainText("Liesbeth De Mol and Maarten Bullynck");
  await expect(page.locator(".page-exhibit")).toContainText("February 15, 1946");
  await expect(page.locator(".page-exhibit")).toContainText("Vintage Computer Federation");
  await fitsOneScreen(page);
  await expect(page.locator(".honor-next")).toHaveText("Next: The idea ›");

  // Page 5 (draft): the idea. One screen; the last page has no Next.
  await tap(page, tab(page, 5));
  await expect(page.locator(".page-idea")).toContainText("Signal Corps");
  await expect(page.locator(".page-idea")).toContainText("Camp Evans");
  await expect(page.locator(".page-idea .idea-card")).toHaveCount(2);
  await expect(page.locator(".page-idea .idea-note")).toContainText("not been independently verified");
  await fitsOneScreen(page);
  await expect(page.locator(".honor-next")).toBeHidden();

  // Every page view is a metric (UX 14.6.4).
  const views = (await sent(page)).filter((m) => m.t === "metric" && m.ev === "honor_page_view").map((m) => m.n);
  expect(views).toEqual([1, 2, 3, 4, 5]);
});

test("Next walks the pages in order; Back returns to the picker", async ({ page }) => {
  await toHonor(page);
  await expect(page.locator(".honor-next")).toHaveText("Next: The first programmers ›");
  await tap(page, page.locator(".honor-next"));
  await expect(pageEl(page)).toHaveAttribute("data-page", "2");
  await expect(tab(page, 2)).toHaveAttribute("aria-selected", "true");
  await tap(page, page.locator(".honor-next"));
  await expect(pageEl(page)).toHaveAttribute("data-page", "3");
  await tap(page, page.locator(".honor-back"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
});

test("idle on S11: 'Still there?' after setupS, then back to S1", async ({ page }) => {
  await toHonor(page);
  await mock(page, "config", { idle: { setupS: 3, runS: 6, countdownS: 2 } });
  await expect(page.locator(".still")).toBeVisible({ timeout: 6000 });
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 5000 });
  expect((await sent(page)).find((m) => m.t === "metric" && m.ev === "idle_reset")).toMatchObject({ screen: "honor" });
});

test("core down: S11 keeps working (static); leaving it shows S10; recovery goes to S1", async ({ page }) => {
  await toHonor(page);
  await mock(page, "fault", { code: "E-CORE-DOWN", recoverAfterMs: 6000 });
  await page.waitForTimeout(800);
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  await tap(page, tab(page, 2));
  await expect(pageEl(page)).toHaveAttribute("data-page", "2");
  await tap(page, page.locator(".honor-back"));
  await expect(view(page)).toHaveAttribute("data-view", "error");
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 9000 });
});

test("bridge down: S11 goes to S10 like every screen", async ({ page }) => {
  await toHonor(page);
  await mock(page, "drop", { ms: 7000 });
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 8000 });
});

// ---------------------------------------------------------------- Trajectory S7 link + visit store

async function trajectoryToResult(page: Page): Promise<void> {
  await devMissionId(page, "trajectory", "The path of a shell");
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Hop by hop");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await tapSlow(page, page.locator(".read-btn"));
  await expect(page.locator(".init-btn")).not.toHaveClass(/disabled/, { timeout: 10_000 });
  await mock(page, "hop", { ms: 30 });
  await tap(page, page.locator(".init-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 30_000 });
  await expect(page.locator(".live-line")).toHaveText("34 hops, 34 cards", { timeout: 30_000 });
}

test("S7 Trajectory links to the programmers page; Back returns to S7; the visit holds the real flight", async ({ page }) => {
  await trajectoryToResult(page);
  const link = page.locator(".result-right .honor-link");
  await expect(link).toHaveText("The women who set up this shell path in 1946 ›");
  expect(Math.round((await link.boundingBox())!.height)).toBeGreaterThanOrEqual(64);
  await tap(page, link);
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  await expect(pageEl(page)).toHaveAttribute("data-page", "2");
  await tap(page, page.locator(".honor-back"));
  await expect(view(page)).toHaveAttribute("data-view", "result");

  // The visit store: the flight comes from the landing card the UI holds.
  const { rec, landed, done } = await page.evaluate(() => {
    const app = (window as any).__eniac;
    return { rec: app.visit.get("trajectory"), landed: app.cards.landed, done: [...app.done] };
  });
  expect(done).toEqual(["trajectory"]);
  expect(rec.reached).toBe(true);
  expect(rec.flight).toEqual({ hops: 34, along: landed.x, top: expect.any(Number) });
  expect(landed.n).toBe(34);

  // The visit ends when attract shows (Finish opens the finale only after all three: finale.spec.ts).
  await expect(page.locator(".next-btn")).toHaveText("Next: Squares");
  await page.evaluate(() => (window as any).__eniac.show({ name: "start" }));
  await expect(view(page)).toHaveAttribute("data-view", "start");
  expect(await page.evaluate(() => (window as any).__eniac.visit.summary())).toMatchObject({ done: [], missions: {}, handCables: 0, handSwitches: 0, minutes: null });
});

test("other missions have no honor link on S7", async ({ page }) => {
  await devMissionId(page, "primes", "What is a prime?");
  await page.evaluate(() => (window as any).__eniac.show({ name: "result" }));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  await expect(page.locator(".honor-link")).toHaveCount(0);
});

test("visit store: Squares counts hand-placed steps only, and keeps the biggest real square on the tape", async ({ page }) => {
  await devMission(page);
  await toStep1(page);
  // Step 1 (a switch) and step 2 (a cable) by hand; step 3 "Do it for me"; then skip the rest.
  await doStepByTouch(page, SQUARES_STEPS[0]);
  await tapSlow(page, mainBtn(page));
  await doStepByTouch(page, SQUARES_STEPS[1]);
  await tapSlow(page, mainBtn(page));
  await expect(mainBtn(page)).toHaveText("Do it for me");
  await tapSlow(page, mainBtn(page));
  await expect(feedback(page)).toHaveClass(/ok/);
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  for (let i = 1; i <= 3; i++) {
    await tap(page, page.locator(".init-btn"));
    await expect(page.locator(".tape-row")).toHaveCount(i, { timeout: 10_000 });
    await page.waitForTimeout(300);
  }
  const s = await page.evaluate(() => (window as any).__eniac.visit.summary());
  expect(s.handSwitches).toBe(1);
  expect(s.handCables).toBe(1);
  expect(s.missions.squares.squares).toEqual({ n: 3, square: 9 });
  expect(s.minutes).toBe(0);
  // CLEAR empties the tape, but the visit keeps the real 3 x 3 = 9.
  await tap(page, page.locator(".clear-btn"));
  await expect(page.locator(".tape-row")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__eniac.visit.get("squares").squares)).toEqual({ n: 3, square: 9 });
});

test("visit store: Primes keeps the real card count and the last prime punched", async ({ page }) => {
  await devMissionId(page, "primes", "What is a prime?");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await tap(page, page.locator(".init-btn"));
  await expect.poll(() => page.evaluate(() => (window as any).__eniac.cards.count), { timeout: 20_000 }).toBeGreaterThanOrEqual(5);
  const { rec, count, last } = await page.evaluate(() => {
    const app = (window as any).__eniac;
    return { rec: app.visit.get("primes"), count: app.cards.count, last: app.cards.valueOf(app.cards.last) };
  });
  expect(rec.cards.cards).toBeGreaterThanOrEqual(5);
  expect(rec.cards.cards).toBeLessThanOrEqual(count);
  expect(oddPrimes(rec.cards.cards).at(-1)).toBe(rec.cards.last);
  expect(last).toBeGreaterThanOrEqual(rec.cards.last);
});

// ---------------------------------------------------------------- screenshots

test("capture honor screenshots", async ({ page }) => {
  test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1");
  const dir = join(__dirname, "..", "..", "..", "docs", "screenshots", "m3");
  const shot = async (name: string) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(dir, `${name}.png`) });
  };
  await toPicker(page);
  await shot("honor-0-picker-entry");
  await tap(page, page.locator(".picker-honor"));
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  await shot("honor-1-stuart");
  await tap(page, tab(page, 2));
  await shot("honor-2-programmers");
  await tap(page, tab(page, 3));
  await shot("honor-3-builders");
  await tap(page, tab(page, 4));
  await shot("honor-4-exhibit");
  await trajectoryToResult(page);
  await shot("honor-5-trajectory-result-link");
});
