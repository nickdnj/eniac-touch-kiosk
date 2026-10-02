// M2 Trajectory against the dev mock (UX 8.3 v0.4, PRD FR-19 v0.3, test plan
// G-M2-2). The mock replays one real recorded flight
// (mock/missions/trajectory-flight.json); the real machine is checked in
// e2e-real/trajectory.spec.ts.

import { test, expect, type Page } from "@playwright/test";
import { TRAJ_STEPS, cardValues, devMissionId, doStepByTouch, feedback, hit, mainBtn, mock, mockGet, sent, tap, tapSlow, view } from "./helpers.ts";

const BRIEFING = "The path of a shell";


async function toStep1(page: Page): Promise<void> {
  await devMissionId(page, "trajectory", BRIEFING);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Hop by hop");
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Tell ENIAC the card was read");
}

async function toRun(page: Page): Promise<void> {
  await toStep1(page);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
}

test("briefing and plan: the dots appear and join; one hop in four beats with words and glyphs; Again", async ({ page }) => {
  await devMissionId(page, "trajectory", BRIEFING);
  const fig = page.locator('[data-figure="traj-briefing"]');
  await expect(fig.locator(".dot.on")).toHaveCount(8, { timeout: 5000 });
  await expect(fig.locator(".traj-caption")).toHaveText("Each dot is a card. Join the dots: that is the path.");
  await expect(fig.locator(".arc-trace")).toHaveClass(/on/);
  expect((await fig.locator(".tiles-again").boundingBox())!.height).toBeGreaterThanOrEqual(64);
  await tapSlow(page, mainBtn(page));
  const plan = page.locator('[data-figure="traj-plan"]');
  await expect(plan.locator(".hop-label.air")).toHaveText(/air slows it/, { timeout: 3000 });
  await expect(plan.locator(".hop-label.gravity")).toHaveText(/gravity pulls/, { timeout: 3000 });
  await expect(plan.locator(".hop-label.hop")).toHaveText(/a card is punched/, { timeout: 3000 });
  await expect(plan.locator(".hop-card")).toHaveText("card 1");
  await expect(plan.locator(".hop-label.check")).toHaveText(/still flying/, { timeout: 3000 });
  await expect(plan.locator(".traj-math")).toHaveClass(/on/, { timeout: 8000 });
  await expect(plan.locator(".traj-math")).toHaveText("card 1, card 2, card 3 ... one dot each");
});

test("reduced motion: finished pictures, no Again", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await devMissionId(page, "trajectory", BRIEFING);
  await expect(page.locator('[data-figure="traj-briefing"] .dot.on')).toHaveCount(8);
  await expect(page.locator('[data-figure="traj-briefing"] .tiles-again')).toHaveCount(0);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator('[data-figure="traj-plan"]')).toHaveClass(/still/);
  await expect(page.locator('[data-figure="traj-plan"] .traj-math')).toHaveClass(/on/);
});

test("all 5 steps by touch: the exact lines; the printer switch picker says Punch / Leave blank; S5 293 / 1,147", async ({ page }) => {
  await toStep1(page);
  for (const [i, st] of TRAJ_STEPS.entries()) {
    if (st.kind === "switch") {
      await tapSlow(page, hit(page, st.ids[0]));
      await expect(page.locator('.picker .pick[data-value="P"] .pick-l')).toHaveText("Punch");
      await expect(page.locator('.picker .pick[data-value="0"] .pick-l')).toHaveText("Leave blank");
      await tapSlow(page, page.locator('.picker .pick[data-value="0"]'));
      await expect(feedback(page)).toHaveText(/Blank leaves the number off\. Choose P\./);
      await tapSlow(page, page.locator('.picker .pick[data-value="P"]'));
      await expect(feedback(page)).toHaveClass(/ok/);
    } else await doStepByTouch(page, st);
    await expect(mainBtn(page)).toHaveText(i === 4 ? "Finish wiring" : "Next step");
    await tapSlow(page, mainBtn(page));
  }
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await expect(page.locator(".counters .count").nth(0)).toHaveText("293");
  await expect(page.locator(".counters .count").nth(1)).toHaveText("1147");
  const { stdin } = await mockGet(page, "session");
  expect(stdin).toEqual(TRAJ_STEPS.map((s) => s.line));
});

test("wrong tap on step 4: 6-out gets its own hint; Do it for me", async ({ page }) => {
  await toStep1(page);
  for (let i = 0; i < 3; i++) {
    await tapSlow(page, mainBtn(page)); // Do it for me
    await expect(feedback(page)).toHaveText(/Done for you/);
    await tapSlow(page, mainBtn(page));
  }
  await expect(page.locator(".step-card h2")).toHaveText("Is the shell still flying?");
  await tapSlow(page, hit(page, "jack:a19.6o"));
  await expect(feedback(page)).toHaveText(/That jack is for the other answer, landing\. We want 5, out\./);
  expect((await mockGet(page, "session")).stdin).toHaveLength(3);
});

test("run: READ first (b c, b r), INIT locked until the card is read, the arc from the cards, apex, landing, then S7", async ({ page }) => {
  await toRun(page);
  await expect(page.locator(".run-prompt")).toHaveText("Press READ");
  await expect(page.locator(".read-btn")).toBeVisible();
  await expect(page.locator(".init-btn")).toHaveClass(/disabled/);
  await expect(page.locator(".init-btn .sub")).toHaveText("Read the card first");
  await expect(page.locator(".speed-row")).toHaveClass(/hidden/);
  await expect(page.locator(".reader-num").first()).toHaveText("97,367");
  // INIT is refused while locked (the bridge would refuse it too).
  await tap(page, page.locator(".init-btn"));
  expect((await sent(page)).filter((m) => m.t === "button")).toHaveLength(0);
  await tapSlow(page, page.locator(".read-btn"));
  await expect(page.locator(".run-caption")).toHaveText(/97,367|The card goes through the reader|Now press INIT/);
  await expect(page.locator(".run-caption")).toHaveText("The other numbers wait inside ENIAC. Now press INIT.", { timeout: 5000 });
  await expect(page.locator(".init-btn")).not.toHaveClass(/disabled/);
  expect((await mockGet(page, "session")).stdin.slice(-2)).toEqual(["b c", "b r"]);
  await mock(page, "hop", { ms: 700 });
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".read-btn")).toBeHidden();
  await expect(page.locator(".run-prompt")).toHaveText("Watch the dots");
  await expect(page.locator(".card-label")).toHaveText("Hop 1", { timeout: 5000 });
  await expect(page.locator(".run-caption")).toHaveText("Card 1 is out. Its big numbers say how far along and how high up the shell is.");
  await expect(page.locator(".arc-dot")).toHaveCount(1);
  await expect(page.locator(".run-caption")).toHaveText("Highest point! From here the shell comes down.", { timeout: 20_000 });
  await expect(page.locator(".arc-tag.apex")).toHaveText("Highest point");
  // Film strip: tap an older card to see it large for a while.
  await tap(page, page.locator('.film-card[data-n="3"]'));
  await expect(page.locator(".card-big")).toHaveAttribute("data-n", "3");
  await expect(page.locator(".card-big")).toHaveClass(/pinned/);
  await expect(page.locator(".run-prompt")).toHaveText("You did it!", { timeout: 30_000 });
  await expect(page.locator(".run-caption")).toHaveText("Landed! The height dropped below zero.");
  await expect(page.locator(".arc-tag.landed")).toHaveText("Landed");
  await expect(page.locator(".stretch-chip")).toHaveText("Height stretched so you can see it.");
  // The readouts freeze on the landing card's numbers, not the next flight's setup.
  await expect(page.locator('.ro-value[data-acc="15"]')).toHaveText("34");
  await expect(page.locator('.ro-value[data-acc="18"]')).toHaveText("390,417,741");
  await expect(page.locator('.ro-value[data-acc="20"]')).toHaveText("-2,951,425");
  await expect(page.locator('.ro-value[data-acc="6"]')).toHaveText("–");
  await expect(page.locator(".traj-note")).toHaveText("Stopped on the landing card. These are its numbers.");
  expect((await page.evaluate(() => (window as any).__eniac.mirror.machine.acc["15"].value))).toBe(1); // the lamps stay real
  const stdin = (await mockGet(page, "session")).stdin;
  expect(stdin.filter((l: string) => l === "b i")).toHaveLength(1);
  expect(stdin.at(-1)).toBe("s cy.op 1a");
  // The result follows 3 s after the landing.
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 6000 });
  await expect(page.locator(".result-answer h2")).toHaveText("ENIAC flew the shell!");
  await expect(page.locator(".live-line")).toHaveText("34 hops, 34 cards");
  await expect(page.locator(".finish-btn")).toHaveText("Finish");
  const ups = await cardValues(page, [14, 15]);
  expect(ups).toHaveLength(34);
  expect(ups.findIndex((u) => u < 0)).toBe(33);
});

test("Skip to the answer: S7 waits with the live hop count, then the headline at the landing", async ({ page }) => {
  await toRun(page);
  await tapSlow(page, page.locator(".read-btn"));
  await expect(page.locator(".init-btn")).not.toHaveClass(/disabled/, { timeout: 5000 });
  await mock(page, "hop", { ms: 250 });
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 10_000 });
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  expect((await sent(page)).filter((m) => m.t === "set_speed")).toHaveLength(0);
  await expect(page.locator(".waiting-text")).toHaveText(/The shell is still flying: hop \d+/);
  await expect(page.locator(".result-answer")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".live-line")).toHaveText("34 hops, 34 cards");
  await tapSlow(page, page.locator(".finish-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "start");
});
