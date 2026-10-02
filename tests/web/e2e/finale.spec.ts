// S8 Finale (UX 14.5, 14.7, 14.9; PRD FR-45) against the dev mock: the
// trigger after a real three-mission visit, each beat, Skip and Next, the
// picker chip, the idle walk-away, core down (F2 skipped, static beats keep
// working), bridge down (S10), reduced motion, the S16 hook, the metrics.
// Screenshots (docs/screenshots/m3/finale-*.png) only with SCREENSHOTS=1.

import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { SQUARES_STEPS, doStepByTouch, fresh, mainBtn, mock, sent, tap, tapSlow, toStep1, view } from "./helpers.ts";

const SHOTS = join(__dirname, "..", "..", "..", "docs", "screenshots", "m3");
const beat = (page: Page) => page.locator(".fin-beat");
const fin = (page: Page) => page.locator(".screen.finale");

async function toPicker(page: Page): Promise<void> {
  await fresh(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await page.waitForTimeout(650); // the picker ignores the S1 double tap (600 ms)
}

/** A whole visit through the mock, as a visitor does it: Squares (two steps by hand), Primes, Trajectory, then Finish. */
async function realVisit(page: Page, shots = false): Promise<void> {
  await toPicker(page);
  await tapSlow(page, page.locator('.mission-card[data-mission="squares"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await toStep1(page);
  await doStepByTouch(page, SQUARES_STEPS[0]); // a switch, by hand
  await tapSlow(page, mainBtn(page));
  await doStepByTouch(page, SQUARES_STEPS[1]); // a cable, by hand
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 60_000 });
  await expect(page.locator(".result-tape .row")).toHaveCount(12);
  await expect(page.locator(".next-btn")).toHaveText("Next: Primes");

  await tapSlow(page, page.locator(".next-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("What is a prime?");
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await mock(page, "sieve", { slow: 5, full: 5 });
  await tap(page, page.locator(".init-btn"));
  await expect.poll(() => page.evaluate(() => (window as any).__eniac.cards.count), { timeout: 20_000 }).toBeGreaterThanOrEqual(8);
  await tapSlow(page, page.locator(".show-me"));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  await expect(page.locator(".next-btn")).toHaveText("Next: Trajectory");

  await tapSlow(page, page.locator(".next-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("The path of a shell");
  await tapSlow(page, mainBtn(page));
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
  // UX 14.5.1: no mission left, so the primary button reads Finish.
  await expect(page.locator(".next-btn")).toHaveCount(0);
  await expect(page.locator(".finish-btn")).toHaveText("Finish");
  await expect(page.locator(".finish-btn")).toHaveClass(/primary/);
  if (shots) await shot(page, "finale-0-result-finish");
  await tapSlow(page, page.locator(".finish-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "finale");
}

/**
 * The finale over a visit store filled through its own API (tape rows,
 * card logs and step acks, as the app feeds it), for the beat, skip and
 * failure tests. The real trigger and real numbers are the first test's.
 */
async function finaleWith(page: Page, opts: { minutes?: number; partial?: boolean } = {}): Promise<void> {
  await fresh(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await page.evaluate((o) => {
    const app = (window as any).__eniac;
    const v = app.visit;
    v.startedAt = app.now() - (o.minutes ?? 7) * 60_000;
    v.stepApplied("s1", { id: "a", kind: "plug" }, false);
    v.stepApplied("s1", { id: "b", kind: "plug" }, false);
    v.stepApplied("s1", { id: "c", kind: "switch" }, false);
    if (!o.partial) v.tape("squares", [{ x: 11, sq: 121 }, { x: 12, sq: 144 }]);
    for (const id of ["squares", "primes", "trajectory"]) v.reached(id);
    app.show({ name: "finale", beat: 1 });
  }, opts);
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  await expect(beat(page)).toHaveAttribute("data-beat", "1");
}

async function shot(page: Page, name: string, settle = 600): Promise<void> {
  await page.waitForTimeout(settle);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

const metrics = async (page: Page, ev: string) => (await sent(page)).filter((m) => m.t === "metric" && m.ev === ev);

/** Nothing on a beat may leave the 1920 x 1032 area above the footer; plate lines stay one line. */
async function fits(page: Page): Promise<void> {
  const r = await page.evaluate(() => {
    const host = document.querySelector(".screen.finale") as HTMLElement;
    let maxBottom = 0, maxRight = 0, minLeft = Infinity;
    for (const e of Array.from(host.querySelectorAll(".fin-beat *, .fin-skip, .fin-next"))) {
      if (e.closest(".pano")) continue; // the room strip pans inside its clipped window
      const b = (e as HTMLElement).getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(e).display === "none") continue;
      maxBottom = Math.max(maxBottom, b.bottom);
      maxRight = Math.max(maxRight, b.right);
      minLeft = Math.min(minLeft, b.left);
    }
    const wrapped = Array.from(host.querySelectorAll(".plate-name, .plate-later, .plate-kicker"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > parseFloat(getComputedStyle(e).lineHeight) * 1.5)
      .map((e) => e.textContent);
    return { maxBottom, maxRight, minLeft, wrapped };
  });
  expect(r.wrapped).toEqual([]);
  expect(r.maxBottom).toBeLessThanOrEqual(1032);
  expect(r.maxRight).toBeLessThanOrEqual(1920);
  expect(r.minLeft).toBeGreaterThanOrEqual(0);
}

async function heightOf(page: Page, sel: string): Promise<number> {
  return Math.round((await page.locator(sel).boundingBox())!.height);
}

// ---------------------------------------------------------------- the trigger and the real numbers

test("a real visit: all three missions, Finish opens the finale with this visit's real numbers", async ({ page }) => {
  test.setTimeout(240_000);
  const shots = !!process.env.SCREENSHOTS;
  await realVisit(page, shots);
  const s = await page.evaluate(() => (window as any).__eniac.visit.summary());
  expect(s.done).toEqual(["squares", "primes", "trajectory"]);
  // The visitor's session ended at Finish (the finale holds no mission).
  expect((await sent(page)).some((m) => m.t === "end_session" && m.reason === "done")).toBe(true);
  expect(await metrics(page, "finale_reached")).toHaveLength(1);

  // F1: three plates from the store, nothing else.
  await expect(beat(page)).toHaveAttribute("data-beat", "1");
  await expect(page.locator(".fin-title")).toHaveText("You programmed ENIAC.");
  const plates = page.locator(".fin-mplate");
  await expect(plates).toHaveCount(3);
  await expect(plates.nth(0)).toContainText(`You counted up to ${s.missions.squares.squares.n} x ${s.missions.squares.squares.n} = ${s.missions.squares.squares.square}.`);
  expect(s.missions.squares.squares).toEqual({ n: 12, square: 144 });
  await expect(plates.nth(1)).toContainText(`${s.missions.primes.cards.cards} cards punched. The last prime was ${s.missions.primes.cards.last.toLocaleString("en-US")}.`);
  await expect(plates.nth(2)).toContainText("A shell's flight, in 34 hops.");
  await expect(page.locator(".fin-hand")).toHaveText("You plugged in a cable and set a switch yourself, just like ENIAC's first programmers.");
  // This visit took under 3 minutes: the time is not shown (UX 14.5.2, 3 to 30 only).
  expect(s.minutes).toBeLessThan(3);
  await expect(page.locator(".fin-line")).toHaveText("In 1946, setting up a job like this could take people a day or more.");
  await fits(page);
  if (shots) await shot(page, "finale-1-you-programmed-eniac");

  // F2: the room with the 38 panels the three programs use, ringed; live lamps from the attract loop.
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "2");
  await expect(page.locator(".fin-caption")).toHaveText("You used 38 of ENIAC's 40 panels. Yellow rings show them. ENIAC did all of this with cables and switches.");
  await expect(page.locator(".fin-room .pano-unit.hl")).toHaveCount(28); // 30 units less the Cycling Unit and the Divider
  await expect(page.locator('.fin-room .pano-unit[data-id="div"]')).toHaveClass(/dim/);
  await expect(page.locator(".fin-tubes-line")).toHaveText("Behind those panels, about 18,000 tubes glowed. A crew worked shift after shift to keep them running.");
  await expect(page.locator(".fin-room [id^='lamp:'].on").first()).toBeAttached({ timeout: 10_000 });
  await expect(page.locator(".fin-live")).toBeVisible();
  await fits(page);
  if (shots) await shot(page, "finale-2-every-unit-you-used", 5000);

  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "3");
  await fits(page);
  if (shots) await shot(page, "finale-3-brian-stuart");
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "4");
  await expect(page.locator(".beat-f4 .person-plate.on")).toHaveCount(12, { timeout: 8000 });
  await fits(page);
  if (shots) await shot(page, "finale-4-the-people", 800);
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "5");
  await fits(page);
  if (shots) await shot(page, "finale-5-thanks");
  expect((await metrics(page, "finale_beat")).map((m) => m.n)).toEqual([1, 2, 3, 4, 5]);

  // Start over for the next visitor: S1, and the visit is gone.
  await tap(page, page.locator(".fin-start-over"));
  await expect(view(page)).toHaveAttribute("data-view", "start");
  expect(await metrics(page, "finale_start_over")).toHaveLength(1);
  expect(await page.evaluate(() => (window as any).__eniac.visit.summary())).toMatchObject({ done: [], missions: {}, handCables: 0, handSwitches: 0, minutes: null });
});

test("S7 before every mission is done names the next one not done (1, 2, 3), never the finale", async ({ page }) => {
  test.setTimeout(120_000);
  await toPicker(page);
  // Trajectory first: the next not done is Squares.
  await tapSlow(page, page.locator('.mission-card[data-mission="trajectory"] .mc-start'));
  await expect(page.locator(".step-card h2")).toHaveText("The path of a shell");
  await page.evaluate(() => (window as any).__eniac.show({ name: "result" }));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  await expect(page.locator(".next-btn")).toHaveText("Next: Squares");
  await expect(page.locator(".finish-btn")).toHaveCount(0);
});

// ---------------------------------------------------------------- beats, skip, next

test("each beat: content, Skip (64 px) and Next (96 px), a touch anywhere advances", async ({ page }) => {
  await finaleWith(page);
  expect(await heightOf(page, ".fin-skip")).toBeGreaterThanOrEqual(64);
  expect(await heightOf(page, ".fin-next")).toBeGreaterThanOrEqual(96);
  await expect(page.locator(".fin-skip")).toHaveText("Skip to the end");
  await expect(page.locator(".fin-title")).toHaveText("You programmed ENIAC.");
  expect(await page.locator(".fin-title").evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(96);
  await expect(page.locator(".fin-line")).toHaveText("In 1946, setting up a job like this could take people a day or more. You did it in about 7 minutes.");
  await expect(page.locator(".fin-mplate").nth(0)).toContainText("You counted up to 12 x 12 = 144.");
  // Primes and Trajectory have no figure in this store: the mission's words, no number.
  await expect(page.locator(".fin-mplate").nth(1)).toContainText("ENIAC hunted for prime numbers.");
  await expect(page.locator(".fin-mplate").nth(2)).toContainText("ENIAC worked out a shell's flight.");
  await expect(page.locator(".fin-hand")).toHaveText("You plugged in two cables and set a switch yourself, just like ENIAC's first programmers.");

  // A touch on the beat (not a button) goes on.
  await tap(page, { x: 960, y: 820 });
  await expect(beat(page)).toHaveAttribute("data-beat", "2");
  await expect(page.locator(".fin-title")).toHaveText("Here is every unit you used.");
  expect(await heightOf(page, ".fin-explore")).toBeGreaterThanOrEqual(96);
  // The tray labels are fixed over the room: one each, never a clipped repeat of the strip's tags.
  await expect(page.locator(".fin-tray-tag")).toHaveText(["DIGIT TRAYS: numbers travel here", 'PROGRAM TRAYS: "go!" signals']);
  await expect(page.locator(".fin-room .pano-tray .tag").first()).toBeHidden();

  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "3");
  await expect(page.locator(".fin-title")).toHaveText("Brian L. Stuart wrote this simulator.");
  await expect(page.locator(".beat-f3 .stuart-plate .plate-name")).toHaveText("Brian L. Stuart");
  expect(await page.locator(".beat-f3 .stuart-plate .plate-name").evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(72);
  await expect(page.locator(".fin-stuart-line")).toHaveText("Every lamp you saw was run by his program. Without his work, there would be nothing here to touch.");
  await expect(page.locator(".beat-f3 .qr-block")).toHaveAttribute("data-url", "https://www.cs.drexel.edu/~bls96/eniac/simulator.html");
  // Tapping the QR card is a touch on the beat too.
  await tap(page, page.locator(".fin-qr"));
  await expect(beat(page)).toHaveAttribute("data-beat", "4");
  await expect(page.locator(".fin-title")).toHaveText("The people who made ENIAC.");
  // Names fade in one by one, 400 ms apart.
  await page.waitForTimeout(250);
  const early = await page.locator(".beat-f4 .person-plate.on").count();
  expect(early).toBeLessThan(12);
  await expect(page.locator(".beat-f4 .person-plate.on")).toHaveCount(12, { timeout: 8000 });
  await expect(page.locator(".beat-f4 .programmers .person-plate")).toHaveCount(6);
  await expect(page.locator(".beat-f4 .programmers .plate-kicker")).toHaveText("ENIAC’s first programmers, from 1945");
  await expect(page.locator(".beat-f4 .team .person-plate")).toHaveCount(4);
  await expect(page.locator(".beat-f4 .bodies .person-plate")).toHaveCount(2);
  await expect(page.locator(".fin-thanks")).toHaveText("Six women were its first programmers. Engineers and an Army team built it. Thank you to all of them.");
  await fits(page);

  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "5");
  await expect(page.locator(".fin-title")).toHaveText("Thanks for visiting!");
  await expect(page.locator(".fin-skip")).toBeHidden();
  await expect(page.locator(".fin-next")).toBeHidden();
  expect(await heightOf(page, ".fin-start-over")).toBeGreaterThanOrEqual(96);
  expect(await heightOf(page, ".fin-explore5")).toBeGreaterThanOrEqual(96);
  // A touch on F5 does not leave it.
  await tap(page, { x: 960, y: 820 });
  await page.waitForTimeout(400);
  await expect(beat(page)).toHaveAttribute("data-beat", "5");
  expect((await metrics(page, "finale_beat")).map((m) => m.n)).toEqual([1, 2, 3, 4, 5]);
  expect(await metrics(page, "finale_reached")).toHaveLength(1);
});

test("partial data: a figure never seen is not shown; no time line outside 3 to 30 minutes", async ({ page }) => {
  await finaleWith(page, { partial: true, minutes: 45 });
  await expect(page.locator(".fin-line")).toHaveText("In 1946, setting up a job like this could take people a day or more.");
  await expect(page.locator(".fin-mplate")).toHaveText([/ENIAC counted in squares\./, /ENIAC hunted for prime numbers\./, /ENIAC worked out a shell's flight\./]);
  await expect(page.locator(".fin-mplate.figure")).toHaveCount(0);
});

test("Skip to the end goes to F5 from any beat and is counted", async ({ page }) => {
  await finaleWith(page);
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "2");
  await tap(page, page.locator(".fin-skip"));
  await expect(beat(page)).toHaveAttribute("data-beat", "5");
  expect((await metrics(page, "finale_skipped_at")).map((m) => m.n)).toEqual([2]);
  expect((await metrics(page, "finale_beat")).map((m) => m.n)).toEqual([1, 2, 5]);
});

test("Explore from F2 and F5; Back returns to F5", async ({ page }) => {
  await finaleWith(page);
  await tap(page, page.locator(".fin-next"));
  await tap(page, page.locator(".fin-explore"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  expect((await sent(page)).find((m) => m.t === "metric" && m.ev === "explore_open")).toMatchObject({ screen: "finale" });
  await tap(page, page.locator(".ex-back"));
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  await expect(beat(page)).toHaveAttribute("data-beat", "5");
  await tap(page, page.locator(".fin-explore5"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  expect(await metrics(page, "finale_explore")).toHaveLength(2);
  expect(await metrics(page, "finale_reached")).toHaveLength(1); // coming back is not a new finale
});

test("F2's chip opens S16 Keeping ENIAC alive; its Finish returns to F5", async ({ page }) => {
  await finaleWith(page);
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "2");
  const chip = page.locator(".fin-tubes");
  await expect(chip).toHaveText("How they kept it alive ›");
  expect(await heightOf(page, ".fin-tubes")).toBeGreaterThanOrEqual(64);
  await tap(page, chip);
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  expect((await sent(page)).find((m) => m.t === "metric" && m.ev === "tubes_open")).toMatchObject({ screen: "finale" });
  // Walk the five cards with Next; the last reads Finish and goes back to the finale's F5.
  for (let i = 0; i < 4; i++) await tapSlow(page, page.locator(".tb-next"));
  await tapSlow(page, page.locator(".tb-next"));
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  await expect(beat(page)).toHaveAttribute("data-beat", "5");
  // X from S16 also returns to F5.
  await page.evaluate(() => (window as any).__eniac.openTubes({ from: "finale", back: { name: "finale", beat: 5 } }));
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await tap(page, page.locator(".tubes .close").first());
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  await expect(beat(page)).toHaveAttribute("data-beat", "5");
  expect(await metrics(page, "finale_reached")).toHaveLength(1);
});

test("the picker offers 'See the finale' once all three are done", async ({ page }) => {
  await toPicker(page);
  await expect(page.locator(".pk-finale")).toHaveCount(0);
  await expect(page.locator(".mc-order")).toBeVisible();
  await page.evaluate(() => {
    const app = (window as any).__eniac;
    for (const id of ["squares", "primes", "trajectory"]) app.visit.reached(id);
    app.show({ name: "picker" });
  });
  await page.waitForTimeout(650);
  const chip = page.locator(".pk-finale");
  await expect(chip).toHaveText("See the finale ›");
  await expect(page.locator(".mc-order")).toHaveCount(0);
  expect(await heightOf(page, ".pk-finale")).toBeGreaterThanOrEqual(64);
  if (process.env.SCREENSHOTS) await shot(page, "finale-6-picker-chip");
  await tap(page, chip);
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  await expect(beat(page)).toHaveAttribute("data-beat", "1");
});

// ---------------------------------------------------------------- idle, failure, motion

test("idle: a visitor who walks away goes through the beats and reaches S1 at 85 s", async ({ page }) => {
  test.setTimeout(150_000);
  await finaleWith(page);
  const t0 = Date.now();
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 100_000 });
  const took = Date.now() - t0;
  expect(took).toBeGreaterThan(83_000);
  expect(took).toBeLessThan(92_000);
  expect((await metrics(page, "finale_beat")).map((m) => m.n)).toEqual([1, 2, 3, 4, 5]);
  await expect(page.locator(".still")).toHaveCount(0); // no "Still there?" in the finale
  expect(await page.evaluate(() => (window as any).__eniac.visit.summary().done)).toEqual([]);
});

test("core down: F1, F3, F4, F5 keep working, F2 is skipped; leaving shows S10, then S1", async ({ page }) => {
  await finaleWith(page);
  await mock(page, "fault", { code: "E-CORE-DOWN", recoverAfterMs: 8000 });
  await page.waitForTimeout(800);
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "3");
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "4");
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "5");
  if (process.env.SCREENSHOTS) await shot(page, "finale-7-core-down-f5");
  await tap(page, page.locator(".fin-start-over"));
  await expect(view(page)).toHaveAttribute("data-view", "error");
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 12_000 });
});

test("core down during F2: the lamps go dark and the room says ENIAC is resting", async ({ page }) => {
  await finaleWith(page);
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "2");
  await expect(page.locator(".fin-room [id^='lamp:'].on").first()).toBeAttached({ timeout: 10_000 });
  await mock(page, "fault", { code: "E-CORE-DOWN", recoverAfterMs: 8000 });
  await expect(page.locator(".fin-pill")).toBeVisible({ timeout: 4000 });
  await expect(page.locator(".fin-pill")).toHaveText(/Live lamps are off: ENIAC is resting\./);
  await expect(page.locator(".fin-room [id^='lamp:'].on")).toHaveCount(0);
  await expect(page.locator(".fin-live")).toBeHidden();
  await expect(view(page)).toHaveAttribute("data-view", "finale");
  if (process.env.SCREENSHOTS) await shot(page, "finale-8-core-down-f2");
});

test("bridge down for 5 s: S10 like every screen", async ({ page }) => {
  await finaleWith(page);
  await mock(page, "drop", { ms: 7000 });
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 8000 });
});

test("reduced motion: the names appear at once; the room uses fixed framings", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await finaleWith(page);
  await expect(fin(page)).toHaveClass(/reduced/);
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "2");
  const strip = page.locator(".fin-room .pano-strip");
  const x0 = await strip.evaluate((e) => getComputedStyle(e).transform);
  await page.waitForTimeout(2000);
  expect(await strip.evaluate((e) => getComputedStyle(e).transform)).toBe(x0); // no slow pass
  await page.waitForTimeout(2000);
  expect(await strip.evaluate((e) => getComputedStyle(e).transform)).not.toBe(x0); // the second framing
  await tap(page, page.locator(".fin-next"));
  await tap(page, page.locator(".fin-next"));
  await expect(beat(page)).toHaveAttribute("data-beat", "4");
  await expect(page.locator(".beat-f4 .person-plate.on")).toHaveCount(12);
});
