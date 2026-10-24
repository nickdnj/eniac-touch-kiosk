// Clean footage for "ENIAC Plays Battleship" (project eniac-battleship-video). Authoritative copy lives in that
// repo (scripts/clip-battleship.spec.ts); copy it to tests/web/video/ of a kiosk worktree at 7884d02 to run it.
// Recorded live on the REAL bridge and simulator core, no captions or cards (only tap ripples are drawn), so
// the footage is clean (CLEAN=1 is the only mode: this spec never draws a caption).
// Run ONE test at a time, alone on the machine (-g selects it):
//   cd src/web && CLEAN=1 npx playwright test -c ../../tests/web/video/playwright.config.ts clip-battleship -g "R3"
// Each test writes build/video/<id>-beats.json (beat name + ms offset into the recording, plus hop-N times)
// and build/video/<id>-result.json (the landing read from the result screen). A wrong landing fails the test.
// Never taps "more", never sends a second INIT.

import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tap, view, mainBtn } from "../e2e/helpers.ts";
import { overlays, pause } from "./overlay.ts";

const OUT = join(__dirname, "..", "..", "..", "build", "video");
const STATE = join(OUT, "state");
const TARGET = 10950; // t4, "Enemy destroyer"

const cards = (page: Page) => page.evaluate(() => (window as any).__eniac.cards.count as number);
const has = (page: Page, cp: string) => page.evaluate((cp) => (window as any).__eniac.checkpoints.has(cp) as boolean, cp);

async function slow(page: Page, loc: ReturnType<Page["locator"]>, gap = 1500) {
  await tap(page, loc);
  await page.waitForTimeout(gap);
}

class Rec {
  beats: { beat: string; at: number }[] = [];
  t0 = 0;
  constructor(public page: Page, public id: string) {}
  async start(url: string) {
    rmSync(join(STATE, "scores", "battleship.json"), { force: true }); // clean board: "BE THE FIRST"
    await overlays(this.page);
    await this.page.goto(url);
    this.t0 = await this.page.evaluate(() => performance.timeOrigin);
  }
  beat(name: string) {
    this.beats.push({ beat: name, at: Date.now() - this.t0 });
  }
  /** Logs the time every card is punched (hop-N), from a page-side poller. */
  async watchHops() {
    await this.page.evaluate(() => {
      const w = window as any;
      w.__hopLog = [];
      let last = w.__eniac.cards.count as number;
      w.__hopPoll = setInterval(() => {
        const c = w.__eniac.cards.count as number;
        while (last < c) w.__hopLog.push({ n: ++last, at: Math.round(performance.timeOrigin + performance.now()) });
        if (c < last) last = c;
      }, 25);
    });
  }
  async hopBeats() {
    const log: { n: number; at: number }[] = await this.page.evaluate(() => (window as any).__hopLog ?? []);
    for (const h of log) this.beats.push({ beat: `hop-${h.n}`, at: h.at - this.t0 });
    this.beats.sort((a, b) => a.at - b.at);
  }
  save(result?: unknown) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, `${this.id}-beats.json`), JSON.stringify(this.beats, null, 2));
    if (result) writeFileSync(join(OUT, `${this.id}-result.json`), JSON.stringify(result, null, 2));
  }
}

async function briefingAndPlan(r: Rec, holdBriefing = 4000, holdPlan = 4000) {
  const { page } = r;
  await expect(page.locator(".step-card h2")).toHaveText("Battle stations", { timeout: 60_000 });
  r.beat("briefing");
  await pause(page, holdBriefing);
  await slow(page, mainBtn(page), 600); // Let's go
  await expect(page.locator(".step-card h2")).toHaveText("Ship, gun, angle");
  r.beat("plan");
  await pause(page, holdPlan);
  await slow(page, mainBtn(page), 600); // Next step
  await expect(view(page)).toHaveAttribute("data-view", "aim", { timeout: 30_000 });
  r.beat("aim-open");
}

/** Aim screen: three slow, deliberate taps, then the dials, then Load the guns. */
async function aim(r: Rec, ship: string, gun: string, deg: number, gap = 1500, dialHold = 3000) {
  const { page } = r;
  await pause(page, 2000);
  await slow(page, page.locator(".aim-ship", { hasText: ship }), gap);
  r.beat("ship");
  await slow(page, page.locator(".aim-charge", { hasText: gun }), gap);
  r.beat("gun");
  await slow(page, page.locator(".aim-elev", { hasText: new RegExp(`^${deg}°$`) }), gap);
  r.beat("elev");
  await pause(page, 1200);
  await slow(page, page.locator(".aim-lock"), 400);
  r.beat("load");
  await expect(view(page)).toHaveAttribute("data-view", "build", { timeout: 60_000 });
  r.beat("build-intro");
}

/** Build screen: either walk all eight stops (4 s each) or skip. */
async function tour(r: Rec, full: boolean) {
  const { page } = r;
  if (full) {
    await pause(page, 4000);
    for (let i = 1; i <= 8; i++) {
      r.beat(`tour-${i}`);
      await pause(page, 4000);
      await tap(page, page.locator(".build-next")); // the 8th tap reads "To the guns"
      await page.waitForTimeout(500);
    }
  } else {
    await pause(page, 1500);
    await slow(page, page.locator(".build-skip"), 400);
  }
  await expect(view(page)).toHaveAttribute("data-view", "run", { timeout: 30_000 });
  r.beat("run-open");
}

/** READ, wait for the card, INIT, wait for the landing and the result. Returns the result text. */
async function fly(r: Rec, holdBeforeInit = 2500) {
  const { page } = r;
  await pause(page, 2500);
  await tap(page, page.locator(".read-btn"));
  r.beat("read");
  await expect.poll(() => has(page, "card-read"), { timeout: 60_000, intervals: [250] }).toBe(true);
  r.beat("card-read");
  await pause(page, holdBeforeInit);
  await r.watchHops();
  await tap(page, page.locator(".init-btn"));
  r.beat("init");
  await expect.poll(() => cards(page), { timeout: 60_000, intervals: [250] }).toBeGreaterThanOrEqual(1);
  r.beat("first-card");
  await expect.poll(() => has(page, "landed"), { timeout: 120_000, intervals: [250] }).toBe(true);
  r.beat("landed");
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 30_000 }); // follows 3 s after the landing
  r.beat("result");
  await expect(page.locator(".game-points")).toBeVisible({ timeout: 30_000 });
  await r.hopBeats();
  return await page.locator(".result-answer").innerText();
}

function parse(text: string, n: number) {
  const landed = Number((/landed ([\d,]+) feet/.exec(text)?.[1] ?? "0").replace(/,/g, ""));
  const off = /missed by ([\d,]+) feet/.exec(text);
  const side = /splashed down short/.test(text) ? "short" : /flew past/.test(text) ? "long" : "";
  const hit = /Ship sunk!/.test(text);
  const score = Number(/Score: (\d+)/.exec(text)?.[1] ?? "0");
  const rank = (/(Ship sunk!|Sharpshooter|Good shot|Near miss|Splash!)/.exec(text) ?? [])[1] ?? "";
  return { landed, off: off ? Number(off[1].replace(/,/g, "")) : 0, side, hit, score, rank, hops: n, text };
}

const MISS_A = 10435; // Destroyer / Quick 750 / 20 deg: 515 short
const SINK_B = 10954; // Cruiser / Long 1050 / 10 deg: 4 long, sunk

test("R1: Battleship title screen loop", async ({ page }) => {
  test.setTimeout(300_000);
  const r = new Rec(page, "R1");
  await r.start(`/?mission=battleship&target=${TARGET}`);
  await expect(page.locator(".step-card h2")).toHaveText("Battle stations", { timeout: 60_000 });
  r.beat("briefing-hold-start");
  await pause(page, 30_000); // no taps
  r.beat("briefing-hold-end");
  r.save();
});

test("R2: full session, round A (miss) then round B (sink), name, board", async ({ page }) => {
  test.setTimeout(1_500_000);
  const r = new Rec(page, "R2");
  await r.start(`/?mission=battleship&target=${TARGET}`);
  await briefingAndPlan(r);
  // ---- round A
  await aim(r, "Destroyer", "Quick", 20);
  await tour(r, true);
  const a = parse(await fly(r), await cards(page));
  r.beat("A-result-hold");
  await pause(page, 8000);
  writeFileSync(join(OUT, "R2-A-result.json"), JSON.stringify(a, null, 2));
  expect(a.landed, a.text).toBe(MISS_A);
  expect(a.side).toBe("short");
  // ---- round B
  await tap(page, page.locator(".try-again"));
  r.beat("fire-again");
  await expect(view(page)).toHaveAttribute("data-view", "aim", { timeout: 60_000 });
  r.beat("aim-open-B");
  await aim(r, "Cruiser", "Long", 10, 2000, 3000);
  await tour(r, false);
  const b = parse(await fly(r), await cards(page));
  r.beat("B-result-hold");
  await pause(page, 8000);
  r.save({ A: a, B: b });
  expect(b.landed, b.text).toBe(SINK_B);
  expect(b.rank).toBe("Ship sunk!");
  expect(b.score).toBe(1000);
  // ---- name and board
  await tap(page, page.locator(".game-save"));
  await expect(page.locator(".namepad")).not.toHaveClass(/hidden/);
  r.beat("name-open");
  await pause(page, 1500);
  for (const ch of "YOU NEXT") {
    await tap(page, ch === " " ? page.locator(".np-space") : page.locator(".np-key", { hasText: new RegExp(`^${ch}$`) }));
    await page.waitForTimeout(450);
  }
  r.beat("name-typed");
  await pause(page, 1200);
  await tap(page, page.locator(".np-save"));
  await expect(page.locator(".namepad")).toHaveClass(/hidden/, { timeout: 15_000 });
  r.beat("board");
  await pause(page, 6000);
  r.beat("end");
  const board = await page.locator(".game-board").innerText().catch(() => "");
  r.save({ A: a, B: b, board });
});

async function repeat(id: string, page: Page, ship: string, gun: string, deg: number, landed: number, tourFull = false) {
  const r = new Rec(page, id);
  await r.start(`/?mission=battleship&target=${TARGET}`);
  await briefingAndPlan(r, 1500, 1500);
  await aim(r, ship, gun, deg, 1500, 1500);
  await tour(r, tourFull);
  const x = parse(await fly(r, 1500), await cards(page));
  await pause(page, 6000);
  r.beat("end");
  r.save(x);
  expect(x.landed, x.text).toBe(landed);
}

test("R3: verification, round A again", async ({ page }) => {
  test.setTimeout(600_000);
  await repeat("R3", page, "Destroyer", "Quick", 20, MISS_A);
});

test("R4: round B again, lamps in view", async ({ page }) => {
  test.setTimeout(600_000);
  await repeat("R4", page, "Cruiser", "Long", 10, SINK_B);
});

test("R5: battleship vs battleship (spare)", async ({ page }) => {
  test.setTimeout(600_000);
  const r = new Rec(page, "R5");
  await r.start(`/?mission=battleship&target=19700`);
  await briefingAndPlan(r, 1500, 1500);
  await aim(r, "Battleship", "Heavy", 15, 1500, 1500);
  await tour(r, false);
  const x = parse(await fly(r, 1500), await cards(page));
  await pause(page, 6000);
  r.save(x);
  expect(x.landed, x.text).toBe(19721);
});

test("R3b: Option 2 miss (alternate), Cruiser Medium 15", async ({ page }) => {
  test.setTimeout(600_000);
  await repeat("R3b", page, "Cruiser", "Medium", 15, 11694);
});
