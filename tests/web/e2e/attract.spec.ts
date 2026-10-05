// S1 Attract, live (UX 14.2; FR-30, FR-31, FR-34 to FR-36, FR-43, FR-44)
// against the mock bridge, which flies the recorded real first flight of
// trajdemo.e (mock/missions/trajectory-flight.json) through the same
// attract messages as session/attract.go. The real-core suite is
// e2e-real/attract.spec.ts.

import { test, expect, type Page } from "@playwright/test";
import { fresh, mock, sent, tap, view } from "./helpers.ts";

const scene = (page: Page) => page.locator(".screen.attract");
const roomLit = (page: Page) => page.locator(".att-room .lamp.on");

/** Records every S1 scene change with the number of lit room lamps at that moment. */
async function recordScenes(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __scenes: { scene: string; lit: number }[] };
    w.__scenes = [];
    const note = () => {
      const el = document.querySelector<HTMLElement>(".screen.attract");
      const s = el?.dataset.scene;
      const last = w.__scenes[w.__scenes.length - 1];
      if (s && (!last || last.scene !== s)) w.__scenes.push({ scene: s, lit: document.querySelectorAll(".att-room .lamp.on").length });
    };
    note();
    new MutationObserver(note).observe(document.getElementById("screen")!, { attributes: true, subtree: true, attributeFilter: ["data-scene"], childList: true });
  });
}
const scenes = (page: Page) => page.evaluate(() => (window as unknown as { __scenes: { scene: string; lit: number }[] }).__scenes);

/** Strip position (room px) and transition of the attract panorama. */
const strip = (page: Page) =>
  page.locator(".att-room .pano-strip").evaluate((e: HTMLElement) => ({
    x: Math.abs(Number(/translateX\((-?[\d.]+)px\)/.exec(e.style.transform)?.[1] ?? 0)),
    transition: e.style.transition,
  }));

test("S1 is the live flight: room lamps from the attract core, LIVE chip, dots from the real cards, caption with the hop", async ({ page }) => {
  await mock(page, "hop", { ms: 400 });
  await fresh(page);
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await expect(scene(page)).toHaveAttribute("data-scene", "live");
  await expect(page.locator(".att-chip")).toBeVisible();
  await expect(page.locator(".att-chip")).toHaveText("LIVE");
  // Lamps lit in the room are the attract session's machine, nothing else.
  await expect.poll(() => roomLit(page).count()).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__eniac.mirror.session?.mode)).toBe("attract");
  // Dots: one per real card above ground, the caption's hop is the latest card's.
  await expect.poll(() => page.locator(".att-plot .arc-dot").count(), { timeout: 10_000 }).toBeGreaterThan(4);
  const { hop, count } = await page.evaluate(() => ({ hop: (window as any).__eniac.attract.hop, count: (window as any).__eniac.attract.cards.count }));
  expect(hop).toBeGreaterThan(0);
  expect(count).toBeGreaterThan(0);
  await expect(page.locator(".att-caption")).toContainText(/Live: ENIAC is working out a shell's path\. Hop \d+/);
  await expect(page.locator(".att-plot-hop")).toHaveText(/Hop \d+/);
  await expect(page.locator(".att-plot-empty")).toBeHidden();
  // The plates: the credit plate (Eckert and Mauchly, then Stuart, bottom left), the honor rotator; the pill; no footer.
  // The credit plate is the same component as the honor plate on the right.
  const credit = page.locator(".att-stuart .honor-rotator.credit-slides");
  const cs = credit.locator(".rot-slide");
  await expect(cs).toHaveCount(2);
  await expect(credit.locator(".rot-slide.on .plate-kicker")).toHaveText("ENIAC was designed by", { ignoreCase: true });
  await expect(cs.nth(0).locator(".rot-names span")).toHaveText(["J. Presper Eckert", "John W. Mauchly"]);
  await expect(cs.nth(1).locator(".plate-kicker")).toHaveText("The simulator behind this screen", { ignoreCase: true });
  await expect(cs.nth(1).locator(".rot-names span")).toHaveText(["Brian L. Stuart"]);
  await expect(cs.nth(1).locator(".rot-sub")).toHaveText("Drexel University");
  // One slide shows at a time (the other is transparent), like the honor plate.
  expect(await cs.nth(1).evaluate((e) => getComputedStyle(e).opacity)).toBe("0");
  expect(await cs.nth(0).locator(".rot-names").evaluate((e) => getComputedStyle(e).fontSize)).toBe("40px");
  await expect(page.locator(".att-honor .rot-slide.on .plate-kicker")).toHaveText(/ENIAC.s first programmers/i);
  // Nothing at the top beside the title any more.
  await expect(page.locator(".att-designers")).toHaveCount(0);
  // Both credit slides fit inside the plate's engraved rule.
  const creditFits = await page.evaluate(() => {
    const plate = document.querySelector(".att-stuart .honor-rotator")!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>(".att-stuart .rot-slide")].map((s) => {
      const kids = [...s.querySelectorAll(".plate-kicker, .rot-names span, .rot-sub")].map((k) => { const rg = document.createRange(); rg.selectNodeContents(k); return rg.getBoundingClientRect(); });
      return Math.max(...kids.map((r) => r.bottom)) <= plate.bottom - 12 && Math.max(...kids.map((r) => r.right)) <= plate.right - 12 && Math.min(...kids.map((r) => r.top)) >= plate.top + 12;
    });
  });
  expect(creditFits).toEqual([true, true]);
  // Layout size (the 1 Hz pulse scales the drawn pill by up to 2 %).
  expect(await page.locator(".att-pill").evaluate((e: HTMLElement) => [e.offsetWidth, e.offsetHeight])).toEqual([720, 120]);
  // No footer on S1: the plates carry the credit.
  await expect(page.locator("#footer")).toBeHidden();
  // Nothing on S1 overflows its box (the plates were sized for two-line kickers).
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".att-stuart .plate, .att-honor .plate, .att-caption")]
      .filter((e) => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)
      .map((e) => e.className),
  );
  expect(overflow).toEqual([]);
  // Every honor slide (the rotator shows one at a time) fits inside the plate's engraved rule.
  const slides = await page.evaluate(() => {
    const plate = document.querySelector(".att-honor .honor-rotator")!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>(".att-honor .rot-slide")].map((s) => {
      const kids = [...s.querySelectorAll<HTMLElement>(".plate-kicker, .rot-names span")].map((k) => k.getBoundingClientRect());
      const bottom = Math.max(...kids.map((r) => r.bottom));
      const right = Math.max(...kids.map((r) => r.right));
      return { heading: s.querySelector(".plate-kicker")!.textContent, fits: bottom <= plate.bottom - 12 && right <= plate.right - 12 };
    });
  });
  expect(slides.length).toBe(4);
  expect(slides.filter((s) => !s.fits)).toEqual([]);
  expect(slides.map((s) => s.heading)).toContain("The machine");
  // The arc, its axis labels and the hop tag sit inside the shell's path card.
  const inside = await page.evaluate(() => {
    const c = document.querySelector(".att-plot")!.getBoundingClientRect();
    return [".att-plot-host", ".att-plot .axis-x", ".att-plot .axis-y", ".att-plot-hop"].every((sel) => {
      const r = document.querySelector(sel)!.getBoundingClientRect();
      return r.left >= c.left && r.right <= c.right && r.top >= c.top && r.bottom <= c.bottom;
    });
  });
  expect(inside).toBe(true);
});

test("waking is dark; the landing is held with the landing card's numbers; between flights the last real frame is kept, dimmed", async ({ page }) => {
  test.setTimeout(60_000);
  await mock(page, "reset");
  await mock(page, "hop", { ms: 80 });
  await mock(page, "attract", { holdMs: 3000 });
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await recordScenes(page);
  // The landing hold (the mock flies the recorded first flight: card 34 is the landing).
  await expect(scene(page)).toHaveAttribute("data-scene", "landed", { timeout: 15_000 });
  await expect(page.locator(".att-caption")).toHaveText("The shell has landed. ENIAC worked out the whole path.");
  await expect(page.locator(".att-landing")).toBeVisible();
  await expect(page.locator(".att-land-hop")).toHaveText("Landed on hop 34");
  await expect(page.locator(".att-land-cards")).toHaveText("34 cards punched");
  await expect(page.locator(".att-plot .arc-tag.landed")).toHaveCount(1);
  await expect(page.locator(".att-plot .arc-cross")).toHaveCount(1);
  await expect(page.locator(".att-chip")).toBeHidden(); // frozen on purpose: no frames, no LIVE
  // Then another flight, with its own dots from card 1.
  await expect.poll(async () => (await page.evaluate(() => (window as any).__eniac.attract.flight)), { timeout: 15_000 }).toBe(2);
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 10_000 });
  await expect(page.locator(".att-landing")).toBeHidden();
  const seen = await scenes(page);
  const order = seen.map((s) => s.scene);
  expect(order).toEqual(expect.arrayContaining(["landed", "between", "live"]));
  expect(order.indexOf("between")).toBeGreaterThan(order.indexOf("landed"));
  // Between flights the room keeps the last real frame (lit, dimmed by CSS), never goes blank.
  const between = seen.find((s) => s.scene === "between")!;
  expect(between.lit).toBeGreaterThan(0);
  expect((await sent(page)).filter((m) => m.t === "attract_start")).toHaveLength(1);
});

test("a fresh attract session (after a reload) wakes dark, with Waking ENIAC... and a spinner", async ({ page }) => {
  await mock(page, "reset");
  await page.addInitScript(() => {
    // Record the first S1 scene and its lit lamps before anything else runs.
    const w = window as unknown as { __first: { scene: string; lit: number; caption: string } | null };
    w.__first = null;
    const t = setInterval(() => {
      const el = document.querySelector<HTMLElement>(".screen.attract");
      if (!el) return;
      clearInterval(t);
      w.__first = { scene: el.dataset.scene ?? "", lit: document.querySelectorAll(".att-room .lamp.on").length, caption: el.querySelector(".att-caption")?.textContent ?? "" };
    }, 5);
  });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => (window as any).__first)).not.toBeNull();
  const first = await page.evaluate(() => (window as any).__first);
  expect(first.scene).toBe("waking");
  expect(first.lit).toBe(0);
  expect(first.caption).toBe("Waking ENIAC...");
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 5000 });
});

test("the camera drifts slowly along the U, one way per flight, the other way on the next", async ({ page }) => {
  test.setTimeout(60_000);
  await mock(page, "reset");
  await mock(page, "hop", { ms: 80 });
  await mock(page, "attract", { holdMs: 500 });
  await page.goto("/");
  await expect(scene(page)).toHaveAttribute("data-scene", "live");
  await expect.poll(async () => (await strip(page)).x).toBeGreaterThan(5000);
  const s1 = await strip(page);
  const ms = Number(/transform (\d+)ms/.exec(s1.transition)?.[1]);
  expect(ms).toBeGreaterThan(45_000); // about 80 px a second over 4,175 screen px
  expect(s1.transition).toContain("ease-in-out");
  await expect.poll(async () => page.evaluate(() => (window as any).__eniac.attract.flight), { timeout: 15_000 }).toBe(2);
  await expect.poll(async () => (await strip(page)).x, { timeout: 10_000 }).toBe(0);
});

test("touch anywhere hands off at once: the picker shows and the bridge gets attract_stop (touch)", async ({ page }) => {
  await fresh(page);
  await expect(scene(page)).toHaveAttribute("data-scene", "live");
  // A touch on the room (not on the pill) is the same target.
  const t0 = Date.now();
  await page.touchscreen.tap(700, 520);
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  expect(Date.now() - t0).toBeLessThan(1000);
  await expect.poll(async () => (await sent(page)).filter((m) => m.t === "attract_stop").map((m) => m.reason)).toEqual(["touch"]);
  await expect.poll(() => page.evaluate(() => (window as any).__eniac.attract.phase)).toBe("off");
  expect((await sent(page)).some((m) => m.t === "start_mission")).toBe(false);
});

test("FR-36: no live status for 5 s shows WAITING at 3 s, then S10; live again returns to S1", async ({ page }) => {
  test.setTimeout(60_000);
  await mock(page, "reset");
  await mock(page, "hop", { ms: 900 });
  await page.goto("/");
  await expect(scene(page)).toHaveAttribute("data-scene", "live");
  await expect(page.locator(".att-chip")).toHaveText("LIVE");
  await expect.poll(() => page.evaluate(() => (window as any).__eniac.attract.phase)).toBe("flying");
  await mock(page, "frames", { paused: true });
  await expect(page.locator(".att-chip")).toHaveText("WAITING", { timeout: 4500 });
  await expect(page.locator(".att-chip")).toHaveClass(/waiting/);
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 4000 });
  await expect(page.locator(".err-text h1")).toHaveText("ENIAC is resting.");
  await expect(page.locator(".err-code")).toHaveText("E-ATTRACT");
  await expect(page.locator(".lamp")).toHaveCount(0); // S10 never shows canned lamps
  await mock(page, "frames", { paused: false });
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 5000 });
  await expect(page.locator(".att-chip")).toHaveText("LIVE");
});

test("core down on S1: S10, then recovery brings S1 back with attract flying again", async ({ page }) => {
  test.setTimeout(60_000);
  await mock(page, "hop", { ms: 300 });
  await fresh(page);
  await expect(scene(page)).toHaveAttribute("data-scene", "live");
  await mock(page, "fault", { code: "E-CORE-DOWN", recoverAfterMs: 3000 });
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 3000 });
  await expect(page.locator(".err-code")).toHaveText("E-CORE-DOWN (mock)");
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 8000 });
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 8000 });
  await expect.poll(() => roomLit(page).count()).toBeGreaterThan(0);
  await expect.poll(() => page.locator(".att-plot .arc-dot").count(), { timeout: 10_000 }).toBeGreaterThan(0);
});

test("reduced motion: no drift and no pulse; the camera cuts between four framings every 10 s", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mock(page, "hop", { ms: 400 });
  await fresh(page);
  await expect(scene(page)).toHaveAttribute("data-scene", "live");
  await expect(page.locator(".att-pill")).toHaveClass(/still/);
  expect(await page.locator(".att-pill").evaluate((e) => getComputedStyle(e).animationName)).toBe("none");
  expect(await page.locator(".att-honor .honor-rotator").getAttribute("class")).toContain("cut");
  const a = await strip(page);
  expect(a.x).toBe(0);
  await page.waitForTimeout(2000);
  expect((await strip(page)).x).toBe(0); // no drift while flying
  await expect.poll(async () => (await strip(page)).x, { timeout: 12_000 }).toBeGreaterThan(0);
  const b = await strip(page);
  expect(b.transition).toBe("none"); // a cut (with a cross-fade on the room), not a slide
});

test("S1 tap target: the whole screen; a stray tap on a plate goes to the picker too", async ({ page }) => {
  await fresh(page);
  await tap(page, page.locator(".att-stuart"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
});

test("the credit plate turns from Eckert and Mauchly to Stuart, 4 s out of step with the honor plate", async ({ page }) => {
  test.setTimeout(40_000);
  await fresh(page);
  const on = page.locator(".att-stuart .rot-slide.on .rot-names span").first();
  await expect(on).toHaveText("J. Presper Eckert");
  // The honor plate turns at 8 s; the credit plate holds until 12 s.
  await expect(page.locator(".att-honor .rot-slide.on .plate-kicker")).not.toHaveText(/first programmers/i, { timeout: 10_000 });
  await expect(on).toHaveText("J. Presper Eckert");
  await expect(on).toHaveText("Brian L. Stuart", { timeout: 6_000 });
  await expect(page.locator(".att-stuart .rot-slide[aria-hidden='false']")).toHaveCount(1);
});

test("the credit footer is back as soon as S1 is left", async ({ page }) => {
  await fresh(page);
  await expect(page.locator("#footer")).toBeHidden();
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await expect(page.locator("#footer")).toHaveText("ENIAC designed by J. Presper Eckert and John W. Mauchly · Simulator by Brian L. Stuart, Drexel University");
});
