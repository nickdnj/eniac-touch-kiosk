// S1 Attract (live) on the REAL bridge and core (UX 14.2; FR-30, FR-31,
// FR-34 to FR-36): the bridge's attract loop flies trajdemo.e by itself and
// S1 draws it: room lamps from the core, dots from the real punched cards,
// the landing hold with the landing card's numbers, then the next flight.
// Touch hands off to the picker at once; idle returns to S1 with attract
// running; a killed core shows S10 and S1 comes back by itself.
//
// SCREENSHOTS=1 also writes docs/screenshots/m3/attract-*.png; VIDEO=1
// records docs/video/attract-preview.mp4 (about 20 s, needs ffmpeg).

import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tap, view } from "../e2e/helpers.ts";
import { coreUp, healthz, logMark, machine, recordSent, sent, stdinSince } from "./real.ts";

const SHOTS = !!process.env.SCREENSHOTS;
const ROOT = join(__dirname, "..", "..", "..");
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(ROOT, "docs", "screenshots", "m3", `${name}.png`) });
};
const att = (page: Page) => page.evaluate(() => {
  const a = (window as any).__eniac.attract;
  return { phase: a.phase as string, flight: a.flight as number, cards: a.cards.count as number, hop: a.hop as number, dots: a.cards.dots.length as number, landing: a.landing, session: a.session as string | null };
});
const scene = (page: Page) => page.locator(".screen.attract");

/** The lit digit of each column of accumulator n in the S1 room, or -1 if not exactly one. */
async function roomValue(page: Page, n: number): Promise<number> {
  return page.evaluate((n) => {
    let digits = "";
    for (let d = 1; d <= 10; d++) {
      const lit = [...document.querySelectorAll(`.att-room [id^="lamp:acc.${n}.d.${d}."].on`)];
      if (lit.length !== 1) return -1;
      digits += lit[0].id.split(".").pop();
    }
    return Number(digits);
  }, n);
}

test.beforeEach(async ({ page }) => {
  await recordSent(page);
});

test("idle at home: the bridge flies trajdemo.e by itself and S1 draws the real flight, then holds the landing and flies again", async ({ page }) => {
  test.setTimeout(420_000);
  await coreUp();
  const mark = logMark();
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  // The bridge runs the attract program like Mission 3: READ (b c, b r), then one INIT.
  await expect.poll(() => stdinSince(mark).filter((c) => /^b [cri]$/.test(c)), { timeout: 30_000 }).toEqual(["b c", "b r", "b i"]);
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 20_000 });
  await expect(page.locator(".att-chip")).toHaveText("LIVE");
  // Real cards: dots and caption follow them.
  await expect.poll(async () => (await att(page)).cards, { timeout: 30_000 }).toBeGreaterThanOrEqual(3);
  await expect(page.locator(".att-caption")).toHaveText(/^Live: ENIAC is working out a shell's path\. Hop \d+$/);
  const a = await att(page);
  const capHop = Number((await page.locator(".att-caption").textContent())!.match(/Hop (\d+)/)![1]);
  expect(Math.abs(capHop - a.hop)).toBeLessThanOrEqual(1); // a card may land between the two reads
  await expect.poll(async () => page.locator(".att-plot .arc-dot").count()).toBeGreaterThan(0);
  // The room's lamps are the core's: Accumulator 15 (the hop) lit exactly as the mirror holds it.
  await expect
    .poll(async () => {
      const lit = await roomValue(page, 15);
      const v = (await machine(page))?.acc?.["15"]?.value;
      return typeof v === "number" && Math.abs(lit - v) <= 1 ? "ok" : `lamps ${lit} vs mirror ${v}`;
    }, { timeout: 15_000 })
    .toBe("ok");
  await expect.poll(async () => (await att(page)).cards, { timeout: 150_000 }).toBeGreaterThanOrEqual(20); // (a flight is ~49 s on an idle Mac; slower under load)

  // The landing hold: frozen on the landing card, its numbers on screen.
  await expect(scene(page)).toHaveAttribute("data-scene", "landed", { timeout: 150_000 });
  const l = (await att(page)).landing;
  expect(l && l.up < 0 && l.hop > 0).toBeTruthy();
  await expect(page.locator(".att-caption")).toHaveText("The shell has landed. ENIAC worked out the whole path.");
  await expect(page.locator(".att-land-hop")).toHaveText(`Landed on hop ${l.hop}`);
  await expect(page.locator(".att-land-cards")).toHaveText(`${l.card} cards punched`);
  await expect(page.locator(".att-plot .arc-tag.landed")).toHaveCount(1);
  await shot(page, "attract-2-landed-hold");
  // Freeze on the landing card (FR-19 via run.freezeAt).
  expect(stdinSince(mark)).toContain("s cy.op 1a");

  // Then a fresh flight (a new core): its own session and dots from card 1.
  const first = (await att(page)).session;
  await expect(scene(page)).toHaveAttribute("data-scene", "between", { timeout: 15_000 });
  await expect(page.locator(".att-caption")).toHaveText("Starting another flight.");
  expect(await page.locator(".att-room .lamp.on").count()).toBeGreaterThan(0); // the last real frame, dimmed
  await shot(page, "attract-3-between-flights");
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 15_000 });
  const second = await att(page);
  expect(second.flight).toBe(2);
  expect(second.session).not.toBe(first);
  // Flight 2 drifts back at the pace of flight 1 (its real duration): mid-flight, mid-room.
  if (SHOTS) {
    await expect.poll(async () => (await att(page)).cards, { timeout: 150_000 }).toBeGreaterThanOrEqual(15);
    await shot(page, "attract-1-mid-flight");
  }
  expect((await sent(page)).filter((m) => m.t === "attract_start" || m.t === "attract_stop").map((m) => m.t)).toEqual(["attract_start"]);
});

test("touch hands off at once: the picker shows and the attract core is gone (FR-31)", async ({ page }) => {
  test.setTimeout(90_000);
  await coreUp();
  await page.goto("/");
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await expect.poll(async () => (await att(page)).cards, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
  // Latency in the page: the finger lifts (pointerup) -> the picker is in the DOM -> painted.
  await page.evaluate(() => {
    const w = window as any;
    w.__up = w.__pickerAt = w.__painted = null;
    window.addEventListener("pointerup", () => (w.__up ??= performance.now()), { capture: true });
    new MutationObserver(() => {
      if (w.__pickerAt === null && document.getElementById("app")!.dataset.view === "picker") {
        w.__pickerAt = performance.now();
        requestAnimationFrame(() => requestAnimationFrame(() => (w.__painted = performance.now())));
      }
    }).observe(document.getElementById("app")!, { attributes: true, attributeFilter: ["data-view"] });
  });
  await page.touchscreen.tap(960, 520); // on the room
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await expect.poll(() => page.evaluate(() => (window as any).__painted)).not.toBeNull();
  const lat = await page.evaluate(() => {
    const w = window as any;
    return { dom: w.__pickerAt - w.__up, painted: w.__painted - w.__up };
  });
  test.info().annotations.push({ type: "latency", description: `pointerup -> picker DOM ${lat.dom.toFixed(0)} ms, painted ${lat.painted.toFixed(0)} ms` });
  expect(lat.dom).toBeLessThan(100); // the picker never waits for the bridge
  expect(lat.painted).toBeLessThan(250);
  await expect.poll(async () => (await sent(page)).filter((m) => m.t === "attract_stop").map((m) => m.reason)).toEqual(["touch"]);
  await expect.poll(async () => (await att(page)).phase, { timeout: 3000 }).toBe("off");
  await expect.poll(async () => (await healthz()).session ?? null, { timeout: 3000 }).toBeNull();
  await expect(page.locator(".mission-card")).toHaveCount(3);
  expect((await sent(page)).some((m) => m.t === "start_mission")).toBe(false);
});

test("idle on the picker returns to S1 with attract running again", async ({ page }) => {
  test.setTimeout(120_000);
  await coreUp();
  await page.goto("/");
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await expect.poll(async () => (await att(page)).phase, { timeout: 3000 }).toBe("off");
  // e2e config: setupS 20, countdownS 5.
  await expect(page.locator(".still")).toBeVisible({ timeout: 30_000 });
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 15_000 });
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 20_000 });
  await expect.poll(async () => (await att(page)).cards, { timeout: 30_000 }).toBeGreaterThan(0);
  await expect.poll(() => page.locator(".att-room .lamp.on").count()).toBeGreaterThan(0);
  expect((await sent(page)).filter((m) => m.t === "attract_start" || m.t === "attract_stop").map((m) => m.t + (m.reason ? `:${m.reason}` : ""))).toEqual([
    "attract_start",
    "attract_stop:touch",
    "attract_start",
  ]);
});

test("kill -9 of the attract core: S10 with no lamps, then S1 comes back by itself with attract flying", async ({ page }) => {
  test.setTimeout(150_000);
  await coreUp();
  await page.goto("/");
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await expect.poll(async () => (await att(page)).cards, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
  const pid = (await healthz()).core?.pid;
  expect(typeof pid).toBe("number");
  const t0 = Date.now();
  process.kill(pid, "SIGKILL");
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 10_000 });
  expect(Date.now() - t0).toBeLessThan(10_000);
  await expect(page.locator(".err-code")).toContainText("E-CORE-DOWN");
  await expect(page.locator(".lamp")).toHaveCount(0);
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 60_000 });
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await expect.poll(async () => (await att(page)).cards, { timeout: 30_000 }).toBeGreaterThan(0);
  await expect.poll(() => page.locator(".att-room .lamp.on").count()).toBeGreaterThan(0);
});

test("preview video of S1 on the real core (VIDEO=1)", async ({ browser }) => {
  test.skip(!process.env.VIDEO, "set VIDEO=1");
  test.setTimeout(600_000);
  await coreUp();
  const tmp = join(ROOT, "build", "e2e", "attract-video");
  rmSync(tmp, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, hasTouch: true, recordVideo: { dir: tmp, size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto("/");
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  // The clip: the last 15 s of the flight (the arc coming down, the room
  // drifting) and 5 s of the landing hold, about 20 s in all.
  // Flight 2: its drift is paced by flight 1's real duration.
  await expect.poll(async () => (await att(page)).flight, { timeout: 250_000 }).toBe(2);
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  const liveAt = (Date.now() - t0) / 1000;
  await expect(scene(page)).toHaveAttribute("data-scene", "landed", { timeout: 200_000 });
  const landedAt = (Date.now() - t0) / 1000;
  await page.waitForTimeout(5000);
  const from = Math.max(liveAt, landedAt - 15);
  const to = landedAt + 5;
  const video = page.video()!;
  await ctx.close();
  const webm = await video.path();
  const out = join(ROOT, "docs", "video", "attract-preview.mp4");
  mkdirSync(join(ROOT, "docs", "video"), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", from.toFixed(2), "-to", to.toFixed(2), "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "slow", "-movflags", "+faststart", "-an", out]);
});
