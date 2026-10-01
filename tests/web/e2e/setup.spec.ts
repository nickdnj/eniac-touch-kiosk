// #18: rail and flow. Briefing, the plan, 7 steps, Do it for me, Skip setup,
// S5, Tell me more, Start over and Missions confirms (test plan M1-02,
// M1-04, M1-05, M1-13).

import { test, expect } from "@playwright/test";
import {
  SQUARES_STEPS,
  devMission,
  doAllSteps,
  doStepByTouch,
  feedback,
  hit,
  mainBtn,
  mockGet,
  sent,
  tapSlow,
  toStep1,
  view,
} from "./helpers.ts";

test("happy path: all 7 steps by touch, exact .e lines in order, S5 shows 8 cables and 10 switches (M1-02)", async ({ page }) => {
  await devMission(page);
  await expect(page.locator(".roomplan")).toBeVisible();
  await toStep1(page);
  await expect(page.locator(".hdr-step")).toHaveText("Step 1 of 7");
  await doAllSteps(page);
  await expect(page.locator(".step-card h2")).toHaveText("The rest is done for you");
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await expect(page.locator(".counters .count").nth(0)).toHaveText("8");
  await expect(page.locator(".counters .count").nth(1)).toHaveText("10");
  const { stdin } = await mockGet(page, "session");
  expect(stdin).toEqual(SQUARES_STEPS.map((s) => s.line));
  const applied = (await sent(page)).filter((m) => m.t === "apply_step");
  expect(applied.map((m) => m.step)).toEqual(SQUARES_STEPS.map((s) => s.id));
  expect(applied.every((m) => m.assisted === false)).toBe(true);
  await expect(page.locator(".dots .dot.done")).toHaveCount(7);
});

test("Do it for me: step 4 with no wrong taps, step 6 after three wrong taps (M1-04)", async ({ page }) => {
  await devMission(page);
  await toStep1(page);
  for (let i = 0; i < 3; i++) {
    await doStepByTouch(page, SQUARES_STEPS[i]);
    await tapSlow(page, mainBtn(page));
  }
  await expect(mainBtn(page)).toHaveText("Do it for me");
  await tapSlow(page, mainBtn(page));
  await expect(feedback(page)).toHaveText(/Done for you/);
  await expect(page.locator(".dots .dot").nth(3)).toHaveClass(/assisted/);
  await tapSlow(page, mainBtn(page));
  await doStepByTouch(page, SQUARES_STEPS[4]);
  await tapSlow(page, mainBtn(page));
  for (const id of ["jack:i.ri", "jack:i.ro", "jack:i.pi"]) await tapSlow(page, hit(page, id));
  await expect(mainBtn(page)).toHaveClass(/pulse/);
  await tapSlow(page, mainBtn(page));
  await expect(feedback(page)).toHaveText(/Done for you/);
  const applied = (await sent(page)).filter((m) => m.t === "apply_step");
  expect(applied.filter((m) => m.assisted).map((m) => m.step)).toEqual(["a1-to-a2", "init-to-1-1"]);
  const { stdin } = await mockGet(page, "session");
  expect(stdin).toEqual(SQUARES_STEPS.slice(0, 6).map((s) => s.line));
});

test("Skip setup at step 3: no confirm, remaining applied in order, S5 counts what remained (M1-05)", async ({ page }) => {
  await devMission(page);
  await toStep1(page);
  for (let i = 0; i < 2; i++) {
    await doStepByTouch(page, SQUARES_STEPS[i]);
    await tapSlow(page, mainBtn(page));
  }
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("The rest is done for you");
  // Preset 8 cables + 4 skipped cable steps; 10 switches + 1 skipped switch step.
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await expect(page.locator(".counters .count").nth(0)).toHaveText("12");
  await expect(page.locator(".counters .count").nth(1)).toHaveText("11");
  const log = await sent(page);
  expect(log.filter((m) => m.t === "skip_setup")).toHaveLength(1);
  expect(log.find((m) => m.t === "metric" && m.ev === "setup_skipped")).toMatchObject({ step: "trunk1-to-a1" });
  const { stdin } = await mockGet(page, "session");
  expect(stdin).toEqual(SQUARES_STEPS.map((s) => s.line));
});

test("Skip setup from Step 0 goes straight to S5", async ({ page }) => {
  await devMission(page);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(page.locator(".step-card h2")).toHaveText("The rest is done for you");
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await expect(page.locator(".counters .count").nth(0)).toHaveText("13");
  await expect(page.locator(".counters .count").nth(1)).toHaveText("12");
});

test("Tell me more opens a 1000x700 slide-over and closes", async ({ page }) => {
  await devMission(page);
  await tapSlow(page, page.locator(".rail .more-btn"));
  const panel = page.locator(".tellmore");
  await expect(panel).toContainText("February 15, 1946");
  const b = (await panel.boundingBox())!;
  expect(Math.round(b.width)).toBe(1000);
  expect(Math.round(b.height)).toBe(700);
  await expect.poll(() => page.evaluate(() => (window as any).__eniac.idle.paused)).toBe(true);
  await tapSlow(page, panel.getByText("Close"));
  await expect(page.locator(".tellmore")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).__eniac.idle.paused)).toBe(false);
});

test("Start over: Keep going changes nothing; Yes starts a fresh core at step 1 (M1-13)", async ({ page }) => {
  await devMission(page);
  await toStep1(page);
  await doStepByTouch(page, SQUARES_STEPS[0]);
  const before = (await mockGet(page, "session")).session.id;
  await tapSlow(page, page.locator(".hdr-startover"));
  await expect(page.locator(".dialog.confirm")).toContainText("Your cables will come out.");
  await tapSlow(page, page.getByText("Keep going"));
  await expect(page.locator(".dialog")).toHaveCount(0);
  expect((await mockGet(page, "session")).session.id).toBe(before);
  await tapSlow(page, page.locator(".hdr-startover"));
  await tapSlow(page, page.getByText("Yes, start over"));
  await expect(page.locator(".step-card h2")).toHaveText("Dial in the number 1");
  await expect(page.locator(".hdr-step")).toHaveText("Step 1 of 7");
  const after = (await mockGet(page, "session")).session;
  expect(after.id).not.toBe(before);
  expect(after.applied).toEqual([]);
});

test("Missions: no confirm before any step; confirm after one", async ({ page }) => {
  await devMission(page);
  await tapSlow(page, page.locator(".hdr-missions"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  expect((await sent(page)).some((m) => m.t === "end_session" && m.reason === "menu")).toBe(true);
  await devMission(page);
  await toStep1(page);
  await doStepByTouch(page, SQUARES_STEPS[0]);
  await tapSlow(page, page.locator(".hdr-missions"));
  await expect(page.locator(".dialog.confirm")).toBeVisible();
  await tapSlow(page, page.getByText("Yes, go back"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
});

test("all copy on the rail comes from the mission JSON", async ({ page }) => {
  await devMission(page);
  await expect(page.locator(".step-card .card-body")).toContainText("A square is a number times itself.");
  await toStep1(page);
  await expect(page.locator(".step-card .card-body")).toHaveText(
    "This is the Constant Transmitter. It holds a number that you set with dials. Tap the glowing dial and choose 1.",
  );
});
