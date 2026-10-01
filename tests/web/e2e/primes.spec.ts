// M2 Primes against the dev mock (UX 8.2, test plan G-M2-2, G-M2-3). The
// mock's sieve is an outline (odd numbers, checkers, a card per prime); the
// real machine is checked in e2e-real/primes.spec.ts.

import { test, expect } from "@playwright/test";
import { PRIMES_STEPS, cardValues, devMissionId, doStepByTouch, feedback, fresh, hit, mainBtn, mock, mockGet, oddPrimes, sent, tap, tapSlow, view } from "./helpers.ts";

const BRIEFING = "What is a prime?";

async function toPrimesStep1(page: import("@playwright/test").Page): Promise<void> {
  await devMissionId(page, "primes", BRIEFING);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Count up by 2");
}

async function toPrimesRun(page: import("@playwright/test").Page): Promise<void> {
  await toPrimesStep1(page);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
}

test("briefing and plan: sharing evenly, with Again, second cues and the math line", async ({ page }) => {
  await devMissionId(page, "primes", BRIEFING);
  const fig = page.locator('[data-figure="primes-briefing"]');
  await expect(fig).toBeVisible();
  // 12 tiles shared into 3 equal groups: a check badge with the word "fits".
  await expect(fig.locator('.share-badge[data-badge="fits"]')).toHaveText(/fits/, { timeout: 4000 });
  await expect(fig.locator(".share-caption")).toHaveText("3 equal groups of 4. It shares evenly!");
  // 7: a leftover tile, highlighted, with an X badge and words; then prime.
  await expect(fig.locator('.share-badge[data-badge="x"]')).toHaveText(/1 left over/, { timeout: 6000 });
  await expect(fig.locator(".share-tile.left")).toHaveCount(1);
  await expect(fig.locator('.share-badge[data-badge="prime"]')).toBeVisible({ timeout: 5000 });
  await expect(fig.locator(".share-caption")).toHaveText("7 won't split evenly. Prime!");
  const again = fig.locator(".tiles-again");
  const b = (await again.boundingBox())!;
  expect(b.height).toBeGreaterThanOrEqual(64);
  await tapSlow(page, mainBtn(page));
  const plan = page.locator('[data-figure="primes-plan"]');
  await expect(plan.locator(".checker")).toHaveCount(3);
  await expect(plan.locator(".checker-title")).toHaveText(["groups of 3", "groups of 5", "groups of 7"]);
  await expect(plan.locator(".checker-more")).toHaveText("+ 11 more group sizes");
  // 9: groups of 3 fits (pink chip with a bell and words), the others leave tiles over.
  await expect(plan.locator('.checker[data-k="3"] .fits-chip')).toHaveText("fits!", { timeout: 3000 });
  await expect(plan.locator('.checker[data-k="5"] .share-badge')).toHaveText(/4 left over/);
  await expect(plan.locator(".cand-fate")).toHaveText(/out: no card/, { timeout: 3000 });
  await expect(plan.locator(".cand-fate")).toHaveText(/prime: punch a card/, { timeout: 5000 });
  await expect(plan.locator(".fig-card")).toHaveText(["11"]);
  await expect(plan.locator(".share-math")).toHaveClass(/on/, { timeout: 8000 });
  await expect(plan.locator(".share-math")).toHaveText("9 = 3 groups of 3 -> out   11: no equal groups -> prime");
  // Again restarts the loop from the beginning.
  const pass = await plan.getAttribute("data-pass");
  await tap(page, plan.locator(".tiles-again"));
  await expect(plan).not.toHaveAttribute("data-pass", pass ?? "");
  await expect(plan.locator(".share-math")).not.toHaveClass(/on/);
});

test("reduced motion: the finished pictures, no Again", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await devMissionId(page, "primes", BRIEFING);
  const fig = page.locator('[data-figure="primes-briefing"]');
  await expect(fig).toHaveClass(/still/);
  await expect(fig.locator(".share-still")).toHaveCount(2);
  await expect(fig.locator(".tiles-again")).toHaveCount(0);
  await tapSlow(page, mainBtn(page));
  const plan = page.locator('[data-figure="primes-plan"]');
  await expect(plan).toHaveClass(/still/);
  await expect(plan.locator(".share-math")).toHaveClass(/on/);
  await expect(plan.locator(".tiles-again")).toHaveCount(0);
});

test("all 5 steps by touch send exactly the 5 .e lines; S5 counts 264 cables, 285 switches", async ({ page }) => {
  await toPrimesStep1(page);
  for (const [i, st] of PRIMES_STEPS.entries()) {
    await doStepByTouch(page, st);
    await expect(mainBtn(page)).toHaveText(i === 4 ? "Finish wiring" : "Next step");
    await tapSlow(page, mainBtn(page));
  }
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await expect(page.locator(".counters .count").nth(0)).toHaveText("264");
  await expect(page.locator(".counters .count").nth(1)).toHaveText("285");
  const { stdin } = await mockGet(page, "session");
  expect(stdin).toEqual(PRIMES_STEPS.map((s) => s.line));
});

test("wrong taps get the step's hints and never reach the core; Do it for me works", async ({ page }) => {
  await toPrimesStep1(page);
  await doStepByTouch(page, PRIMES_STEPS[0]);
  await tapSlow(page, mainBtn(page));
  await doStepByTouch(page, PRIMES_STEPS[1]);
  await tapSlow(page, mainBtn(page));
  // Step 3: trunk 1-7, then the Master Programmer's A-DI. The ladder:
  // the step's own hint, then "look for the ring", then the offer.
  await tapSlow(page, hit(page, "trunk:1-7"));
  await tapSlow(page, hit(page, "jack:p.Ai"));
  await expect(feedback(page)).toHaveText(/That jack is for a different job\. Look for A, DI\./);
  await tapSlow(page, hit(page, "jack:p.A1o"));
  await expect(feedback(page)).toHaveText(/Look for the glowing ring/);
  await tapSlow(page, hit(page, "jack:p.Acdi"));
  await expect(feedback(page)).toHaveText(/Want us to do this one\?/);
  const before = (await mockGet(page, "session")).stdin;
  expect(before).toEqual(PRIMES_STEPS.slice(0, 2).map((s) => s.line));
  await tapSlow(page, mainBtn(page)); // Do it for me
  await expect(feedback(page)).toHaveText(/Done for you/);
  expect((await mockGet(page, "session")).stdin).toEqual(PRIMES_STEPS.slice(0, 3).map((s) => s.line));
  await tapSlow(page, mainBtn(page));
  // Step 4: the PI jack starts the punch.
  await tapSlow(page, hit(page, "trunk:1-8"));
  await expect(feedback(page)).toHaveText(/Try program trunk 1-9\./);
  await tapSlow(page, mainBtn(page)); // Do it for me
  await expect(feedback(page)).toHaveText(/Done for you/);
  await tapSlow(page, mainBtn(page));
  // Step 5: first a wrong destination, then the PI jack instead of PO.
  await tapSlow(page, hit(page, "jack:i.io"));
  await expect(feedback(page)).toHaveText(/Not quite\./);
  await expect(page.locator(".rail .skip-btn")).toBeVisible();
  await mock(page, "reset");
  await toPrimesStep1(page);
  for (let i = 0; i < 4; i++) {
    await doStepByTouch(page, PRIMES_STEPS[i]);
    await tapSlow(page, mainBtn(page));
  }
  // Step 5: tapping PI instead of PO gets its own hint (byTarget).
  await tapSlow(page, hit(page, "jack:i.pi"));
  await expect(feedback(page)).toHaveText(/That is the punch start\. We want the one that says done: PO\./);
});

test("run: INIT once; cards pile up newest first with real values; checkers call fits; extras at card 5", async ({ page }) => {
  await toPrimesRun(page);
  await expect(page.locator(".run-prompt")).toHaveText("Press INIT");
  await expect(page.locator(".card-empty")).toHaveText("No cards yet.");
  await expect(page.locator(".speed-row")).toHaveClass(/hidden/);
  await expect(page.locator(".skip-answer-btn")).toHaveClass(/hidden/);
  await expect(page.locator(".show-me")).toHaveClass(/hidden/);
  await mock(page, "sieve", { slow: 800 });
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".run-caption")).toHaveText("ENIAC gives each checker its group size.");
  await expect(page.locator(".card-label")).toHaveText("Prime number 1: 3", { timeout: 5000 });
  await expect(page.locator(".run-caption")).toHaveText("3 won't split into equal groups. Nothing fits, so ENIAC punched a card.");
  // 9: the groups-of-3 checker (Acc 1) calls out.
  await expect(page.locator('.gcheck[data-acc="1"]')).toHaveClass(/fits/, { timeout: 5000 });
  await expect(page.locator('.gcheck[data-acc="1"] .gcheck-call')).toHaveText("fits!");
  await expect(page.locator(".run-caption")).toHaveText("9 splits into 3 groups of 3, so no card.");
  await expect(page.locator(".card-count")).toHaveText(/Cards: 5\s+Latest: 13/, { timeout: 8000 });
  await expect(page.locator(".run-prompt")).toHaveText("Primes pile up");
  await expect(page.locator(".run-caption")).toHaveText("Only primes get a card. Watch them pile up.");
  await expect(page.locator(".run-hint")).toBeVisible();
  await expect(page.locator(".speed-row")).not.toHaveClass(/hidden/);
  await expect(page.locator(".show-me")).toBeVisible();
  const rows = await page.locator(".card-row").allTextContents();
  const vals = rows.map((r) => Number(r.replace("...", "")));
  expect(vals).toEqual([...vals].sort((a, b) => b - a)); // newest on top
  // INIT is spent; the bridge would refuse a second one anyway.
  await expect(page.locator(".init-btn")).toHaveClass(/disabled/);
  await tap(page, page.locator(".init-btn"));
  expect((await sent(page)).filter((m) => m.t === "button")).toHaveLength(1);
  const got = await cardValues(page, [12, 13]);
  expect(got).toEqual(oddPrimes(got.length));
});

test("Skip to the answer: Full, S7 waits with a real count, then the headline and a live line", async ({ page }) => {
  await toPrimesRun(page);
  await mock(page, "sieve", { slow: 40, full: 10 });
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 10_000 });
  await mock(page, "sieve", { slow: 40, full: 60 });
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  expect((await sent(page)).filter((m) => m.t === "set_speed").map((m) => m.speed)).toEqual(["full"]);
  await expect(page.locator(".waiting-text")).toHaveText(/ENIAC is counting primes: \d+ of the first 100/);
  await expect(page.locator(".result-answer")).toHaveClass(/hidden/);
  await mock(page, "sieve", { full: 5 });
  await expect(page.locator(".result-answer h2")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".result-answer h2")).toHaveText("ENIAC found the primes!");
  await expect(page.locator(".live-line")).toHaveText(/ENIAC is still working: \d+ primes so far\./);
  await expect(page.locator(".takeaway strong")).toHaveText("Same machine. Different cables. A different job.");
  await expect(page.locator(".live-line")).toHaveText("ENIAC has found them all: 407 primes, from 3 to 2,801.", { timeout: 30_000 });
  const got = await cardValues(page, [12, 13]);
  expect(got).toHaveLength(407);
  expect(got).toEqual(oddPrimes(407));
  expect(got.at(-1)).toBe(2801);
});

test("picker: Done badge and UP NEXT move after a result; the idle reset clears them", async ({ page }) => {
  await toPrimesRun(page);
  await mock(page, "sieve", { slow: 5, full: 5 });
  await tap(page, page.locator(".init-btn"));
  await tapSlow(page, page.locator(".show-me"));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  await tapSlow(page, page.locator(".result-actions .menu-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await expect(page.locator('.mission-card[data-mission="primes"] .mc-done')).toHaveText(/Done/);
  await expect(page.locator('.mission-card[data-mission="squares"] .mc-here')).toHaveText(/Up next/i);
  await expect(page.locator('.mission-card[data-mission="primes"] .mc-here')).toHaveCount(0);
  await mock(page, "config", { idle: { setupS: 2, runS: 2, countdownS: 2 } });
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 15_000 });
  await mock(page, "config", { idle: { setupS: 90, runS: 180, countdownS: 15 } });
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mc-done")).toHaveCount(0);
  await expect(page.locator('.mission-card[data-mission="squares"] .mc-here')).toHaveText(/Start here/i);
  void fresh;
});
