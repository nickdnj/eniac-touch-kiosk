// #21: result screen (UX 7.6; test plan M1-13).

import { test, expect } from "@playwright/test";
import { mock, mockGet, sent, tap, tapSlow, toRun, view } from "./helpers.ts";

test("Skip to the answer lands on S7 with the full real tape and the takeaway", async ({ page }) => {
  await toRun(page);
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 60_000 });
  await expect(page.locator(".result-right h2")).toHaveText("You made a table of squares!");
  await expect(page.locator(".takeaway strong")).toHaveText("The cables were the program.");
  const rows = await page.locator(".result-tape .row").allTextContents();
  expect(rows).toHaveLength(12);
  expect(rows[0]).toBe("1 x 1 = 1");
  expect(rows[11]).toBe("12 x 12 = 144");
  // M1: nothing follows Squares, so Menu is primary and there is no Next.
  await expect(page.locator(".next-btn")).toHaveCount(0);
  await expect(page.locator(".menu-btn")).toHaveClass(/primary/);
  for (const b of await page.locator(".result-actions .btn").all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(96);
});

test("result reached via 'Show me what happened' shows only the presses made", async ({ page }) => {
  await toRun(page);
  await mock(page, "speed", { slow: 30 });
  for (let i = 0; i < 3; i++) {
    await tap(page, page.locator(".init-btn"));
    await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 15_000 });
    await page.waitForTimeout(450);
  }
  await tap(page, page.locator(".show-me"));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  await expect(page.locator(".result-tape .row")).toHaveText(["1 x 1 = 1", "2 x 2 = 4", "3 x 3 = 9"]);
});

test("Try again: new session, lamps 0, step 1 of 7", async ({ page }) => {
  await toRun(page);
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 60_000 });
  const before = (await mockGet(page, "session")).session.id;
  await tapSlow(page, page.locator(".try-again"));
  await expect(page.locator(".step-card h2")).toHaveText("Dial in the number 1");
  await expect(page.locator(".hdr-step")).toHaveText("Step 1 of 7");
  const { session, machine } = await mockGet(page, "session");
  expect(session.id).not.toBe(before);
  expect([machine.acc["1"].value, machine.acc["2"].value]).toEqual([0, 0]);
  await expect(page.locator('.workbench [id="lamp:acc.2.d.10.0"].on')).toHaveCount(1);
});

test("Menu ends the session", async ({ page }) => {
  await toRun(page);
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 60_000 });
  await tapSlow(page, page.locator(".menu-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  expect((await sent(page)).some((m) => m.t === "end_session" && m.reason === "menu")).toBe(true);
  expect((await mockGet(page, "session")).session).toBeNull();
});
