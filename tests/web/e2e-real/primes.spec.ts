// M2 Primes against the REAL bridge and the real simulator core (sieve.e at
// the pinned commit plus patches/0002, which the mission requires). Test
// plan G-M2-2 / G-M2-3: every step's exact .e line, wrong taps never reach
// the core, Skip setup, and the run to the answer (card 100, prime 547)
// with every card checked against the true primes.

import { test, expect } from "@playwright/test";
import { PRIMES_STEPS, cardValues, doStepByTouch, feedback, hit, mainBtn, oddPrimes, tap, tapSlow, view } from "../e2e/helpers.ts";
import { logMark, machine, recordSent, sent, startMission, stdinSince, visitorLines } from "./real.ts";

const BRIEFING = "What is a prime?";

test.beforeEach(async ({ page }) => {
  await recordSent(page);
});

async function toStep1(page: import("@playwright/test").Page): Promise<void> {
  await startMission(page, "primes", BRIEFING);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Count up by 2");
}

test("happy path by touch: 5 exact .e lines, S5 264/285, INIT punches 3, 5, 7 on real cards (Slow)", async ({ page }) => {
  test.setTimeout(150_000);
  await toStep1(page);
  const mark = logMark();
  for (const [i, st] of PRIMES_STEPS.entries()) {
    await doStepByTouch(page, st);
    await expect(mainBtn(page)).toHaveText(i === 4 ? "Finish wiring" : "Next step");
    await tapSlow(page, mainBtn(page));
  }
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await expect(page.locator(".counters .count").nth(0)).toHaveText("264");
  await expect(page.locator(".counters .count").nth(1)).toHaveText("285");
  expect(visitorLines(stdinSince(mark))).toEqual(PRIMES_STEPS.map((s) => s.line));
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".run-caption")).toHaveText("ENIAC gives each checker its group size.");
  // Slow: the watchers load first (about 5 s), then 3, 5, 7 about 2 s apart.
  await expect(page.locator(".card-label")).toHaveText("Prime number 1: 3", { timeout: 20_000 });
  await expect(page.locator(".run-caption")).toHaveText("3 won't split into equal groups. Nothing fits, so ENIAC punched a card.");
  await expect(page.locator(".card-big .hole")).toHaveCount(10); // 0000000003: ten digits, ten holes
  await expect(page.locator(".card-label")).toHaveText("Prime number 3: 7", { timeout: 15_000 });
  // 9 is tested next: Acc 1's program 12 lamp (the groups-of-3 checker) lights.
  await expect(page.locator(".run-caption")).toHaveText("9 splits into 3 groups of 3, so no card.", { timeout: 10_000 });
  expect(await cardValues(page, [12, 13])).toEqual(oddPrimes((await cardValues(page, [12, 13])).length));
  const cmds = stdinSince(mark);
  expect(cmds.filter((l) => l === "b i")).toHaveLength(1);
  expect(cmds).not.toContain("b c");
});

test("wrong taps never reach the core; Do it for me sends the right line", async ({ page }) => {
  await toStep1(page);
  await doStepByTouch(page, PRIMES_STEPS[0]);
  await tapSlow(page, mainBtn(page));
  await doStepByTouch(page, PRIMES_STEPS[1]);
  await tapSlow(page, mainBtn(page));
  const mark = logMark();
  await tapSlow(page, hit(page, "trunk:1-7"));
  await tapSlow(page, hit(page, "jack:p.Ai"));
  await expect(feedback(page)).toHaveText(/That jack is for a different job\. Look for A, DI\./);
  await tapSlow(page, hit(page, "jack:p.A1o"));
  await tapSlow(page, hit(page, "jack:p.Acdi"));
  await expect(feedback(page)).toHaveText(/Want us to do this one\?/);
  expect(visitorLines(stdinSince(mark))).toEqual([]);
  await tapSlow(page, mainBtn(page)); // Do it for me
  await expect(feedback(page)).toHaveText(/Done for you/);
  expect(visitorLines(stdinSince(mark))).toEqual(["p 1-7 p.Adi"]);
  expect((await sent(page)).filter((m) => m.t === "apply_step").at(-1)).toMatchObject({ step: "trunk17-to-mp", assisted: true });
});

test("Skip setup, INIT, Skip to the answer: S7 at card 100 (547), every card a true prime, INIT once", async ({ page }) => {
  test.setTimeout(240_000);
  await toStep1(page);
  const mark = logMark();
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  expect(visitorLines(stdinSince(mark)).sort()).toEqual(PRIMES_STEPS.map((s) => s.line).sort());
  await tapSlow(page, mainBtn(page));
  await tap(page, page.locator(".init-btn"));
  // The extras arrive with the 5th card (prime 13).
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 40_000 });
  await expect(page.locator(".run-prompt")).toHaveText("Primes pile up");
  await expect(page.locator(".init-btn")).toHaveClass(/disabled/);
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  await expect(page.locator(".waiting-text")).toHaveText(/ENIAC is counting primes: \d+ of the first 100/);
  // Full is punch-bound: about 0.6 s a card, so about a minute to card 100.
  await expect(page.locator(".result-answer h2")).toBeVisible({ timeout: 150_000 });
  await expect(page.locator(".result-answer h2")).toHaveText("ENIAC found the primes!");
  await expect(page.locator(".live-line")).toHaveText(/ENIAC is still working: \d+ primes so far\./);
  const got = await cardValues(page, [12, 13]);
  expect(got.length).toBeGreaterThanOrEqual(100);
  expect(got).toEqual(oddPrimes(got.length));
  expect(got[99]).toBe(547);
  const cmds = stdinSince(mark);
  expect(cmds.indexOf("s cy.rate 0")).toBeGreaterThan(cmds.indexOf("b i"));
  expect(cmds.filter((l) => l === "b i")).toHaveLength(1);
  // The live line keeps counting on the result screen: real cards keep coming.
  const n0 = got.length;
  await expect.poll(async () => (await cardValues(page, [12, 13])).length, { timeout: 10_000 }).toBeGreaterThan(n0);
  const m = await machine(page);
  expect(m.acc["19"].value % 2).toBe(1); // still testing odd numbers
});
