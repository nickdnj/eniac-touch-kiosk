// Explore ENIAC (S14) on the REAL bridge and core: the attract session runs
// Mission 3's program by itself and the panorama's lamps are its real
// status; a mission's briefing shows its own core; the core killed under the
// tour leaves it working with the notice. With SCREENSHOTS=1 it also writes
// the M3 review screenshots (docs/screenshots/m3), all from the real core.

import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { tap, tapSlow, view } from "../e2e/helpers.ts";
import { coreUp, healthz, logMark, machine, recordSent, sent, startSquares, stdinSince } from "./real.ts";

const SHOTS = !!process.env.SCREENSHOTS;
const dir = join(__dirname, "..", "..", "..", "docs", "screenshots", "m3");
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(dir, `${name}.png`) });
};

test.beforeEach(async ({ page }) => {
  await recordSent(page);
});

/** The lit digit of each column of accumulator n in the panorama, or -1 if not exactly one. */
async function panoValue(page: Page, n: number): Promise<number> {
  return page.evaluate((n) => {
    let digits = "";
    for (let d = 1; d <= 10; d++) {
      const lit = [...document.querySelectorAll(`.pano [id^="lamp:acc.${n}.d.${d}."].on`)];
      if (lit.length !== 1) return -1;
      digits += lit[0].id.split(".").pop();
    }
    return Number(digits);
  }, n);
}

async function toExplore(page: Page): Promise<void> {
  await coreUp();
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await page.waitForTimeout(650);
  await shot(page, "01-picker-explore-button");
  await tapSlow(page, page.locator(".pk-explore"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
}

test("from the picker: the bridge's attract session flies Mission 3 by itself and the panorama shows its real lamps", async ({ page }) => {
  test.setTimeout(150_000);
  const mark = logMark();
  await toExplore(page);
  await expect(page.locator(".ex-live")).toHaveText("LIVE: ENIAC is working out a shell's path", { timeout: 20_000 });
  // The real run: the whole program, then READ (b c, b r) and one INIT, by the bridge.
  await expect.poll(() => stdinSince(mark).filter((c) => /^b [cri]$/.test(c)), { timeout: 30_000 }).toEqual(["b c", "b r", "b i"]);
  // S1 ran attract, the touch handed off, then Explore asked for it again (attract_start).
  expect((await sent(page)).filter((m) => m.t === "attract_start" || m.t === "attract_stop").map((m) => m.t + (m.reason ? `:${m.reason}` : ""))).toEqual(["attract_start", "attract_stop:touch", "attract_start"]);
  // Hops are counted in Accumulator 15 and the lamps show exactly the mirrored value.
  await expect.poll(async () => (await machine(page))?.acc?.["15"]?.value ?? 0, { timeout: 60_000 }).toBeGreaterThan(2);
  // Acc 15 changes once a hop (the others integrate all through it); lamps may trail the mirror by one frame.
  await expect
    .poll(async () => {
      const lit = await panoValue(page, 15);
      const v = (await machine(page)).acc["15"].value;
      return Math.abs(lit - v) <= 1 ? "ok" : `lamps ${lit} vs mirror ${v}`;
    }, { timeout: 10_000 })
    .toBe("ok");
  // The multiplier works between cards (a lamp lit there is real status, not decoration).
  await expect.poll(async () => page.locator('.pano [id^="lamp:mult."].on').count(), { timeout: 20_000 }).toBeGreaterThan(0);
  await shot(page, "02-explore-intro-live");

  // The walk, live: the master programmer, then an accumulator with its live line.
  await tapSlow(page, page.locator(".ex-walk"));
  await tapSlow(page, page.locator(".ex-next"));
  await tapSlow(page, page.locator(".ex-next"));
  await expect(page.locator(".ex-rail h2")).toHaveText("Master Programmer");
  await shot(page, "03-explore-card-master-programmer");
  // Accumulator 18 holds "along": tap it on the minimap's right wall, then its chip.
  const mm = (await page.locator(".ex-minimap").boundingBox())!;
  await page.touchscreen.tap(mm.x + 18 + 27 * 33 + 16, mm.y + mm.height / 2);
  await page.waitForTimeout(950);
  await tapSlow(page, page.locator('.pano-chip[data-id="a18"]'));
  await expect(page.locator(".ex-rail h2")).toHaveText("Accumulator 18");
  await expect(page.locator(".ex-rail .live-line")).toHaveText(/^Right now, Accumulator 18 holds -?\d{10}$/);
  await shot(page, "04-explore-card-accumulator-live");
  await tapSlow(page, page.locator(".ex-rail .close"));

  // Mission 3's units: the program's own (multiplier, Function Table 2, 19 accumulators).
  await tapSlow(page, page.locator('.ex-mchips .mchip[data-mission="trajectory"]'));
  await expect(page.locator('.pano-unit[data-id="mult"]')).toHaveClass(/hl/);
  await expect(page.locator(".pano-unit.k-acc.hl")).toHaveCount(19);
  await page.touchscreen.tap(mm.x + 18 + 18 * 33 + 16, mm.y + mm.height / 2);
  await shot(page, "05-explore-mission-3-units");

  // Glossary, both pages.
  await tapSlow(page, page.locator(".ex-gloss-btn"));
  await expect(page.locator(".gl-tile")).toHaveCount(8);
  await shot(page, "06-glossary-page-1");
  await tapSlow(page, page.locator(".gl-page"));
  await expect(page.locator('.gl-tile[data-term="Transceiver"]')).toBeVisible();
  await shot(page, "07-glossary-page-2");
  await tapSlow(page, page.locator(".gl-close"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");

  // Starting Mission 3 from Explore replaces the attract core with a visitor's.
  await tapSlow(page, page.locator(".ex-rail .ex-start"));
  await expect(page.locator(".step-card h2")).toHaveText("The path of a shell", { timeout: 20_000 });
  const s = await page.evaluate(() => (window as any).__eniac.mirror.session);
  expect([s.mission, s.mode]).toEqual(["trajectory", "visitor"]);
});

test("from a briefing: the mission's own core, nothing started; Back returns to the briefing", async ({ page }) => {
  await startSquares(page);
  const id = await page.evaluate(() => (window as any).__eniac.mirror.session.id);
  await tapSlow(page, page.locator(".rail .explore-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".ex-live")).toHaveText("LIVE: your Mission 1 machine");
  // The visitor's machine at rest: Accumulators 1 and 2 hold 0, lit as 0 in every column.
  await expect.poll(() => panoValue(page, 1)).toBe(0);
  expect((await sent(page)).filter((m) => m.t === "attract_start")).toHaveLength(1); // only S1's, before the touch
  await tapSlow(page, page.locator(".ex-back"));
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  expect(await page.evaluate(() => (window as any).__eniac.mirror.session.id)).toBe(id);
});

test("kill -9 of the attract core under the tour: the notice, every lamp dark, the tour still works, then live again", async ({ page }) => {
  test.setTimeout(150_000);
  await toExplore(page);
  await expect(page.locator(".ex-live")).toHaveText(/LIVE/, { timeout: 20_000 });
  await expect(page.locator(".pano .lamp.on").first()).toBeAttached({ timeout: 20_000 });
  const pid = (await healthz()).core?.pid;
  expect(typeof pid).toBe("number");
  process.kill(pid, "SIGKILL");
  await expect(page.locator(".ex-pill")).toBeVisible({ timeout: 10_000 });
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".pano .lamp.on")).toHaveCount(0);
  await tapSlow(page, page.locator('.ex-mchips .mchip[data-mission="primes"]'));
  await expect(page.locator(".ex-rail .ex-start")).toHaveText("ENIAC is resting");
  await shot(page, "08-explore-core-down-notice");
  // Recovery: the notice goes, a fresh attract core lights the room again.
  await expect(page.locator(".ex-pill")).toBeHidden({ timeout: 60_000 });
  await expect(page.locator(".pano .lamp.on").first()).toBeAttached({ timeout: 60_000 });
  await expect(view(page)).toHaveAttribute("data-view", "explore");
});
