// Clean footage for the Difference mission video, cubes edition: the whole
// mission (briefing, plan, five steps, the run), then Your turn (predict the
// next row, pick a different steady number, run again, compare). No captions
// or cards: the voice-over and the edit carry the words; only the tap ripples
// are drawn. Recorded live on the REAL bridge and simulator core. Every beat
// is logged with its offset into the recording, to build/video/difference-cubes-beats.json,
// so the edit can cut to it. Not part of CI. From src/web:
//   npx playwright test -c ../../tests/web/video/playwright.config.ts clip-difference-cubes
// then convert build/video/out/<this test>/video.webm with ffmpeg (see playwright.config.ts).

import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tap, tapSlow, hit, mainBtn, feedback, view } from "../e2e/helpers.ts";
import { overlays, pause } from "./overlay.ts";

const cards = (page: Page) => page.evaluate(() => (window as any).__eniac.cards.count as number);
const steady = "9"; // the number the visitor picks in Your turn

test("clip: Difference mission, cubes and Your turn (clean footage)", async ({ page }) => {
  test.setTimeout(1_500_000);
  await overlays(page);
  await page.goto("/");
  const t0 = await page.evaluate(() => performance.timeOrigin);
  const beats: { beat: string; at: number }[] = [];
  const beat = (name: string) => beats.push({ beat: name, at: Date.now() - t0 });

  await expect(view(page)).toHaveAttribute("data-view", "start");
  beat("attract");
  await pause(page, 3000);
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(3);
  beat("picker page 1");
  await pause(page, 2500);
  await tapSlow(page, page.locator(".pk-pager-btns .btn").nth(1));
  await expect(page.locator('.mission-card[data-mission="difference"]')).toBeVisible();
  beat("picker page 2: Difference");
  await pause(page, 3000);
  await tapSlow(page, page.locator('.mission-card[data-mission="difference"] .mc-start'));

  await expect(page.locator(".step-card h2")).toHaveText("A table, made by adding");
  beat("briefing");
  await pause(page, 21_000); // the blocks build (2x2x2, 3x3x3), then the bars build row by row and hold
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  beat("plan");
  await pause(page, 17_500); // the table builds five rows by adding, then holds
  await tapSlow(page, mainBtn(page));

  await expect(page.locator(".step-card h2")).toHaveText("Dial in the number 6");
  beat("step 1: dial the 6");
  await pause(page, 3000);
  await tapSlow(page, hit(page, "sw:c.k1"));
  await pause(page, 900);
  await tapSlow(page, page.locator('.picker .pick[data-value="6"]'));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2000);
  await tapSlow(page, mainBtn(page));

  beat("step 2: first difference onto trunk 1");
  await pause(page, 4000); // the connector shot: rectangular data jacks, round control jacks
  await tapSlow(page, hit(page, "jack:a18.A"));
  await pause(page, 800);
  await tapSlow(page, hit(page, "trunk:1"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2500);
  await tapSlow(page, mainBtn(page));

  beat("step 3: trunk 1 into accumulator 17");
  await pause(page, 3000);
  await tapSlow(page, hit(page, "trunk:1"));
  await pause(page, 800);
  await tapSlow(page, hit(page, "jack:a17.α"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2500);
  await tapSlow(page, mainBtn(page));

  beat("step 4: punch the table value");
  await pause(page, 3000);
  await tapSlow(page, hit(page, "sw:pr.9"));
  await pause(page, 900);
  await tapSlow(page, page.locator('.picker .pick[data-value="P"]'));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2000);
  await tapSlow(page, mainBtn(page));

  beat("step 5: close the loop");
  await pause(page, 3000);
  await tapSlow(page, hit(page, "jack:a20.5o"));
  await pause(page, 800);
  await tapSlow(page, hit(page, "trunk:1-5"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2500);
  await tapSlow(page, mainBtn(page));

  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  beat("the rest is done for you");
  await pause(page, 6000);
  await tapSlow(page, mainBtn(page));

  await expect(view(page)).toHaveAttribute("data-view", "run");
  beat("run view, before INIT");
  await pause(page, 3500);
  await tap(page, page.locator(".init-btn"));
  beat("INIT pressed");
  await expect.poll(() => cards(page), { timeout: 60_000, intervals: [500] }).toBeGreaterThanOrEqual(1);
  beat("first card");
  await expect.poll(() => cards(page), { timeout: 60_000, intervals: [500] }).toBeGreaterThanOrEqual(6);
  beat("row 6: 125");
  await expect.poll(() => cards(page), { timeout: 60_000, intervals: [500] }).toBeGreaterThanOrEqual(9);
  beat("row 9: 512");
  await pause(page, 3000);
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 40_000 });
  await tapSlow(page, page.locator('.speed-btn[data-speed="full"]'));
  beat("Full speed");
  await expect.poll(() => cards(page), { timeout: 90_000, intervals: [500] }).toBeGreaterThanOrEqual(14);
  beat("14 rows at Full");
  await tapSlow(page, page.locator(".skip-answer-btn")); // the button goes at the result checkpoint (row 20)
  await expect(page.locator(".result-answer h2")).toBeVisible({ timeout: 60_000 });
  beat("result");
  await pause(page, 8000);

  // ---------------------------------------------------------------- Your turn
  await expect(page.locator(".yt-btn:not(.hidden)")).toBeVisible({ timeout: 40_000 });
  beat("result: Your turn button");
  await pause(page, 1500);
  await tapSlow(page, page.locator(".yt-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "yourturn");
  beat("predict: the question");
  await pause(page, 7000);
  await tapSlow(page, page.locator(".yt-option", { hasText: /^64$/ }));
  await expect(page.locator(".yt-go:not(.hidden)")).toBeVisible();
  beat("predict: answered");
  await pause(page, 6500);
  await tapSlow(page, page.locator(".yt-go"));

  await expect(page.locator(".step-card h2")).toHaveText("Pick the steady number");
  beat("bend: pick the steady number");
  await pause(page, 5000);
  await tapSlow(page, hit(page, "sw:c.k1"));
  await pause(page, 1200);
  await tapSlow(page, page.locator(`.picker .pick[data-value="${steady}"]`));
  await expect(feedback(page)).toHaveClass(/ok/);
  beat("bend: number set");
  await pause(page, 2500);
  await tapSlow(page, mainBtn(page)); // "Build my table"
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  beat("bend: the rest is done for you");
  await pause(page, 4500);
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
  beat("bend: run view");
  await pause(page, 2500);
  await tap(page, page.locator(".init-btn"));
  beat("bend: INIT pressed");
  await expect.poll(() => cards(page), { timeout: 60_000, intervals: [500] }).toBeGreaterThanOrEqual(8);
  beat("bend: row 8");
  await pause(page, 2500);
  await expect(page.locator(".skip-answer-btn")).toBeVisible({ timeout: 40_000 });
  await tapSlow(page, page.locator(".skip-answer-btn"));
  await expect(page.locator(".yt-compare .yt-crow")).toHaveCount(8, { timeout: 60_000 });
  beat("bend: compare");
  await pause(page, 12_000);
  beat("end");

  const out = join(__dirname, "..", "..", "..", "build", "video");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "difference-cubes-beats.json"), JSON.stringify(beats, null, 2));
});
