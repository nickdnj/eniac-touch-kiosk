// M2 Trajectory against the REAL bridge and the real simulator core
// (trajdemo.e + drag.e + demo.card at the pinned commit, patches 0001-0003).
// PRD FR-19 v0.3 / UX 8.3 v0.4: READ sends b c then b r; one INIT; the arc
// comes from the real cards; the flight lands on the first card with "-" in
// column 71; the bridge freezes the machine there (s cy.op 1a) and nothing
// more is punched.

import { test, expect, type Page } from "@playwright/test";
import { TRAJ_STEPS, cardValues, doStepByTouch, feedback, hit, mainBtn, tap, tapSlow, view } from "../e2e/helpers.ts";
import { logMark, machine, recordSent, sent, startMission, stdinSince, visitorLines } from "./real.ts";

const BRIEFING = "The path of a shell";

test.beforeEach(async ({ page }) => {
  await recordSent(page);
});

async function toStep1(page: Page): Promise<void> {
  await startMission(page, "trajectory", BRIEFING);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Hop by hop");
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Tell ENIAC the card was read");
}

/** The .e text as the core gets it: the file's own spelling (i.Ro, i.Pi). */
const FILE_LINES = ["p i.Ro 1-2", "s pr.6 P", "p 2-5 i.Pi", "p a19.5o 1-4", "p 1-4 p.Hi"];

test("happy path by touch: 5 exact .e lines, S5 293/1,147, READ = b c then b r, the card is in (97,367), hop 1 is real", async ({ page }) => {
  test.setTimeout(150_000);
  await toStep1(page);
  const mark = logMark();
  for (const [i, st] of TRAJ_STEPS.entries()) {
    await doStepByTouch(page, st);
    await expect(mainBtn(page)).toHaveText(i === 4 ? "Finish wiring" : "Next step");
    await tapSlow(page, mainBtn(page));
  }
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await expect(page.locator(".counters .count").nth(0)).toHaveText("293");
  await expect(page.locator(".counters .count").nth(1)).toHaveText("1147");
  expect(visitorLines(stdinSince(mark))).toEqual(FILE_LINES);
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  await expect(page.locator(".init-btn")).toHaveClass(/disabled/);
  const runMark = logMark();
  await tapSlow(page, page.locator(".read-btn"));
  await expect(page.locator(".init-btn")).not.toHaveClass(/disabled/, { timeout: 10_000 });
  await expect(page.locator('.ro-value[data-acc="15"]')).toHaveText("0");
  expect((await machine(page)).acc["1"].value).toBe(97367);
  expect(stdinSince(runMark).filter((l) => l.startsWith("b "))).toEqual(["b c", "b r"]);
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".card-label")).toHaveText("Hop 1", { timeout: 15_000 });
  const first = await page.evaluate(() => (window as any).__eniac.cards.cards[0].text);
  expect(first).toBe("                         00001     00000          0014128681          0005693229");
  await expect(page.locator(".arc-dot")).toHaveCount(1);
});

test("wrong tap on step 4 never reaches the core; Do it for me sends the line as written", async ({ page }) => {
  await toStep1(page);
  for (let i = 0; i < 3; i++) {
    await tapSlow(page, mainBtn(page));
    await expect(feedback(page)).toHaveText(/Done for you/);
    await tapSlow(page, mainBtn(page));
  }
  const mark = logMark();
  await tapSlow(page, hit(page, "jack:a19.6o"));
  await expect(feedback(page)).toHaveText(/That jack is for the other answer, landing\. We want 5, out\./);
  expect(visitorLines(stdinSince(mark))).toEqual([]);
  await tapSlow(page, mainBtn(page));
  await expect(feedback(page)).toHaveText(/Done for you/);
  expect(visitorLines(stdinSince(mark))).toEqual(["p a19.5o 1-4"]);
});

test("Skip setup, READ, INIT: 34 real cards, lands on the first negative 'up', frozen with s cy.op 1a, nothing more punched", async ({ page }) => {
  test.setTimeout(240_000);
  await toStep1(page);
  const mark = logMark();
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await tapSlow(page, mainBtn(page));
  await tapSlow(page, page.locator(".read-btn"));
  await expect(page.locator(".init-btn")).not.toHaveClass(/disabled/, { timeout: 10_000 });
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".run-caption")).toHaveText("Highest point! From here the shell comes down.", { timeout: 90_000 });
  await expect(page.locator(".run-prompt")).toHaveText("You did it!", { timeout: 90_000 });
  await expect(page.locator(".run-caption")).toHaveText("Landed! The height dropped below zero.");
  await expect(page.locator('.ro-value[data-acc="15"]')).toHaveText("34");
  await expect(page.locator('.ro-value[data-acc="18"]')).toHaveText("390,417,741");
  await expect(page.locator('.ro-value[data-acc="20"]')).toHaveText("-2,951,425");
  // The landing card as drawn: every column's holes are its Hollerith code
  // (printer.go sm2tenc: '-' is 11 over 0, J..R 11 over 1..9).
  const landing = await page.evaluate(() => (window as any).__eniac.cards.cards[33].text as string);
  expect(landing[70]).toBe("-");
  const drawn = await page.locator(".card-big .hole").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-col")}:${e.getAttribute("data-row")}`).sort());
  const want: string[] = [];
  for (let col = 21; col <= 80; col++) {
    const ch = landing[col - 1];
    if (/[0-9]/.test(ch)) want.push(`${col}:${ch}`);
    else if (ch === "-") want.push(`${col}:11`, `${col}:0`);
    else if (/[J-R]/.test(ch)) want.push(`${col}:11`, `${col}:${ch.charCodeAt(0) - 73}`);
    else expect(ch).toBe(" ");
  }
  expect(drawn).toEqual(want.sort());
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 10_000 });
  await expect(page.locator(".result-answer h2")).toHaveText("ENIAC flew the shell!");
  await expect(page.locator(".live-line")).toHaveText("34 hops, 34 cards");
  // Nothing after the landing: wait longer than three hops.
  await page.waitForTimeout(5000);
  const ups = await cardValues(page, [14, 15]);
  expect(ups).toHaveLength(34);
  expect(ups.findIndex((u) => u < 0)).toBe(33);
  expect(ups[33]).toBe(-2951425);
  const along = await cardValues(page, [10, 11]);
  expect(along[0]).toBe(14128681);
  expect(along[33]).toBe(390417741);
  const cmds = stdinSince(mark);
  expect(cmds.filter((l) => l === "b i")).toHaveLength(1);
  expect(cmds.filter((l) => l === "s cy.op 1a")).toHaveLength(1);
  expect(cmds.indexOf("b c")).toBeLessThan(cmds.indexOf("b r"));
  expect(cmds.indexOf("s cy.op 1a")).toBeGreaterThan(cmds.indexOf("b i"));
  expect((await sent(page)).filter((m) => m.t === "set_speed")).toHaveLength(0);
});
