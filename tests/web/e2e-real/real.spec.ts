// M1 against the REAL bridge and the real simulator core (sq.e at the pinned
// upstream commit). Test plan M1-02..M1-10, M1-12, M1-14 (kill -9), M1-15.

import { test, expect } from "@playwright/test";
import { SQUARES_STEPS, doAllSteps, doStepByTouch, feedback, hit, mainBtn, tap, tapSlow, toStep1, view } from "../e2e/helpers.ts";
import {
  coreUp,
  healthz,
  lampValue,
  logMark,
  machine,
  pressInitAndSettle,
  recordSent,
  sent,
  sessionId,
  startSquares,
  stdinSince,
  visitorLines,
} from "./real.ts";

test.beforeEach(async ({ page }) => {
  await recordSent(page);
});

test("happy path by touch: 7 exact .e lines, S5 8/10, then 1/1 2/4 3/9 on real lamps (M1-02, M1-06)", async ({ page }) => {
  await startSquares(page);
  const mark = logMark();
  await toStep1(page);
  await doAllSteps(page);
  await expect(mainBtn(page)).toHaveText("Continue");
  await expect(page.locator(".counters .count").nth(0)).toHaveText("8");
  await expect(page.locator(".counters .count").nth(1)).toHaveText("10");
  expect(visitorLines(stdinSince(mark))).toEqual(SQUARES_STEPS.map((s) => s.line));
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  for (const [x, sq] of [[1, 1], [2, 4], [3, 9]]) {
    await pressInitAndSettle(page);
    await expect(page.locator('.readout-value[data-acc="1"]')).toHaveText(String(x));
    await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText(String(sq));
    expect(await lampValue(page, 1)).toBe(x);
    expect(await lampValue(page, 2)).toBe(sq);
    const m = await machine(page);
    expect([m.acc["1"].value, m.acc["2"].value]).toEqual([x, sq]);
  }
  await expect(page.locator(".tape-row")).toHaveText(["1 x 1 = 1", "2 x 2 = 4", "3 x 3 = 9"]);
});

test("wrong taps never reach the core; Do it for me sends the right line (M1-03, M1-04)", async ({ page }) => {
  await startSquares(page);
  await toStep1(page);
  await doStepByTouch(page, SQUARES_STEPS[0]);
  await tapSlow(page, mainBtn(page));
  const mark = logMark();
  await tapSlow(page, hit(page, "jack:c.26i"));
  await tapSlow(page, hit(page, "jack:c.o"));
  await tapSlow(page, hit(page, "trunk:2"));
  await tapSlow(page, hit(page, "trunk:3"));
  await expect(feedback(page)).toHaveText(/Want us to do this one\?/);
  expect(visitorLines(stdinSince(mark))).toEqual([]);
  await tapSlow(page, mainBtn(page)); // Do it for me
  await expect(feedback(page)).toHaveText(/Done for you/);
  expect(visitorLines(stdinSince(mark))).toEqual(["p c.o 1"]);
  expect((await sent(page)).filter((m) => m.t === "apply_step").at(-1)).toMatchObject({ step: "const-to-trunk1", assisted: true });
});

test("Skip setup at step 3 applies the rest in order; INIT x3 gives 3 / 9 (M1-05)", async ({ page }) => {
  await startSquares(page);
  const mark = logMark();
  await toStep1(page);
  for (let i = 0; i < 2; i++) {
    await doStepByTouch(page, SQUARES_STEPS[i]);
    await tapSlow(page, mainBtn(page));
  }
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue");
  await expect(page.locator(".counters .count").nth(0)).toHaveText("12");
  await expect(page.locator(".counters .count").nth(1)).toHaveText("11");
  expect(visitorLines(stdinSince(mark)).sort()).toEqual(SQUARES_STEPS.map((s) => s.line).sort());
  await tapSlow(page, mainBtn(page));
  for (let i = 0; i < 3; i++) await pressInitAndSettle(page);
  await expect(page.locator('.readout-value[data-acc="1"]')).toHaveText("3");
  await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText("9");
});

test("double-tap INIT sends exactly one b i to the core (M1-08); CLEAR resets to 0 / 0 (M1-12)", async ({ page }) => {
  await startSquares(page);
  await toStep1(page);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue");
  await tapSlow(page, mainBtn(page));
  const mark = logMark();
  const b = (await page.locator(".init-btn").boundingBox())!;
  await page.touchscreen.tap(b.x + 100, b.y + 40);
  await page.waitForTimeout(120);
  await page.touchscreen.tap(b.x + 100, b.y + 40);
  await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 30_000 });
  expect(stdinSince(mark).filter((l) => l === "b i")).toHaveLength(1);
  await page.waitForTimeout(450);
  await pressInitAndSettle(page);
  await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText("4");
  await tap(page, page.locator(".clear-btn"));
  await expect(page.locator('.readout-value[data-acc="1"]')).toHaveText("0");
  await expect(page.locator('.readout-value[data-acc="2"]')).toHaveText("0");
  await expect(page.locator(".tape-row")).toHaveCount(0);
  expect(stdinSince(mark).filter((l) => l === "b c")).toHaveLength(1);
  await page.waitForTimeout(450);
  await pressInitAndSettle(page);
  await expect(page.locator(".tape-row")).toHaveText(["1 x 1 = 1"]);
});

test("Keep pressing for me stops at 12 x 12 = 144 after exactly 12 INITs (M1-09)", async ({ page }) => {
  await startSquares(page);
  await toStep1(page);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue");
  await tapSlow(page, mainBtn(page));
  const mark = logMark();
  for (let i = 0; i < 3; i++) await pressInitAndSettle(page);
  await tap(page, page.locator(".keep-btn"));
  await expect(page.locator(".tape-row")).toHaveCount(12, { timeout: 90_000 });
  await expect(page.locator(".keep-btn")).toHaveText("Keep pressing for me", { timeout: 10_000 });
  await page.waitForTimeout(2000);
  const rows = await page.locator(".tape-row").allTextContents();
  rows.forEach((r, i) => expect(r).toBe(`${i + 1} x ${i + 1} = ${(i + 1) ** 2}`));
  expect(stdinSince(mark).filter((l) => l === "b i")).toHaveLength(12);
  expect((await sent(page)).filter((m) => m.t === "button" && m.b === "init")).toHaveLength(12);
});

test("Skip to the answer: full speed, 144, result screen (M1-10)", async ({ page }) => {
  await startSquares(page);
  await toStep1(page);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue");
  await tapSlow(page, mainBtn(page));
  const mark = logMark();
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 60_000 });
  const cmds = stdinSince(mark);
  expect(cmds.indexOf("s cy.rate 0")).toBeGreaterThanOrEqual(0);
  expect(cmds.indexOf("s cy.rate 0")).toBeLessThan(cmds.indexOf("b i"));
  expect(cmds.filter((l) => l === "b i")).toHaveLength(12);
  const rows = await page.locator(".result-tape .row").allTextContents();
  expect(rows).toHaveLength(12);
  expect(rows[11]).toBe("12 x 12 = 144");
  // Try again: a fresh core, 0 / 0, step 1 of 7.
  const before = await sessionId(page);
  await tapSlow(page, page.locator(".try-again"));
  await expect(page.locator(".hdr-step")).toHaveText("Step 1 of 7");
  expect(await sessionId(page)).not.toBe(before);
  await expect(page.locator('.workbench [id="lamp:acc.2.d.10.0"].on')).toHaveCount(1);
});

test("kill -9 of the core mid-run: S10 within seconds, no lamps, then back to S1 by itself (M1-14)", async ({ page }) => {
  await startSquares(page);
  await toStep1(page);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue");
  await tapSlow(page, mainBtn(page));
  await pressInitAndSettle(page);
  await tap(page, page.locator(".init-btn"));
  const pid = (await healthz()).core?.pid;
  expect(typeof pid).toBe("number");
  const t0 = Date.now();
  process.kill(pid, "SIGKILL");
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 10_000 });
  expect(Date.now() - t0).toBeLessThan(10_000);
  await expect(page.locator(".err-code")).toContainText("E-CORE-DOWN");
  await expect(page.locator(".lamp")).toHaveCount(0);
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 60_000 });
  // The next visitor gets a fresh, working core.
  await coreUp();
  await startSquares(page);
  const m = await machine(page);
  expect([m.acc["1"].value, m.acc["2"].value]).toEqual([0, 0]);
});

test("idle: Still there? after setupS, then reset to S1 and the session ends (M1-15)", async ({ page }) => {
  test.setTimeout(90_000);
  await startSquares(page);
  await toStep1(page);
  await expect(page.locator(".still")).toBeVisible({ timeout: 30_000 });
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 15_000 });
  expect((await sent(page)).some((m) => m.t === "end_session" && m.reason === "idle")).toBe(true);
  await expect.poll(async () => (await healthz()).session ?? null).toBeNull();
});
