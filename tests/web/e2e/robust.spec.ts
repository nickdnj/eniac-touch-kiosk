// Regressions from the hands-on walkthrough of cc00f04:
//  1. S5 placement crawled (1 item per 10-15 s).
//  2. The dial pointer did not move after a correct pick.
//  3. Next step / Skip setup were dead for 3-4 s after a step succeeded.
// Root cause: flow waited on animation frames. Each test also runs with all
// animations slowed 50x via DevTools (a stand-in for a throttled window) to
// prove nothing waits on them any more.

import { test, expect, type Page } from "@playwright/test";
import { devMission, feedback, hit, mainBtn, tap, tapSlow, toStep1 } from "./helpers.ts";

async function slowAnimations(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.02 });
}

const pointerAngle = (page: Page, scope: string, sw: string) =>
  page.locator(`${scope} [id="${sw}"] .dial-pointer`).first().evaluate((g) => Number(/rotate\(([-\d.]+)/.exec(g.getAttribute("transform") ?? "")?.[1]));

for (const slow of [false, true]) {
  const tag = slow ? " (animations throttled)" : "";

  test(`S5 finishes in under 6 s after Skip setup${tag}`, async ({ page }) => {
    await devMission(page);
    if (slow) await slowAnimations(page);
    await tapSlow(page, mainBtn(page));
    const t0 = Date.now();
    await tap(page, page.locator(".rail .skip-btn"));
    await expect(mainBtn(page)).toHaveText("Continue", { timeout: 10_000 });
    await expect(mainBtn(page)).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(6000);
    await expect(page.locator(".counters .count").nth(0)).toHaveText("13");
    await expect(page.locator(".workbench .cable")).toHaveCount(13);
    // Every dial shows its value: a1.op6 is A.
    const a = await pointerAngle(page, ".workbench", "sw:a1.op6");
    expect(a).toBeCloseTo(-135 + (6 * 270) / 8, 1);
  });

  test(`dial pointer turns to the chosen value at once${tag}`, async ({ page }) => {
    await devMission(page);
    if (slow) await slowAnimations(page);
    await toStep1(page);
    expect(await pointerAngle(page, ".windows", "sw:c.j1")).toBe(-135);
    await tapSlow(page, hit(page, "sw:c.j1"));
    await tap(page, page.locator('.pick[data-value="1"]'));
    await expect.poll(() => pointerAngle(page, ".windows", "sw:c.j1"), { timeout: 300 }).toBe(-105);
    await expect(feedback(page)).toHaveClass(/ok/);
    await expect.poll(() => pointerAngle(page, ".workbench", "sw:c.j1")).toBe(-105);
  });

  test(`Next step and Skip setup are live right after a step succeeds${tag}`, async ({ page }) => {
    await devMission(page);
    if (slow) await slowAnimations(page);
    await toStep1(page);
    await tapSlow(page, hit(page, "sw:c.j1"));
    const t0 = Date.now();
    await tap(page, page.locator('.pick[data-value="1"]'));
    await expect(mainBtn(page)).toHaveText("Next step", { timeout: 1000 });
    await expect(mainBtn(page)).not.toHaveClass(/disabled/);
    expect(Date.now() - t0).toBeLessThan(1000);
    // One tap on Next goes on immediately, even mid-animation.
    await tap(page, mainBtn(page));
    await expect(page.locator(".step-card h2")).toHaveText("Put the 1 on the number highway", { timeout: 1000 });
    // A plug step, then Skip setup straight away: first tap counts.
    await tapSlow(page, hit(page, "jack:c.o"));
    await tap(page, hit(page, "trunk:1"));
    await expect(feedback(page)).toHaveClass(/ok/, { timeout: 1000 });
    await tap(page, page.locator(".rail .skip-btn"));
    await expect(page.locator(".step-card h2")).toHaveText("The rest is done for you", { timeout: 1000 });
  });
}
