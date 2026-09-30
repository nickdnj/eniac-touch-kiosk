// #20: "Keep pressing for me" and "Skip to the answer" (M1-09, M1-10).

import { test, expect, type Page } from "@playwright/test";
import { mock, mockGet, sent, tap, toRun, view } from "./helpers.ts";

async function press(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await tap(page, page.locator(".init-btn"));
    await expect(page.locator(".init-btn")).toHaveClass(/busy/);
    await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 15_000 });
    await page.waitForTimeout(450);
  }
}

test("Keep pressing appears after press 3 and stops at x = 12 with 12 INITs (M1-09)", async ({ page }) => {
  await toRun(page);
  await mock(page, "speed", { slow: 40 });
  await expect(page.locator(".keep-btn")).toBeHidden();
  await press(page, 3);
  await expect(page.locator(".keep-btn")).toBeVisible();
  await tap(page, page.locator(".keep-btn"));
  await expect(page.locator(".keep-btn")).toHaveText("Stop pressing");
  await expect(page.locator(".tape-row")).toHaveCount(12, { timeout: 60_000 });
  await expect(page.locator(".keep-btn")).toHaveText("Keep pressing for me");
  await page.waitForTimeout(1500);
  await expect(page.locator(".tape-row")).toHaveCount(12);
  await expect(page.locator(".tape-row").last()).toHaveText("12 x 12 = 144");
  const rows = await page.locator(".tape-row").allTextContents();
  rows.forEach((r, i) => expect(r).toBe(`${i + 1} x ${i + 1} = ${(i + 1) ** 2}`));
  const log = await sent(page);
  expect(log.filter((m) => m.t === "button" && m.b === "init")).toHaveLength(12);
  expect((await mockGet(page, "session")).stdin.filter((l: string) => l === "b i")).toHaveLength(12);
  await tap(page, page.locator(".show-me"));
  await expect(view(page)).toHaveAttribute("data-view", "result");
});

test("Skip to the answer from the first INIT: full speed, 12 x 12 = 144, result screen (M1-10)", async ({ page }) => {
  await toRun(page);
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 60_000 });
  const log = await sent(page);
  expect(log.find((m) => m.t === "metric" && m.ev === "skip_to_answer")).toBeTruthy();
  expect(log.filter((m) => m.t === "set_speed").map((m) => m.speed)).toEqual(["full"]);
  const { stdin, machine } = await mockGet(page, "session");
  expect(stdin.indexOf("s cy.rate 0")).toBeLessThan(stdin.indexOf("b i"));
  expect(stdin.filter((l: string) => l === "b i")).toHaveLength(12);
  expect([machine.acc["1"].value, machine.acc["2"].value]).toEqual([12, 144]);
  expect(await page.evaluate(() => (window as any).__eniac.tape.length)).toBe(12);
});

test("Skip to the answer from press 5", async ({ page }) => {
  await toRun(page);
  await mock(page, "speed", { slow: 40 });
  await press(page, 5);
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 60_000 });
  expect((await mockGet(page, "session")).stdin.filter((l: string) => l === "b i")).toHaveLength(12);
});
