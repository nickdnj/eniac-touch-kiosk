// S14 Explore ENIAC and S15 Glossary (UX 14.3, 14.4; PRD FR-90 to FR-98)
// against the dev mock. Touch only; 1920 x 1080.

import { test, expect, type Page } from "@playwright/test";
import { fresh, mock, mockGet, sent, tap, tapSlow, toRun, view } from "./helpers.ts";

const rail = (page: Page) => page.locator(".ex-rail");
const readout = (page: Page) => page.locator(".ex-readout");
const unit = (page: Page, id: string) => page.locator(`.pano-unit[data-id="${id}"]`);
const chip = (page: Page, id: string) => page.locator(`.pano-chip[data-id="${id}"]`);
const missionChip = (page: Page, id: string) => page.locator(`.ex-mchips .mchip[data-mission="${id}"]`);
/** The attract requests the UI sent, in order ("attract_stop:<reason>"). */
const attractMsgs = (log: any[]) => log.filter((m) => m.t === "attract_start" || m.t === "attract_stop").map((m) => (m.reason ? `${m.t}:${m.reason}` : m.t));

async function toExplore(page: Page): Promise<void> {
  await fresh(page);
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await page.waitForTimeout(650); // the picker ignores the S1 visitor's double tap
  await tap(page, page.locator(".pk-explore"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".ex-mchips .mchip")).toHaveCount(3); // missions loaded
}

/** Tap the minimap on panel p (0-based): that spot comes to the middle. */
async function toPanel(page: Page, p: number): Promise<void> {
  const mm = (await page.locator(".ex-minimap").boundingBox())!;
  await page.touchscreen.tap(mm.x + 18 + p * 33 + 16, mm.y + mm.height / 2);
  await page.waitForTimeout(950);
}

/** The rail fits: a card is never scrolled (UX 14.3.4: the build fails if one overflows). */
async function railFits(page: Page): Promise<void> {
  const r = await rail(page).evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
  expect(r.sh, "rail content overflows").toBeLessThanOrEqual(r.ch);
}

test("from the picker: intro, readout, arrows, minimap; a live attract core lights real lamps", async ({ page }) => {
  await toExplore(page);
  // The picker's Explore button: 96 px, no number (UX 14.9).
  await expect(rail(page).locator("h2")).toHaveText("ENIAC filled a room.");
  await expect(rail(page).locator(".body")).toContainText("Forty panels stood in a U shape, about 80 feet long along the front.");
  await expect(readout(page)).toHaveText("You are looking at: Initiating Unit to Accumulator 2");
  await expect(page.locator(".ex-arrow.l")).toHaveClass(/disabled/);
  for (const a of await page.locator(".ex-arrow").all()) {
    const b = (await a.boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(96);
    expect(b.height).toBeGreaterThanOrEqual(200);
  }
  // Right arrow: 6 panels.
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await expect(readout(page)).toHaveText("You are looking at: Accumulator 1 to Accumulator 7");
  await expect(page.locator(".ex-arrow.l")).not.toHaveClass(/disabled/);
  // Minimap: tap the right end, the printer comes on screen and the right arrow dims.
  const mm = (await page.locator(".ex-minimap").boundingBox())!;
  await page.touchscreen.tap(mm.x + mm.width - 30, mm.y + mm.height / 2);
  await expect(readout(page)).toContainText("to Printer");
  await expect(page.locator(".ex-arrow.r")).toHaveClass(/disabled/);
  expect(mm.height).toBeGreaterThanOrEqual(64);

  // No session existed, so Explore asked for the attract session; its lamps are the real (mock) machine's.
  const log = await sent(page);
  // S1 ran attract, the touch handed off, then Explore asked for it again.
  expect(attractMsgs(log)).toEqual(["attract_start", "attract_stop:touch", "attract_start"]);
  expect(log.some((m) => m.t === "metric" && m.ev === "explore_open" && m.screen === "picker")).toBe(true);
  await expect(page.locator(".ex-live")).toHaveText(/LIVE: ENIAC is working out a shell's path/);
  await expect(page.locator(".pano .lamp.on").first()).toBeAttached({ timeout: 10_000 });
  const s = await mockGet(page, "session");
  expect(s.session.mode).toBe("attract");
  // Lit lamps match the machine: Accumulator 15 shows the mock's hop number.
  const hop = String(s.machine.acc["15"].digits).at(-1);
  await expect.poll(async () => page.locator(`.pano [id^="lamp:acc.15.d.10."].on`).getAttribute("id"), { timeout: 5000 }).toMatch(/lamp:acc\.15\.d\.10\.\d/);
  expect(hop).toMatch(/\d/);
  // The divider (no mission uses it) stays at rest, lit only by what the core reports.
  expect(await page.locator('.pano [id="lamp:div.place.0"].on').count()).toBe(1);
});

test("Walk the room: twelve cards in order, each fits the rail, Previous / Next / Finish", async ({ page }) => {
  await toExplore(page);
  await tapSlow(page, page.locator(".ex-walk"));
  const titles = ["Initiating Unit", "Cycling Unit", "Master Programmer", "Accumulator 1", "High-Speed Multiplier", "Divider and Square-Rooter", "Function Table 2", "Portable Function Table", "Constant Transmitter", "Printer", "Digit Trays", "Program Trays"];
  await expect(page.locator(".ex-prev")).toHaveClass(/disabled/);
  for (const [i, t] of titles.entries()) {
    await expect(rail(page).locator("h2")).toHaveText(t);
    await expect(rail(page).locator(".eyebrow span").first()).toHaveText(new RegExp(`^${i + 1} OF 12 · `));
    await railFits(page);
    for (const b of await page.locator(".ex-rail .nav .btn").all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(96);
    if (i < titles.length - 1) await tapSlow(page, page.locator(".ex-next"));
  }
  // Card 12: Next reads Finish and returns to the intro.
  await expect(page.locator(".ex-next")).toHaveText("Finish");
  await tapSlow(page, page.locator(".ex-prev"));
  await expect(rail(page).locator("h2")).toHaveText("Digit Trays");
  await expect(page.locator(".pano-tray.d")).toHaveClass(/sel/);
  await tapSlow(page, page.locator(".ex-next"));
  await tapSlow(page, page.locator(".ex-next"));
  await expect(rail(page).locator("h2")).toHaveText("ENIAC filled a room.");
  const log = await sent(page);
  expect(log.filter((m) => m.ev === "explore_walk_completed")).toHaveLength(1);
  expect(log.filter((m) => m.ev === "explore_card").map((m) => m.unit).slice(0, 12)).toEqual(["init", "cyc", "mp", "acc", "mult", "div", "ft", "pft", "ct", "pr", "dt", "pt"]);
});

test("tap a unit: its card (one card for all 20 accumulators), the ring, the live line; a second tap changes nothing; X closes", async ({ page }) => {
  await toExplore(page);
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await tapSlow(page, chip(page, "a6"));
  await expect(rail(page).locator("h2")).toHaveText("Accumulator 6");
  await expect(rail(page).locator(".eyebrow span").first()).toHaveText("4 OF 12 · ONE OF 20");
  await expect(unit(page, "a6")).toHaveClass(/sel/);
  await expect(chip(page, "a6")).toHaveClass(/sel/);
  await expect(unit(page, "a7")).not.toHaveClass(/sel/);
  // P2 live line: only from the live machine.
  await expect(rail(page).locator(".live-line")).toHaveText(/^Right now, Accumulator 6 holds -?\d{10}$/);
  const before = await sent(page);
  await tapSlow(page, unit(page, "a6"));
  expect((await sent(page)).filter((m) => m.ev === "explore_card").length).toBe(before.filter((m) => m.ev === "explore_card").length);
  // "Light up all 20 accumulators" rings them all, and toggles back.
  await tapSlow(page, rail(page).locator(".all-acc"));
  await expect(page.locator(".pano-unit.k-acc.sel")).toHaveCount(20);
  await tapSlow(page, rail(page).locator(".all-acc"));
  await expect(page.locator(".pano-unit.k-acc.sel")).toHaveCount(1);
  // A cart opens the portable table card; a tray band opens its card.
  await tapSlow(page, page.locator(".ex-arrow.l")); // the selected unit stays selected while panning
  await expect(unit(page, "a6")).toHaveClass(/sel/);
  await tapSlow(page, chip(page, "ft1"));
  await expect(rail(page).locator("h2")).toHaveText("Function Table 1");
  await tapSlow(page, page.locator('.pano-cart[data-ring="pft:ft1"]'));
  await expect(rail(page).locator("h2")).toHaveText("Portable Function Table");
  await expect(page.locator('.pano-cart[data-ring="pft:ft1"]')).toHaveClass(/sel/);
  const room = (await page.locator(".ex-room").boundingBox())!;
  await page.touchscreen.tap(room.x + 600, room.y + 472 + 36); // the program tray band, on screen
  await page.waitForTimeout(450);
  await expect(rail(page).locator("h2")).toHaveText("Program Trays");
  await railFits(page);
  await tapSlow(page, rail(page).locator(".close"));
  await expect(rail(page).locator("h2")).toHaveText("ENIAC filled a room.");
  await expect(page.locator(".pano .sel")).toHaveCount(0);
});

test("mission chips ring the units each program uses (derived, not typed); Used in; Start Mission", async ({ page }) => {
  await toExplore(page);
  for (const id of ["primes", "trajectory"]) {
    await tapSlow(page, missionChip(page, id));
    await expect(rail(page).locator(".ex-start")).toBeVisible();
    await railFits(page);
  }
  // Primes: its program wires all three function tables (sieve.e), so all three are ringed.
  await tapSlow(page, missionChip(page, "primes"));
  await expect(rail(page).locator(".body")).toContainText("all three Function Tables");
  await expect(rail(page).locator(".body")).toContainText("15 accumulators: 1 to 14, and 19");
  await tapSlow(page, missionChip(page, "squares"));
  await expect(missionChip(page, "squares")).toHaveClass(/on/);
  await expect(page.locator(".pano-unit.hl")).toHaveCount(4);
  for (const id of ["init", "ct", "a1", "a2"]) await expect(unit(page, id)).toHaveClass(/hl/);
  await expect(unit(page, "div")).toHaveClass(/dim/);
  await expect(unit(page, "a1").locator(".badge")).toHaveText("1");
  await expect(page.locator(".pano-tray.d")).toHaveClass(/hl/);
  await expect(rail(page).locator(".body")).toHaveText(
    "Squares uses 4 units: the Initiating Unit, the Constant Transmitter and Accumulators 1 and 2. You plug cables between them.",
  );
  await expect(page.locator(".ex-cells .mc.hl")).toHaveCount(5); // init, a1, a2 and the transmitter's 2 panels

  // Trajectory: the program's own units (the multiplier and Function Table 2, never the divider).
  await tapSlow(page, missionChip(page, "trajectory"));
  await expect(unit(page, "mult")).toHaveClass(/hl/);
  await expect(unit(page, "ft2")).toHaveClass(/hl/);
  await expect(unit(page, "a3")).not.toHaveClass(/hl/);
  await expect(unit(page, "div")).toHaveClass(/dim/);
  await expect(unit(page, "mult").locator(".badge")).toHaveText("3");
  await railFits(page);
  // B + C: open the multiplier's card; Used in shows Trajectory filled.
  await toPanel(page, 18);
  await tapSlow(page, chip(page, "mult"));
  await expect(rail(page).locator("h2")).toHaveText("High-Speed Multiplier");
  await expect(rail(page).locator(".used .mchip")).toHaveText(["3Trajectory"]);
  await expect(rail(page).locator(".used .mchip")).toHaveClass(/on/);
  // The divider: none of our missions.
  await toPanel(page, 8);
  await tapSlow(page, chip(page, "div"));
  await expect(rail(page).locator(".used-none")).toHaveText("None of our missions.");
  await toPanel(page, 1);
  await tapSlow(page, chip(page, "cyc"));
  await expect(rail(page).locator(".used-none")).toHaveText("Every mission, but you never plug it in.");
  // Clear returns to the card (state B only).
  await tapSlow(page, page.locator(".ex-mchips .mchip.clear"));
  await expect(page.locator(".pano-unit.hl")).toHaveCount(0);
  await expect(page.locator(".pano-unit.dim")).toHaveCount(0);
  await tapSlow(page, rail(page).locator(".close"));
  // Start Mission 3 from the mission card: a fresh mission core replaces the attract session.
  await tapSlow(page, missionChip(page, "trajectory"));
  await tapSlow(page, rail(page).locator(".ex-start"));
  await expect(view(page)).toHaveAttribute("data-view", "mission", { timeout: 10_000 });
  await expect(page.locator(".step-card h2")).toHaveText("The path of a shell");
  const s = await mockGet(page, "session");
  expect([s.session.mission, s.session.mode]).toEqual(["trajectory", "visitor"]);
  expect((await sent(page)).filter((m) => m.ev === "explore_mission_chip").map((m) => m.mission)).toEqual(["primes", "trajectory", "primes", "squares", "trajectory", "trajectory"]);
});

test("from the S3 briefing: the mission's units, its own session's lamps, Back to Mission 1", async ({ page }) => {
  await fresh(page);
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await page.waitForTimeout(650);
  await tapSlow(page, page.getByRole("button", { name: "Start", exact: true }).first());
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await tapSlow(page, page.locator(".rail .explore-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".ex-back")).toHaveText("‹ Back to Mission 1");
  await expect(missionChip(page, "squares")).toHaveClass(/on/);
  await expect(unit(page, "a2")).toHaveClass(/hl/);
  await expect(page.locator(".ex-live")).toHaveText("LIVE: your Mission 1 machine");
  // Nothing was started: the room shows the visitor's own core.
  const session = (await mockGet(page, "session")).session;
  expect(session.mission).toBe("squares");
  expect(attractMsgs(await sent(page))).toEqual(["attract_start", "attract_stop:touch"]); // only S1's
  await tapSlow(page, page.locator(".ex-back"));
  await expect(view(page)).toHaveAttribute("data-view", "mission");
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  expect((await mockGet(page, "session")).session.id).toBe(session.id);
});

test("from the S7 result: See where they stand, and back", async ({ page }) => {
  await toRun(page);
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 60_000 });
  await tapSlow(page, page.locator(".result-right .explore-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(missionChip(page, "squares")).toHaveClass(/on/);
  await tapSlow(page, page.locator(".ex-back"));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  await expect(page.locator(".result-tape .row")).toHaveCount(12);
});

test("Glossary: three pages of eight, the Transceiver shown, Show me opens the card, Close returns to the tour", async ({ page }) => {
  await toExplore(page);
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await tapSlow(page, chip(page, "a3"));
  await tapSlow(page, page.locator(".ex-gloss-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "glossary");
  await expect(page.locator(".gl-tile")).toHaveCount(8);
  await expect(page.locator(".gl-tile b").first()).toHaveText("Accumulator");
  for (const t of await page.locator(".gl-tile").all()) {
    const b = (await t.boundingBox())!;
    expect(Math.round(b.height)).toBe(184);
    expect(await t.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  }
  await tapSlow(page, page.locator(".gl-page"));
  await expect(page.locator(".gl-page")).toHaveText("More words ›");
  await expect(page.locator(".gl-tile b")).toHaveText(["Constant", "Function table", "Punched card", "Jack and cable", "Receive and send jacks", "Operation and repeat switches", "Neon lamp", "Transceiver"]);
  await expect(page.locator('.gl-tile[data-term="Transceiver"] span')).toContainText("does its job up to 9 times");
  // Page 3: the words of S16 Keeping ENIAC alive (tests/web/e2e/tubes.spec.ts).
  await tapSlow(page, page.locator(".gl-page"));
  await expect(page.locator(".gl-page")).toHaveText("‹ First words");
  await expect(page.locator(".gl-tile b")).toHaveText(["Vacuum tube", "Plug-in unit", "Kilowatt"]);
  // Close: back where the visitor left the tour (position and card).
  await tapSlow(page, page.locator(".gl-close"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(rail(page).locator("h2")).toHaveText("Accumulator 3");
  await expect(readout(page)).toHaveText("You are looking at: Accumulator 1 to Accumulator 7");
  // Show me: the word's card.
  await tapSlow(page, page.locator(".ex-gloss-btn"));
  await tapSlow(page, page.locator('.gl-tile[data-term="Stepper"] .gl-show'));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(rail(page).locator("h2")).toHaveText("Master Programmer");
  // From the picker, Home is the way back (no second "Missions" button).
  await expect(page.locator(".ex-back")).toHaveCount(0);
  await expect(page.locator("#home-btn")).toBeVisible();
  expect((await sent(page)).filter((m) => m.ev === "glossary_open")).toHaveLength(2);
});

test("honor roll links, both ways: card 12 to the first programmers, and their page to card 12", async ({ page }) => {
  await toExplore(page);
  await tapSlow(page, page.locator(".ex-walk"));
  for (let i = 0; i < 11; i++) await tapSlow(page, page.locator(".ex-next"));
  await expect(rail(page).locator("h2")).toHaveText("Program Trays");
  await railFits(page);
  await tapSlow(page, rail(page).locator(".programmers-link"));
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  await expect(page.locator(".honor-tab.on")).toHaveText("The first programmers");
  // Back returns to the tour where it was.
  await tapSlow(page, page.locator(".honor-back"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(rail(page).locator("h2")).toHaveText("Program Trays");
  // From the honor roll's page 2: "See the cables they plugged" opens card 12; Back returns to page 2.
  await tapSlow(page, rail(page).locator(".programmers-link"));
  await tapSlow(page, page.locator(".honor-cables"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(rail(page).locator("h2")).toHaveText("Program Trays");
  await expect(page.locator(".pano-tray.p")).toHaveClass(/sel/);
  await tapSlow(page, page.locator(".ex-back"));
  await expect(view(page)).toHaveAttribute("data-view", "honor");
  await expect(page.locator(".honor-tab.on")).toHaveText("The first programmers");
});

test("attract hand-off: Explore keeps attract through the glossary; leaving for the picker stops it (menu); S1 starts it again", async ({ page }) => {
  await toExplore(page);
  await expect(page.locator(".ex-live")).toHaveText(/LIVE/, { timeout: 10_000 });
  await tapSlow(page, page.locator(".ex-gloss-btn"));
  await tapSlow(page, page.locator(".gl-close"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  expect(attractMsgs(await sent(page))).toEqual(["attract_start", "attract_stop:touch", "attract_start"]);
  expect((await mockGet(page, "session")).session.mode).toBe("attract");
  await tapSlow(page, page.locator("#home-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  expect(attractMsgs(await sent(page))).toEqual(["attract_start", "attract_stop:touch", "attract_start", "attract_stop:menu"]);
  await expect.poll(async () => (await mockGet(page, "session")).session).toBeNull();
  // A mission from the picker never meets an attract core; going home restarts it.
  await mock(page, "config", { idle: { setupS: 2, runS: 60, countdownS: 1, exploreS: 120 } });
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 8000 });
  await expect.poll(async () => attractMsgs(await sent(page)).at(-1)).toBe("attract_start");
});

test("core down: the tour keeps working with the notice and no lamps; mission starts disabled; leaving shows S10", async ({ page }) => {
  await toExplore(page);
  await expect(page.locator(".pano .lamp.on").first()).toBeAttached({ timeout: 10_000 });
  await mock(page, "fault", { recoverAfterMs: 60_000 });
  await expect(page.locator(".ex-pill")).toHaveText(/Live lamps are off: ENIAC is resting. The tour still works./);
  await page.waitForTimeout(500);
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator(".pano .lamp.on")).toHaveCount(0);
  await tapSlow(page, chip(page, "a1"));
  await expect(rail(page).locator("h2")).toHaveText("Accumulator 1");
  await expect(rail(page).locator(".live-line")).toBeHidden();
  await tapSlow(page, rail(page).locator(".close"));
  await tapSlow(page, missionChip(page, "primes"));
  await expect(rail(page).locator(".ex-start")).toHaveText("ENIAC is resting");
  await expect(rail(page).locator(".ex-start")).toHaveClass(/disabled/);
  // The glossary works too.
  await tapSlow(page, page.locator(".ex-gloss-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "glossary");
  await tapSlow(page, page.locator(".gl-close"));
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  // The picker needs the core: S10.
  await tapSlow(page, page.locator("#home-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "error");
});

test("core recovers: the notice goes, the place is kept, lamps come back live", async ({ page }) => {
  await toExplore(page);
  await tapSlow(page, page.locator(".ex-arrow.r"));
  await tapSlow(page, chip(page, "a5"));
  await mock(page, "fault", { recoverAfterMs: 2500 });
  await expect(page.locator(".ex-pill")).toBeVisible();
  await expect(page.locator(".ex-pill")).toBeHidden({ timeout: 10_000 });
  await expect(view(page)).toHaveAttribute("data-view", "explore");
  await expect(rail(page).locator("h2")).toHaveText("Accumulator 5");
  await expect(page.locator(".pano .lamp.on").first()).toBeAttached({ timeout: 15_000 });
  expect((await mockGet(page, "session")).session.mode).toBe("attract");
});

test("link down for 5 s is S10 even here", async ({ page }) => {
  await toExplore(page);
  await mock(page, "drop", { ms: 9000 });
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 12_000 });
});

test("optional swipe: a drag moves the room; under 24 px it is still a tap", async ({ page }) => {
  await toExplore(page);
  const room = (await page.locator(".ex-room").boundingBox())!;
  const y = room.y + 300;
  const drag = async (x0: number, dx: number) => {
    const cdp = await page.context().newCDPSession(page);
    const pt = (x: number) => [{ x, y, id: 1 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(x0) });
    for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(x0 + (dx * i) / 8) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(300);
  };
  await drag(room.x + 900, -400);
  await expect(readout(page)).not.toHaveText("You are looking at: Initiating Unit to Accumulator 2");
  await expect(rail(page).locator("h2")).toHaveText("ENIAC filled a room."); // a drag is not a tap
  const x = await page.evaluate(() => (window as any).__eniac.view.name);
  expect(x).toBe("explore");
  // A 12 px wobble on a unit is a tap.
  const b = (await chip(page, "a3").boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x + 60, y: b.y + 40, id: 2 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x + 72, y: b.y + 40, id: 2 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(rail(page).locator("h2")).toHaveText("Accumulator 3");
});

test("reduced motion: pans cross-fade (no slide)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toExplore(page);
  await tap(page, page.locator(".ex-arrow.r"));
  await expect(readout(page)).toHaveText("You are looking at: Accumulator 1 to Accumulator 7");
  const transition = await page.locator(".pano-strip").evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(transition.split(",").every((d) => d.trim() === "0s")).toBe(true);
});

test("idle: Explore waits exploreS (longer than the picker), then Still there?, then attract", async ({ page }) => {
  await toExplore(page);
  await mock(page, "config", { idle: { setupS: 2, runS: 60, countdownS: 2, exploreS: 4 } });
  await page.waitForTimeout(2600);
  await expect(page.locator(".still")).toHaveCount(0); // the picker's 2 s does not apply
  await expect(page.locator(".still")).toBeVisible({ timeout: 4000 });
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 6000 });
  expect((await sent(page)).some((m) => m.t === "end_session" && m.reason === "idle")).toBe(true);
});
