// Squares explained with tiles (docs/handoff-squares-tiles.md): the briefing
// and plan stage figures, Again, reduced motion, and that navigation never
// waits on the animation (ui/anim.ts rule).

import { test, expect, type Page } from "@playwright/test";
import { devMission, mainBtn, tap, tapSlow } from "./helpers.ts";

const fig = (page: Page, kind: "briefing" | "plan") => page.locator(`.alt-view [data-figure="${kind}"]`);
const litTiles = (page: Page) => page.locator(".alt-view .tile.on");
const term = (page: Page, t: string) => page.locator(`.tiles-eq .term[data-term="${t}"]`);
const again = (page: Page) => page.locator(".tiles-again");

/** Records when tiles turn on and terms light, relative to the latest pass start. */
async function record(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;
    w.__tiles = { t0: performance.now(), tiles: [] as { i: string; part: string; t: number }[], terms: [] as { term: string; t: number }[], captions: [] as string[] };
    const root = document.querySelector(".alt-view")!;
    new MutationObserver((muts) => {
      for (const m of muts) {
        const el = m.target as HTMLElement;
        const t = performance.now() - w.__tiles.t0;
        if (m.type === "attributes" && m.attributeName === "data-pass") {
          // A new pass (loop or Again): record it from its own t = 0.
          Object.assign(w.__tiles, { t0: performance.now(), tiles: [], terms: [], captions: [] });
          continue;
        }
        if (m.type === "attributes" && el.classList.contains("tile") && el.classList.contains("on") && !(m.oldValue ?? "").includes(" on")) w.__tiles.tiles.push({ i: el.dataset.i, part: el.dataset.part, t });
        if (m.type === "attributes" && el.classList.contains("term") && el.classList.contains("lit") && !(m.oldValue ?? "").includes("lit")) w.__tiles.terms.push({ term: el.dataset.term, t });
        if (m.type === "childList" && el.classList.contains("tiles-caption")) w.__tiles.captions.push(el.textContent);
      }
    }).observe(root, { subtree: true, attributes: true, attributeFilter: ["class", "data-pass"], attributeOldValue: true, childList: true });
  });
}
const recorded = (page: Page) => page.evaluate(() => (window as any).__tiles);

async function slowAnimations(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.02 });
}

test("briefing: 9 tiles light one at a time (about 350 ms apart) with counting captions, then it loops", async ({ page }) => {
  await devMission(page);
  await expect(fig(page, "briefing")).toBeVisible();
  await expect(page.locator(".alt-view .tile")).toHaveCount(9);
  // Start from a fresh pass so the recording sees a whole one.
  const pass = Number(await fig(page, "briefing").getAttribute("data-pass"));
  await expect(fig(page, "briefing")).toHaveAttribute("data-pass", String(pass + 1), { timeout: 12_000 });
  await record(page);
  await expect(page.locator(".tiles-caption")).toHaveText("The square of 3 is 9", { timeout: 8000 });
  await expect(litTiles(page)).toHaveCount(9);
  const r = await recorded(page);
  expect(r.tiles.map((x: { i: string }) => x.i)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8"]);
  for (let k = 1; k < r.tiles.length; k++) {
    const gap = r.tiles[k].t - r.tiles[k - 1].t;
    expect(gap).toBeGreaterThan(200);
    expect(gap).toBeLessThan(600);
  }
  expect(r.captions).toEqual(["1 tile", "2 tiles", "3 tiles", "4 tiles", "5 tiles", "6 tiles", "7 tiles", "8 tiles", "9 tiles", "3 rows of 3 = 9 tiles", "The square of 3 is 9"]);
  // It loops: a new pass starts from an empty floor.
  await expect(fig(page, "briefing")).toHaveAttribute("data-pass", String(pass + 2), { timeout: 8000 });
  await expect(litTiles(page)).not.toHaveCount(9);
});

test("plan: base, row, column, corner, then = 16; each piece lights its own term, with +3/+3/+1 labels", async ({ page }) => {
  await devMission(page);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  await expect(fig(page, "plan")).toBeVisible();
  await expect(page.locator(".alt-view .tile")).toHaveCount(16);
  await expect(page.locator(".tiles-eq")).toHaveText("9+3+3+1=16");
  // Restart so the recording covers one pass from t = 0.
  await record(page);
  await tap(page, again(page));
  await expect(term(page, "total")).toHaveClass(/lit/, { timeout: 9000 });
  const r = await recorded(page);
  expect(r.terms.map((x: { term: string }) => x.term)).toEqual(["base", "row", "col", "corner", "total"]);
  const firstPart = (p: string) => r.tiles.find((x: { part: string }) => x.part === p).t;
  const termAt = (t: string) => r.terms.find((x: { term: string }) => x.term === t).t;
  expect(firstPart("base")).toBeLessThan(firstPart("row"));
  expect(firstPart("row")).toBeLessThan(firstPart("col"));
  expect(firstPart("col")).toBeLessThan(firstPart("corner"));
  // Approximate beat times (s): row 1.8, column 3.6, corner 5.4, = 16 at 6.6.
  for (const [t, at] of [["row", 1800], ["col", 3600], ["corner", 5400], ["total", 6600]] as const) {
    expect(Math.abs(termAt(t) - termAt("base") - (at - 500))).toBeLessThan(400);
  }
  // Row left to right, column top to bottom.
  const order = (p: string) => r.tiles.filter((x: { part: string }) => x.part === p).map((x: { i: string }) => Number(x.i));
  expect(order("row")).toEqual([9, 10, 11]);
  expect(order("col")).toEqual([12, 13, 14]);
  // Second cue beside colour (UX 6.4).
  await expect(page.locator(".tile-label.row")).toHaveText("+3");
  await expect(page.locator(".tile-label.col")).toHaveText("+3");
  await expect(page.locator(".tile-label.corner")).toHaveText("+1");
  await expect(page.locator(".tile-label.on")).toHaveCount(3);
  // Dedicated tile tokens, not the cable/ok ones.
  const colours = await page.evaluate(() => {
    const css = (el: Element | null) => (el ? getComputedStyle(el).backgroundColor : "");
    const root = getComputedStyle(document.documentElement);
    const rules = [...document.styleSheets].flatMap((s) => [...s.cssRules].map((r) => r.cssText)).filter((t) => t.includes(".tile."));
    return {
      row: css(document.querySelector(".tile.row")),
      col: css(document.querySelector(".tile.col")),
      corner: css(document.querySelector(".tile.corner")),
      tokens: ["--tile-base", "--tile-row", "--tile-col", "--tile-corner"].map((t) => root.getPropertyValue(t).trim()),
      usesCableOrOk: rules.some((t) => /--cable-|--ok\b|--lamp-on/.test(t)),
    };
  });
  expect(colours.tokens.every(Boolean)).toBe(true);
  expect(colours.usesCableOrOk).toBe(false);
  expect(colours.row).toBe("rgb(86, 180, 233)");
  expect(colours.col).toBe("rgb(204, 121, 167)");
  expect(colours.corner).toBe("rgb(0, 158, 115)");
});

test("plan loops after about 11 s; Again replays at once and is a 64 px target", async ({ page }) => {
  await devMission(page);
  await tapSlow(page, mainBtn(page));
  await expect(fig(page, "plan")).toHaveAttribute("data-pass", "1");
  const t0 = Date.now();
  await expect(term(page, "total")).toHaveClass(/lit/, { timeout: 9000 });
  await expect(fig(page, "plan")).toHaveAttribute("data-pass", "2", { timeout: 13_000 });
  const loop = Date.now() - t0;
  expect(loop).toBeGreaterThan(9500);
  expect(loop).toBeLessThan(12_500);
  await expect(term(page, "total")).toHaveClass(/lit/, { timeout: 9000 });
  const b = (await again(page).boundingBox())!;
  expect(b.width).toBeGreaterThanOrEqual(64);
  expect(b.height).toBeGreaterThanOrEqual(64);
  await expect(again(page)).toHaveText("↻ Again");
  await tap(page, again(page));
  await expect(fig(page, "plan")).toHaveAttribute("data-pass", "3", { timeout: 500 });
  await expect(term(page, "total")).not.toHaveClass(/lit/, { timeout: 500 });
  await expect(page.locator(".tile-label.on")).toHaveCount(0, { timeout: 500 });
  await expect(term(page, "base")).toHaveClass(/lit/, { timeout: 2000 });
  // Again did not leave the plan.
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
});

test("reduced motion: finished grids with all terms lit, nothing animates, no Again", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await devMission(page);
  await expect(litTiles(page)).toHaveCount(9, { timeout: 500 });
  await expect(page.locator(".tiles-caption")).toHaveText("The square of 3 is 9");
  await tapSlow(page, mainBtn(page));
  await expect(fig(page, "plan")).toBeVisible();
  await expect(litTiles(page)).toHaveCount(16, { timeout: 500 });
  for (const t of ["base", "row", "col", "corner", "total"]) await expect(term(page, t)).toHaveClass(/lit/);
  await expect(page.locator(".tile-label.on")).toHaveCount(3);
  await expect(again(page)).toHaveCount(0);
  await page.waitForTimeout(1500);
  await expect(litTiles(page)).toHaveCount(16);
  await expect(fig(page, "plan")).not.toHaveAttribute("data-pass", /./);
});

for (const slow of [false, true]) {
  test(`navigation never waits on the tile animation${slow ? " (animations throttled)" : ""}`, async ({ page }) => {
    await devMission(page);
    if (slow) await slowAnimations(page);
    await page.waitForTimeout(300);
    // Let's go mid-briefing animation.
    await tap(page, mainBtn(page));
    await expect(page.locator(".step-card h2")).toHaveText("Here is the trick", { timeout: 1000 });
    await expect(page.locator('.alt-view [data-figure="briefing"]')).toHaveCount(0);
    // The beats are timer-driven: 2.5 s in, base + row are on even if frames crawl.
    await expect(litTiles(page)).toHaveCount(12, { timeout: 3500 });
    await expect(term(page, "row")).toHaveClass(/lit/);
    await page.waitForTimeout(450);
    // Next step mid-plan animation: straight to step 1, figure and Again gone.
    await tap(page, mainBtn(page));
    await expect(page.locator(".step-card h2")).toHaveText("Dial in the number 1", { timeout: 1000 });
    await expect(page.locator(".alt-view .tiles")).toHaveCount(0);
    await expect(again(page)).toHaveCount(0);
  });
}
