// HIGH-QUALITY clean footage for "ENIAC Plays Battleship" draft 4 (project eniac-battleship-video).
// Authoritative copy lives in that repo (scripts/clip-battleship.spec.ts + scripts/hqcap.ts); copy both to
// tests/web/video/ of a kiosk worktree at 9552c47 or later to run them (see scripts/run-hq.sh).
// Capture is NOT Playwright recordVideo: hqcap.ts pulls CDP Page.startScreencast frames at JPEG quality 100 into
// ffmpeg with wall-clock timestamps, then encodes 1920x1080 30 fps libx264 crf 12 (see hqcap.ts).
// Recorded live on the REAL bridge and simulator core (make dev on :8740), no captions, no cursor (only tap ripples
// from overlay.ts), CLEAN is the only mode. Run ONE test at a time, alone on the machine (-g selects it):
//   cd src/web && npx playwright test -c ../../tests/web/video/playwright.hq.config.ts clip-battleship -g "R3:"
// Each test writes build/video/hq/<id>-beats.json (beat name + ms offset in VIDEO time, plus hop-N times),
// <id>-result.json (landing read from the result screen + seconds per hop) and the clip <id>.mp4.
// A wrong landing fails the test. Never taps "more", never sends a second INIT, never turns on Docent mode.

import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { join } from "node:path";
import { tap, view, mainBtn } from "../e2e/helpers.ts";
import { overlays, pause } from "./overlay.ts";
import { HQCapture } from "./hqcap.ts";

const ROOT = join(__dirname, "..", "..", "..");
const OUT = join(ROOT, "build", "video", "hq");
const STATE = join(ROOT, "build", "state"); // make dev: deploy/config/config.dev.yaml paths.state
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
  cap: HQCapture;
  tourStops: unknown[] = [];
  constructor(public page: Page, public id: string) {
    mkdirSync(OUT, { recursive: true });
    this.cap = new HQCapture(page, join(OUT, `${id}.mp4`));
  }
  async start(url: string, clearScores = true) {
    if (clearScores) rmSync(join(STATE, "scores", "battleship.json"), { force: true }); // clean board: "BE THE FIRST"
    await overlays(this.page);
    // The bridge starts its attract show when a client connects, and sometimes drops the ?mission= shortcut
    // (seen right after another session ended). Load OFF-camera until the briefing is really there, then capture.
    for (let attempt = 1; ; attempt++) {
      await this.page.goto(url);
      const ok = await this.page.locator(".step-card h2").filter({ hasText: "Battle stations" }).waitFor({ timeout: 15_000 }).then(() => true, () => false);
      if (ok) {
        await this.page.waitForTimeout(4000); // the attract show can still take the screen over: it must still be the briefing
        if (await this.page.locator(".step-card h2").filter({ hasText: "Battle stations" }).count()) break;
      }
      if (attempt >= 8) throw new Error("briefing never appeared");
      await this.page.waitForTimeout(5000);
    }
    await this.cap.start();
    await this.page.evaluate(() => document.body.getBoundingClientRect()); // make sure a frame is produced
    await expect.poll(() => this.cap.t0, { timeout: 30_000 }).toBeGreaterThan(0);
    this.t0 = this.cap.t0; // beats are in VIDEO time: ms since the first captured frame
  }
  beat(name: string) {
    this.beats.push({ beat: name, at: Date.now() - this.t0 });
  }
  /** Logs the time every card is punched (hop-N), from a page-side poller. */
  async watchHops() {
    await this.page.evaluate(() => {
      const w = window as any;
      clearInterval(w.__hopPoll); // a second flight in the same page must not double-log
      w.__hopLog = [];
      let last = w.__eniac.cards.count as number;
      w.__hopPoll = setInterval(() => {
        const c = w.__eniac.cards.count as number;
        while (last < c) w.__hopLog.push({ n: ++last, at: Math.round(performance.timeOrigin + performance.now()) });
        if (c < last) last = c;
      }, 10);
    });
  }
  hops: { n: number; at: number }[] = [];
  tag = ''; // flight prefix for hop beats ("A-", "B-")
  async hopBeats() {
    const log: { n: number; at: number }[] = await this.page.evaluate(() => (window as any).__hopLog ?? []);
    this.hops = log.map((h) => ({ n: h.n, at: h.at - this.t0 }));
    this.hops.forEach((h, k) => this.beats.push({ beat: `${this.tag}hop-${k + 1}`, at: h.at })); // hop-N within this flight
    this.beats.sort((a, b) => a.at - b.at);
  }
  /** Seconds per hop: first card to last card, and first card to the landing. */
  pacing(landedAt: number) {
    const first = this.hops[0]?.at ?? 0, last = this.hops[this.hops.length - 1]?.at ?? 0;
    const n = this.hops.length;
    return {
      hops: n,
      first_card_to_last_card_s: +((last - first) / 1000).toFixed(2),
      avg_s_per_hop: n > 1 ? +((last - first) / 1000 / (n - 1)).toFixed(2) : null,
      first_card_to_landed_s: +((landedAt - first) / 1000).toFixed(2),
      init_to_first_card_s: +((first - ([...this.beats].reverse().find((b) => b.beat === "init")?.at ?? first)) / 1000).toFixed(2),
    };
  }
  /** Stop the capture, write beats/result, return the video info. */
  async save(result?: unknown) {
    writeFileSync(join(OUT, `${this.id}-beats.json`), JSON.stringify(this.beats, null, 2));
    if (this.tourStops.length) writeFileSync(join(OUT, `${this.id}-tour.json`), JSON.stringify(this.tourStops, null, 2));
    if (result) writeFileSync(join(OUT, `${this.id}-result.json`), JSON.stringify(result, null, 2));
  }
  async finish() {
    const info = await this.cap.finish(12);
    writeFileSync(join(OUT, `${this.id}-capture.json`), JSON.stringify(info));
    return info;
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

/** Build screen: walk all nine stops (6 s each, text read from the DOM) or skip. */
async function tour(r: Rec, full: boolean) {
  const { page } = r;
  if (full) {
    const n = await page.locator(".build-tab").count();
    expect(n, "the tour must have nine stops").toBe(9);
    await pause(page, 4000); // the build intro
    for (let i = 1; i <= n; i++) {
      r.beat(`tour-${i}`);
      r.tourStops.push({
        stop: i,
        video_s: (Date.now() - r.t0) / 1000,
        count: await page.locator(".build-count").innerText(),
        title: await page.locator(".build-stop-title").innerText(),
        text: await page.locator(".build-stop-text").innerText(),
        bullets: await page.locator(".build-bullets li").allInnerTexts(),
        button: await page.locator(".build-next").innerText(),
      });
      await pause(page, 6000);
      await tap(page, page.locator(".build-next")); // the 9th tap reads "To the guns"
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
async function fly(r: Rec, holdBeforeInit = 2500, tag = "") {
  const { page } = r;
  r.tag = tag;
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
const at = (r: Rec, beat: string) => [...r.beats].reverse().find((b) => b.beat === beat)?.at ?? 0;

/** Run a take; always stop and encode the capture, and flag the file if the take threw. */
async function take(r: Rec, body: () => Promise<void>) {
  let err: unknown;
  try {
    await body();
  } catch (e) {
    err = e;
  }
  await r.save().catch(() => {});
  await r.finish();
  if (err) {
    renameSync(join(OUT, `${r.id}.mp4`), join(OUT, `${r.id}-FAILED.mp4`));
    throw err;
  }
}

test("R1: Battleship title screen loop", async ({ page }) => {
  test.setTimeout(300_000);
  const r = new Rec(page, "R1");
  await take(r, async () => {
    await r.start(`/?mission=battleship&target=${TARGET}`);
    await expect(page.locator(".step-card h2")).toHaveText("Battle stations", { timeout: 60_000 });
    r.beat("briefing-hold-start");
    await pause(page, 30_000); // no taps
    r.beat("briefing-hold-end");
  });
});

test("R2: full session, round A (miss) then round B (sink), name, board", async ({ page }) => {
  test.setTimeout(1_500_000);
  const r = new Rec(page, "R2");
  await take(r, async () => {
    await r.start(`/?mission=battleship&target=${TARGET}`);
    await briefingAndPlan(r);
    // ---- round A
    await aim(r, "Destroyer", "Quick", 20);
    await tour(r, true);
    const a = parse(await fly(r, 2500, "A-"), await cards(page));
    const pa = r.pacing(at(r, "landed"));
    r.beat("A-result-hold");
    await pause(page, 8000);
    writeFileSync(join(OUT, "R2-A-result.json"), JSON.stringify({ ...a, pacing: pa }, null, 2));
    expect(a.landed, a.text).toBe(MISS_A);
    expect(a.side).toBe("short");
    // ---- round B
    await tap(page, page.locator(".try-again"));
    r.beat("fire-again");
    await expect(view(page)).toHaveAttribute("data-view", "aim", { timeout: 60_000 });
    r.beat("aim-open-B");
    await aim(r, "Cruiser", "Long", 10, 2000, 3000);
    await tour(r, false);
    const b = parse(await fly(r, 2500, "B-"), await cards(page));
    const pb = r.pacing(at(r, "landed"));
    r.beat("B-result-hold");
    await pause(page, 8000);
    await r.save({ A: a, B: b, pacing: { A: pa, B: pb } });
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
    await r.save({ A: a, B: b, pacing: { A: pa, B: pb }, board });
  });
});

async function repeat(id: string, page: Page, ship: string, gun: string, deg: number, landed: number, target = TARGET) {
  const r = new Rec(page, id);
  await take(r, async () => {
    await r.start(`/?mission=battleship&target=${target}`);
    await briefingAndPlan(r, 1500, 1500);
    await aim(r, ship, gun, deg, 1500, 1500);
    await tour(r, false);
    const x = parse(await fly(r, 1500), await cards(page));
    const p = r.pacing(at(r, "landed"));
    await pause(page, 6000);
    r.beat("end");
    await r.save({ ...x, pacing: p });
    expect(x.landed, x.text).toBe(landed);
  });
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
  await repeat("R5", page, "Battleship", "Heavy", 15, 19721, 19700);
});

test("R3b: Option 2 miss (alternate), Cruiser Medium 15", async ({ page }) => {
  test.setTimeout(600_000);
  await repeat("R3b", page, "Cruiser", "Medium", 15, 11694);
});
