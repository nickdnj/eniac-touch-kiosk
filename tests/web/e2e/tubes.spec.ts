// S16 "Keeping ENIAC alive" (docs/tubes.md 2.9; UX 14.11; PRD FR-99 to
// FR-101) against the dev mock. Touch only; 1920 x 1080. The unit half
// (copy, claims, numbers, the state machine, the static import check) is
// tests/web/tubes.test.ts. Screenshots (docs/screenshots/m3/tubes-*.png)
// only with SCREENSHOTS=1.

import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { fresh, mock, sent, tap, tapSlow, view } from "./helpers.ts";

const rail = (page: Page) => page.locator(".tb-rail");
const stage = (page: Page) => page.locator(".tb-stage");
const plate = (page: Page) => page.locator(".tb-plate");
const target = (page: Page, i: number) => page.locator(`.tb-target[data-i="${i}"]`);
const fb = (page: Page) => rail(page).locator(".tb-fb");
const PLATE = "These panels are drawn, not the live ENIAC. The fault is made up. The steps follow the 1946 maintenance manual.";
const metrics = async (page: Page, ev: string) => (await sent(page)).filter((m) => m.t === "metric" && m.ev === ev);

async function toExplore(page: Page): Promise<void> {
  await fresh(page);
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await page.waitForTimeout(650); // the picker ignores the S1 visitor's double tap
  await tap(page, page.locator(".pk-explore"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".ex-mchips .mchip")).toHaveCount(3);
}

async function toTubes(page: Page): Promise<void> {
  await toExplore(page);
  await tapSlow(page, page.locator(".ex-tubes-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await expect(rail(page).locator("h2")).toHaveText("The tubes");
}

/** From card 1 to step 1 of "Find the dead tube". */
async function toTry(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) await tapSlow(page, rail(page).locator(".tb-next"));
  await expect(rail(page).locator("h2")).toHaveText("The hunt");
  await tapSlow(page, rail(page).locator(".tb-cta"));
  await expect(rail(page).locator("h2")).toHaveText("Run the test");
}

async function plateOk(page: Page): Promise<void> {
  await expect(plate(page)).toBeVisible();
  await expect(plate(page).locator(".tb-badge")).toHaveText("RE-ENACTMENT");
  await expect(plate(page).locator(".tb-plate-text")).toHaveText(PLATE);
}

/** The digits each drawn panel shows (the lit lamp's row, per place), from the DOM. */
async function panelDigits(page: Page): Promise<string[]> {
  return page.locator(".tb-stage svg.tb-acc").evaluateAll((svgs) =>
    svgs.map((s) => {
      const d = Array(10).fill("-");
      s.querySelectorAll(".tl.on").forEach((l) => (d[Number(l.getAttribute("data-place")) - 1] = l.getAttribute("data-digit")));
      return d.join("");
    }),
  );
}

async function railFits(page: Page): Promise<void> {
  const r = await rail(page).evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
  expect(r.sh, "rail content overflows").toBeLessThanOrEqual(r.ch);
}

test("TUBE-21: the header button is on S14 in every state; Back returns to the same place in the tour", async ({ page }) => {
  await toExplore(page);
  const btn = page.locator(".ex-tubes-btn");
  await expect(btn).toHaveText("Keeping ENIAC alive");
  const b = (await btn.boundingBox())!;
  expect(Math.round(b.height)).toBe(64);
  expect(Math.round(b.width)).toBe(430);
  // State B (a card) and state C (a mission): still there.
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await tapSlow(page, page.locator('.pano-chip[data-id="a3"]'));
  await expect(page.locator(".ex-rail h2")).toHaveText("Accumulator 3");
  await tapSlow(page, page.locator('.ex-mchips .mchip[data-mission="primes"]'));
  await expect(btn).toBeVisible();
  await tapSlow(page, btn);
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await expect(page.locator(".tb-back")).toHaveText("‹ Explore");
  await expect(page.locator(".header .title")).toHaveText("Keeping ENIAC alive");
  await tapSlow(page, page.locator(".tb-back"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".ex-rail h2")).toHaveText("Accumulator 3");
  await expect(page.locator(".ex-readout")).toHaveText("You are looking at: Accumulator 1 to Accumulator 7");
  await expect(page.locator('.ex-mchips .mchip[data-mission="primes"]')).toHaveClass(/on/);
  await expect(page.locator(".ex-back")).toHaveText("‹ Missions");
  expect((await metrics(page, "tubes_open")).map((m) => m.screen)).toEqual(["explore"]);
  // The attract loop kept running through S16 (the room's lamps stay live).
  expect((await sent(page)).filter((m) => m.t === "attract_stop").map((m) => m.reason)).toEqual(["touch"]);
});

test("the five cards in order, each fits the rail with its figure; Previous, Next, Finish; the myth card from card 2", async ({ page }) => {
  await toTubes(page);
  const titles = ["The tubes", "Power and heat", "Why tubes burned out", "The hunt", "A week with ENIAC"];
  const eyebrows = ["1 OF 5 · ABOUT 18,000", "2 OF 5 · A BIG APPETITE", "3 OF 5 · HARD ON TUBES", "4 OF 5 · WHICH TUBE?", "5 OF 5 · TIME AT WORK"];
  await expect(rail(page).locator(".tb-prev")).toHaveClass(/disabled/);
  for (let i = 0; i < 5; i++) {
    await expect(rail(page).locator("h2")).toHaveText(titles[i]);
    await expect(rail(page).locator(".eyebrow span").first()).toHaveText(eyebrows[i]);
    await expect(stage(page).locator(`.tb-figure[data-card="${i + 1}"]`)).toBeVisible();
    await railFits(page);
    if (i < 4) await tapSlow(page, rail(page).locator(".tb-next"));
  }
  await expect(rail(page).locator(".tb-next")).toHaveText("Finish");
  // TUBE-04 in the DOM: one dot per tube.
  await tapSlow(page, rail(page).locator(".tb-prev"));
  for (let i = 0; i < 3; i++) await tapSlow(page, rail(page).locator(".tb-prev"));
  await expect(rail(page).locator("h2")).toHaveText("The tubes");
  await expect(stage(page).locator(".tb-dots")).toHaveAttribute("data-dots", "18000");
  await expect(stage(page).locator(".tb-cap.parts")).toHaveText("Also inside: about 70,000 resistors, 10,000 capacitors and 500,000 soldered joints.");
  // Card 2: the myth check and back.
  await tapSlow(page, rail(page).locator(".tb-next"));
  await tapSlow(page, rail(page).locator(".tb-myth-link"));
  await expect(rail(page).locator(".eyebrow span").first()).toHaveText("MYTH CHECK");
  await expect(rail(page).locator("h2")).toHaveText("Did the lights of Philadelphia dim?");
  await expect(rail(page).locator(".body")).toHaveText(/^No\. .*“total fiction\.”/);
  await railFits(page);
  await tapSlow(page, rail(page).locator(".tb-myth-back"));
  await expect(rail(page).locator("h2")).toHaveText("Power and heat");
  // Finish on card 5 returns to the tour.
  for (let i = 0; i < 3; i++) await tapSlow(page, rail(page).locator(".tb-next"));
  await tapSlow(page, rail(page).locator(".tb-next"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  // TUBE-23: each counter once per event, no free text.
  const cards = (await metrics(page, "tubes_card")).map((m) => m.n);
  expect(cards).toEqual([1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 2, 3, 4, 5]);
  expect(await metrics(page, "tubes_myth_open")).toHaveLength(1);
  expect(await metrics(page, "tubes_open")).toHaveLength(1);
  for (const m of (await sent(page)).filter((x) => x.t === "metric" && String(x.ev).startsWith("tubes_"))) {
    const { at: _at, ...msg } = m; // "at" is the mock log's own timestamp
    expect(Object.keys(msg).every((k) => ["t", "id", "ev", "screen", "n", "assisted"].includes(k)), JSON.stringify(msg)).toBe(true);
  }
});

test("TUBE-10 to 12: find the dead tube by touch: the plate on every state, the ladder, warm and COLD, the fixed state", async ({ page }) => {
  await toTubes(page);
  await toTry(page);
  await plateOk(page);
  expect(await panelDigits(page)).toEqual(["0000000000", "0000000000", "0000000000", "0000000000"]);
  // An empty tap is a neutral ripple, not a wrong tap.
  await tap(page, { x: 24 + 680, y: 112 + 885 });
  await expect(fb(page)).toHaveCount(0);
  await tapSlow(page, rail(page).locator(".tb-run"));
  // Step 2: which panel?
  await expect(rail(page).locator("h2")).toHaveText("Which panel is wrong?");
  await expect(rail(page).locator(".eyebrow span").first()).toHaveText("STEP 2 OF 5");
  await plateOk(page);
  expect(await panelDigits(page)).toEqual(["5555555555", "5555555555", "5559555555", "5555555555"]);
  await expect(page.locator(".tb-target.panel")).toHaveCount(4);
  await expect(page.locator(".tb-target.panel").nth(0)).toHaveAttribute("aria-label", "ACC 1");
  // Wrong #1: the X badge on the tapped panel, and the hint.
  await tap(page, target(page, 0));
  await expect(target(page, 0)).toHaveClass(/x-on/);
  await expect(fb(page)).toHaveText("✕Not quite. That one lines up with the others. Try another.");
  await page.waitForTimeout(700);
  await expect(target(page, 0)).not.toHaveClass(/x-on/);
  // Wrong #2: the right panel's ring thickens.
  await tapSlow(page, target(page, 1));
  await expect(target(page, 2)).toHaveClass(/ring2/);
  await expect(target(page, 2).locator(".tb-ring")).toBeVisible();
  await expect(fb(page)).toContainText("Look for the glowing ring. Hint: look for a lamp sitting lower than the rest.");
  await expect(rail(page).locator(".tb-dfm")).not.toHaveClass(/filled/);
  // Wrong #3: Do it for me turns filled.
  await tapSlow(page, target(page, 3));
  await expect(rail(page).locator(".tb-dfm")).toHaveClass(/filled/);
  await expect(fb(page)).toContainText("Want us to do this one?");
  // A tap 10 px outside the right panel still counts (UX 6.6 tolerance).
  const p2 = (await target(page, 2).boundingBox())!;
  await page.touchscreen.tap(p2.x + p2.width / 2, p2.y + p2.height + 10);
  // Step 3: which digit place? The ladder starts again.
  await expect(rail(page).locator("h2")).toHaveText("Which digit place?");
  await expect(fb(page)).toHaveText("✓ACC 3 it is. Its lamps are out of line.");
  await expect(rail(page).locator(".tb-dfm")).not.toHaveClass(/filled/);
  await plateOk(page);
  await expect(page.locator(".tb-target.place")).toHaveCount(10);
  await tapSlow(page, target(page, 0));
  await expect(fb(page)).toContainText("That column is right.");
  await tapSlow(page, target(page, 3));
  await expect(fb(page)).toHaveText("✓Place 4 shows 9, not 5. Its plug-in unit slides out.");
  // Step 4: which tube? Warm is not an error.
  await expect(rail(page).locator("h2")).toHaveText("Which tube?");
  await plateOk(page);
  await expect(stage(page)).toContainText("Place 4 plug-in unit, pulled out.");
  await expect(page.locator(".tb-target.tube")).toHaveCount(8);
  await tapSlow(page, target(page, 0));
  await expect(target(page, 0)).toHaveClass(/warm/);
  await expect(target(page, 0).locator(".tb-tube-lab")).toHaveText("warm");
  await expect(fb(page)).toHaveText("✓Warm. That one works. Try another.");
  await expect(page.locator(".tb-target.x-on")).toHaveCount(0);
  await tapSlow(page, target(page, 2));
  // Step 5.
  await expect(rail(page).locator("h2")).toHaveText("Plug in a fresh unit");
  await expect(target(page, 2)).toHaveClass(/cold/);
  await expect(target(page, 2).locator(".tb-tube-lab")).toHaveText("COLD");
  await plateOk(page);
  await tapSlow(page, rail(page).locator(".tb-plug"));
  // Fixed: four panels of 5555555555, the plate still there, no score.
  await expect(rail(page).locator(".tb-win")).toHaveText("✓ Fixed!");
  await expect(rail(page).locator(".body")).toHaveText("Every lamp lines up again. A real crew would also test the dead tube and write it in the log. Eckert said a hunt took up to 15 minutes.");
  await plateOk(page);
  expect(await panelDigits(page)).toEqual(["5555555555", "5555555555", "5555555555", "5555555555"]);
  await expect(page.locator(".tb-fixed-ring")).toBeVisible();
  await expect(rail(page)).not.toContainText(/score|%|seconds/i);
  await railFits(page);
  // TUBE-16: everything drawn is script, nothing is live.
  expect(await page.locator("[data-live]").count()).toBe(0);
  const lamps = page.locator(".tb-stage .tl");
  expect(await lamps.count()).toBe(400);
  expect(await page.locator('.tb-stage .tl:not([data-source="script"])').count()).toBe(0);
  await expect(stage(page)).not.toContainText(/Accumulator \d/);
  // TUBE-23: the try counters.
  expect((await metrics(page, "tubes_try_start")).map((m) => m.n)).toEqual([0]);
  expect((await metrics(page, "tubes_try_step")).map((m) => m.n)).toEqual([2, 3, 4, 5]);
  expect((await metrics(page, "tubes_try_done")).map((m) => [m.n, m.assisted])).toEqual([[0, false]]);
});

test("TUBE-13, 14: Try another fault cycles 0, 1, 2, 0; Do it for me and Skip reach the same fixed state", async ({ page }) => {
  await toTubes(page);
  await toTry(page);
  const want = [
    ["5555555555", "5555555555", "5559555555", "5555555555"],
    ["5555555155", "5555555555", "5555555555", "5555555555"],
    ["5555555555", "5555555555", "5555555555", "5855555555"],
    ["5555555555", "5555555555", "5559555555", "5555555555"],
  ];
  for (let v = 0; v < 4; v++) {
    await tapSlow(page, rail(page).locator(".tb-run"));
    expect(await panelDigits(page)).toEqual(want[v]);
    if (v === 1) {
      // Do it for me, three times: panel, place, tube.
      for (const h2 of ["Which digit place?", "Which tube?", "Plug in a fresh unit"]) {
        await tapSlow(page, rail(page).locator(".tb-dfm"));
        await expect(rail(page).locator("h2")).toHaveText(h2);
        await plateOk(page);
        await expect(fb(page)).toContainText("Done for you.");
      }
      await expect(page.locator(".tb-target.tube.cold")).toHaveAttribute("data-i", "5"); // tube 6
      await tapSlow(page, rail(page).locator(".tb-plug"));
    } else {
      // Skip to the answer: straight to the fixed state, no confirm.
      await tapSlow(page, rail(page).locator(".tb-skip"));
    }
    await expect(rail(page).locator(".tb-win")).toBeVisible();
    await plateOk(page);
    expect(await panelDigits(page)).toEqual(["5555555555", "5555555555", "5555555555", "5555555555"]);
    await tapSlow(page, rail(page).locator(".tb-again"));
    await expect(rail(page).locator("h2")).toHaveText("Run the test");
    await plateOk(page);
  }
  expect((await metrics(page, "tubes_try_start")).map((m) => m.n)).toEqual([0, 1, 2, 0, 1]);
  expect((await metrics(page, "tubes_try_skip")).map((m) => m.n)).toEqual([2, 2, 2]);
  expect((await metrics(page, "tubes_try_done")).map((m) => [m.n, m.assisted])).toEqual([[1, true]]);
  // Back to the story: card 4; the exercise is discarded, the fault kept.
  await tapSlow(page, rail(page).locator(".tb-story-back"));
  await expect(rail(page).locator("h2")).toHaveText("The hunt");
  await expect(plate(page)).toHaveCount(0);
  await tapSlow(page, rail(page).locator(".tb-cta"));
  await tapSlow(page, rail(page).locator(".tb-run"));
  expect(await panelDigits(page)).toEqual(want[1]);
});

test("TUBE-21: glossary: three pages, the new words' Show me opens S16 cards 1, 4, 2; Back returns to page 3", async ({ page }) => {
  await toExplore(page);
  await tapSlow(page, page.locator(".ex-gloss-btn"));
  await tapSlow(page, page.locator(".gl-page"));
  await expect(page.locator(".gl-page")).toHaveText("More words ›");
  await expect(page.locator('.gl-tile[data-term="Neon lamp"] span')).toHaveText("A small glowing bulb. Each place in an accumulator has ten lamps, 0 to 9. The lit one shows the digit. The tubes are inside.");
  await tapSlow(page, page.locator(".gl-page"));
  await expect(page.locator(".gl-page")).toHaveText("‹ First words");
  await expect(page.locator(".gl-tile b")).toHaveText(["Vacuum tube", "Plug-in unit", "Kilowatt"]);
  for (const [term, title] of [["Vacuum tube", "The tubes"], ["Plug-in unit", "The hunt"], ["Kilowatt", "Power and heat"]]) {
    await tapSlow(page, page.locator(`.gl-tile[data-term="${term}"] .gl-show`));
    await expect(view(page)).toHaveAttribute("data-view", "tubes");
    await expect(rail(page).locator("h2")).toHaveText(title);
    await expect(page.locator(".tb-back")).toHaveText("‹ Glossary");
    await tapSlow(page, page.locator(".tb-back"));
    await expect(view(page)).toHaveAttribute("data-view", "glossary");
    await expect(page.locator(".gl-tile b").first()).toHaveText("Vacuum tube");
  }
  // Close still returns to the tour.
  await tapSlow(page, page.locator(".gl-close"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  expect((await metrics(page, "tubes_open")).map((m) => m.screen)).toEqual(["glossary", "glossary", "glossary"]);
  // S16's own Glossary button: Close comes back to the same card.
  await tapSlow(page, page.locator(".ex-tubes-btn"));
  await tapSlow(page, rail(page).locator(".tb-next"));
  await tapSlow(page, page.locator(".tb-gloss-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "glossary");
  await tapSlow(page, page.locator(".gl-close"));
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await expect(rail(page).locator("h2")).toHaveText("Power and heat");
  expect(await metrics(page, "tubes_open")).toHaveLength(4); // the round trip is not a new visit
});

test("TUBE-21: app.openTubes (the finale's chip): Finish and X land on the view it passes", async ({ page }) => {
  await toExplore(page);
  await page.evaluate(() => (window as any).__eniac.openTubes({ from: "finale", card: 5, back: { name: "honor", page: 1 } }));
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await expect(rail(page).locator("h2")).toHaveText("A week with ENIAC");
  await expect(page.locator(".tb-back")).toHaveText("‹ Back");
  await tapSlow(page, rail(page).locator(".tb-next"));
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  await page.evaluate(() => (window as any).__eniac.openTubes({ from: "finale", back: { name: "honor", page: 1 } }));
  await tapSlow(page, rail(page).locator(".close"));
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  expect((await metrics(page, "tubes_open")).map((m) => m.screen)).toEqual(["finale", "finale"]);
});

test("TUBE-15, 20: core down: S16 works unchanged with no notice; the exercise is byte-identical; bridge down is S10", async ({ page }) => {
  await toTubes(page);
  await toTry(page);
  await tapSlow(page, rail(page).locator(".tb-run"));
  await tapSlow(page, target(page, 0));
  await page.waitForTimeout(700); // the X badge timer
  const before = await page.locator("#screen").innerHTML();
  await mock(page, "fault", { recoverAfterMs: 60_000 });
  await page.waitForTimeout(1500);
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  expect(await page.locator("#screen").innerHTML()).toBe(before);
  await expect(page.locator(".ex-pill")).toHaveCount(0);
  // Still playable while the core is down.
  await tapSlow(page, target(page, 2));
  await expect(rail(page).locator("h2")).toHaveText("Which digit place?");
  await tapSlow(page, rail(page).locator(".tb-skip"));
  await plateOk(page);
  // Back to the tour: it works too, with its notice.
  await tapSlow(page, page.locator(".tb-back"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".ex-pill")).toBeVisible();
  await tapSlow(page, page.locator(".ex-tubes-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await mock(page, "drop", { ms: 9000 });
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 12_000 });
});

test("TUBE-18: reduced motion: no shake, no slide; the unit change is a 200 ms cross-fade", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toTubes(page);
  await toTry(page);
  await tapSlow(page, rail(page).locator(".tb-run"));
  await tap(page, target(page, 0));
  await expect(target(page, 0)).toHaveClass(/x-on/);
  await expect(target(page, 0)).not.toHaveClass(/shake/);
  await page.waitForTimeout(450);
  await tap(page, target(page, 2));
  await tap(page, target(page, 3));
  const anims = await page.evaluate(() =>
    document.getAnimations().map((a) => ({ d: Number((a.effect as KeyframeEffect).getTiming().duration), kf: JSON.stringify((a.effect as KeyframeEffect).getKeyframes()) })),
  );
  expect(anims.length).toBeGreaterThan(0);
  for (const a of anims) {
    expect(a.d).toBeLessThanOrEqual(250);
    expect(a.kf).not.toMatch(/translate/);
  }
  await expect(rail(page).locator("h2")).toHaveText("Which tube?");
});

test("TUBE-19: idle: 120 s (exploreS), then Still there?, then S1; a touch on S9 does not leak; S16 starts over at fault 0", async ({ page }) => {
  await toTubes(page);
  await toTry(page);
  await tapSlow(page, rail(page).locator(".tb-run"));
  await mock(page, "config", { idle: { setupS: 1, runS: 60, countdownS: 3, exploreS: 3 } });
  await page.waitForTimeout(1600);
  await expect(page.locator(".still")).toHaveCount(0); // not the 1 s of setup screens
  await expect(page.locator(".still")).toBeVisible({ timeout: 4000 });
  // A tap on a (wrong) panel under the scrim only dismisses S9.
  const t0 = (await target(page, 0).boundingBox())!;
  await page.touchscreen.tap(t0.x + 100, t0.y + 300);
  await expect(page.locator(".still")).toHaveCount(0);
  await expect(fb(page)).toHaveText("✓The test is done. One accumulator disagrees. Which one?");
  await expect(view(page)).toHaveAttribute("data-view", "tubes");
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 12_000 });
  expect((await sent(page)).find((m) => m.t === "metric" && m.ev === "idle_reset")).toMatchObject({ screen: "tubes" });
  // A new visitor: card 1, and the first fault again.
  await mock(page, "config", { idle: { setupS: 90, runS: 180, countdownS: 15, exploreS: 120 } });
  await tap(page, page.locator(".screen.start"));
  await page.waitForTimeout(650);
  await tap(page, page.locator(".pk-explore"));
  await tapSlow(page, page.locator(".ex-tubes-btn"));
  await expect(rail(page).locator("h2")).toHaveText("The tubes");
  await toTry(page);
  await tapSlow(page, rail(page).locator(".tb-run"));
  expect(await panelDigits(page)).toEqual(["5555555555", "5555555555", "5559555555", "5555555555"]);
});

// ---------------------------------------------------------------- screenshots (TUBE-24)

test("capture tubes screenshots", async ({ page }) => {
  test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1");
  test.setTimeout(180_000);
  const dir = join(__dirname, "..", "..", "..", "docs", "screenshots", "m3");
  const shot = async (name: string) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(dir, `tubes-${name}.png`) });
  };
  await toExplore(page);
  await page.waitForTimeout(1500);
  await shot("0-entry-from-explore");
  await tapSlow(page, page.locator(".ex-tubes-btn"));
  const names = ["1-the-tubes", "2-power", "3-why", "4-hunt", "5-week"];
  for (let i = 0; i < 5; i++) {
    await shot(names[i]);
    if (i === 1) {
      await tapSlow(page, rail(page).locator(".tb-myth-link"));
      await shot("myth");
      await tapSlow(page, rail(page).locator(".tb-myth-back"));
    }
    if (i < 4) await tapSlow(page, rail(page).locator(".tb-next"));
  }
  for (let i = 0; i < 1; i++) await tapSlow(page, rail(page).locator(".tb-prev"));
  await tapSlow(page, rail(page).locator(".tb-cta"));
  await shot("try-1-run");
  await tapSlow(page, rail(page).locator(".tb-run"));
  await shot("try-2-panels");
  await tapSlow(page, target(page, 0));
  await tapSlow(page, target(page, 1));
  await tap(page, target(page, 3));
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(dir, "tubes-try-2b-wrong-taps.png") });
  await page.waitForTimeout(600);
  await tapSlow(page, target(page, 2));
  await shot("try-3-place");
  await tapSlow(page, target(page, 3));
  await page.waitForTimeout(400);
  await shot("try-4-tubes");
  await tapSlow(page, target(page, 0));
  await tapSlow(page, target(page, 1));
  await shot("try-4b-touching");
  await tapSlow(page, target(page, 2));
  await shot("try-5-cold");
  await tapSlow(page, rail(page).locator(".tb-plug"));
  await shot("try-6-fixed");
  await tapSlow(page, page.locator(".tb-back"));
  await tapSlow(page, page.locator(".ex-gloss-btn"));
  await tapSlow(page, page.locator(".gl-page"));
  await tapSlow(page, page.locator(".gl-page"));
  await shot("glossary-page-3");
});
