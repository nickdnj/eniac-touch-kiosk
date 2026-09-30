// #24: S10 "ENIAC is resting" and automatic recovery (FR-50..52; test plan
// M1-14 / section 6). The mock stands in for the core kill; the real kill -9
// test runs against the bridge in tests/e2e once #7/#11 are merged.

import { test, expect } from "@playwright/test";
import { fresh, mock, tap, toRun, view } from "./helpers.ts";

test("core down mid-run: S10 with code and retry count, no lamps, then back to S1 by itself", async ({ page }) => {
  await toRun(page);
  await tap(page, page.locator(".init-btn"));
  await page.waitForTimeout(300);
  await mock(page, "fault", { code: "E-CORE-DOWN", recoverAfterMs: 4500 });
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 3000 });
  await expect(page.locator(".err-text h1")).toHaveText("ENIAC is resting.");
  await expect(page.locator(".err-body")).toHaveText("Please let a docent know.");
  await expect(page.locator(".err-trying")).toHaveText("Trying to wake it up again... (1 of 3)");
  await expect(page.locator(".err-code")).toHaveText("E-CORE-DOWN (mock)");
  await expect(page.locator(".lamp")).toHaveCount(0);
  await expect(page.locator(".lamp.on")).toHaveCount(0);
  await expect(page.locator(".err-trying")).toHaveText("Trying to wake it up again... (2 of 3)", { timeout: 4000 });
  await expect(page.locator("#footer")).toBeVisible();
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 8000 });
});

test("after the retry budget the staff instruction replaces the body", async ({ page }) => {
  await fresh(page);
  await mock(page, "fault", { code: "E-RETRY-BUDGET", final: true });
  await expect(view(page)).toHaveAttribute("data-view", "error");
  await expect(page.locator(".err-body")).toHaveText(
    "Staff: tap the top-left corner 5 times, then enter the PIN and choose Restart simulator.",
  );
  await expect(page.locator(".err-trying")).toHaveText("");
  // The admin corner stays reserved (the PIN pad itself is M3): 5 taps do nothing yet.
  for (let i = 0; i < 5; i++) await page.touchscreen.tap(40, 40);
  await expect(view(page)).toHaveAttribute("data-view", "error");
});

test("bridge unreachable for more than 5 s: E-LINK, then recovery on reconnect", async ({ page }) => {
  await toRun(page);
  await mock(page, "drop", { ms: 8000 });
  await page.waitForTimeout(3000);
  await expect(view(page)).toHaveAttribute("data-view", "run", { timeout: 100 });
  await expect(page.locator(".lamp.on")).toHaveCount(0); // link down: lamps blank at once
  await expect(view(page)).toHaveAttribute("data-view", "error", { timeout: 4000 });
  await expect(page.locator(".err-code")).toHaveText("E-LINK");
  await expect(view(page)).toHaveAttribute("data-view", "start", { timeout: 10_000 });
});

test("no mission available: E-MISSION", async ({ page }) => {
  await mock(page, "reset");
  await mock(page, "missions", { available: false });
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "error");
  await expect(page.locator(".err-code")).toHaveText("E-MISSION");
  await expect(page.locator(".lamp")).toHaveCount(0);
});
