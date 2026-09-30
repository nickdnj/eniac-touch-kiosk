// Touch-target and hover audit (test plan section 7, M1-16, G-M1-4).
// Walks every M1 screen/state and runs one audit function:
//  - every interactive element >= 64x64; jack hit areas 88x88, dials 120x120
//  - primary actions >= 96 px tall (UX 5.1 64 px exceptions allow-listed)
//  - >= 16 px between simultaneously active targets (hit rects)
//  - buttons not covered (elementFromPoint at the centre)
//  - no :hover rules, no title tooltips, no text inputs
//  - visible UI text >= 24 px (engraved panel text inside SVG art is exempt)
// A table (screen, element, w x h, verdict) is attached to each test.
// Not covered here: axe-core contrast (not installed; tokens are from the
// UX spec's Okabe-Ito palette) and the CDP listener sweep for undeclared
// interactive elements (all taps go through ui/tap.ts `data-tap`).

import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { devMission, fresh, hit, mainBtn, mock, tap, tapSlow, toRun, toStep1, view } from "./helpers.ts";

// UX-set 64 px exceptions (UX 5.1, 7.3, 7.5): Tell me more, Show me where,
// Skip setup in the rail, CLEAR, header Missions / Start over, run extras.
const ALLOW_64 = [/^Tell me more$/, /^Show me where$/, /^Skip setup, just run it$/, /^CLEAR/, /Missions$/, /^Start over$/, /^Keep pressing for me$/, /^Stop pressing$/, /^Skip to the answer$/];
const PRIMARY = [/^INIT/, /^Next step$/, /^Finish wiring$/, /^Do it for me$/, /^Continue$/, /^I'm here$/, /^Let's go$/, /^Start$/, /^Try again$/, /^Menu$/, /^Close$/, /^Yes, /, /^Keep going$/, /^Show me what happened$/];

interface Row {
  el: string;
  w: number;
  h: number;
  x: number;
  y: number;
  kind: string;
  label: string;
  covered: boolean;
}

async function collect(page: Page): Promise<Row[]> {
  return page.evaluate(() => {
    const out: Row[] = [];
    const visible = (r: DOMRect) => r.width > 0 && r.height > 0;
    const scale = (document.getElementById("app")!.getBoundingClientRect().width || 1920) / 1920;
    const push = (el: Element, kind: string) => {
      const r = el.getBoundingClientRect();
      if (!visible(r)) return;
      const cs = getComputedStyle(el as HTMLElement);
      if (cs.visibility === "hidden" || cs.display === "none" || el.closest(".hidden")) return;
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      const covered = kind === "button" && !!top && top !== el && !el.contains(top);
      out.push({
        el: `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join(".")}`,
        w: Math.round(r.width / scale),
        h: Math.round(r.height / scale),
        x: Math.round(r.x / scale),
        y: Math.round(r.y / scale),
        kind,
        label: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
        covered,
      });
    };
    // With a modal open (D1, D2, S9) only its layer is active.
    const layer = document.querySelector("#overlay > *") ? document.getElementById("overlay")! : document;
    layer.querySelectorAll("[data-tap], [role=button], button, a, input, select, [tabindex]").forEach((el) => {
      // Full-surface targets (S1 screen, the stage tap surface, scrims) are
      // areas, not buttons; the targets inside them are audited below.
      if (el.matches(".screen.start, .stage, .scrim, .still-scrim")) return;
      push(el, el.matches(".pick") ? "pick" : "button");
    });
    if (layer === document) document.querySelectorAll(".windows .hit").forEach((el) => push(el, (el as HTMLElement).dataset.id!.startsWith("sw:") ? "dial" : "jack"));
    return out;
  });
}

async function audit(page: Page, info: TestInfo, screen: string): Promise<void> {
  const rows = await collect(page);
  const problems: string[] = [];
  const table: string[] = ["screen,element,label,w x h,verdict"];
  for (const r of rows) {
    let verdict = "ok";
    if (r.w < 64 || r.h < 64) verdict = "FAIL <64";
    if (r.kind === "jack" && (r.w < 88 || r.h < 88)) verdict = "FAIL jack<88";
    if (r.kind === "dial" && (r.w < 120 || r.h < 120)) verdict = "FAIL dial<120";
    if (r.kind === "pick" && (r.w < 120 || r.h < 120)) verdict = "FAIL pick<120";
    if (PRIMARY.some((p) => p.test(r.label)) && !ALLOW_64.some((p) => p.test(r.label)) && r.h < 96) verdict = "FAIL primary<96";
    if (r.covered) verdict = "FAIL covered";
    if (r.x < 0 || r.y < 0 || r.x + r.w > 1920 || r.y + r.h > 1080) verdict = "FAIL off-screen";
    if (verdict !== "ok") problems.push(`${screen}: ${r.el} "${r.label}" ${r.w}x${r.h} ${verdict}`);
    table.push(`${screen},${r.el},"${r.label}",${r.w}x${r.h},${verdict}`);
  }
  // 16 px between simultaneously active targets (not nested ones).
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
      const overlapY = a.y < b.y + b.h && b.y < a.y + a.h;
      if (overlapX && overlapY) continue; // nested (card + its Start button) or the same target
      const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
      const gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
      const gap = Math.max(gx, gy);
      if (gap < 16 - 0.5) problems.push(`${screen}: gap ${gap}px between "${a.label || a.el}" and "${b.label || b.el}"`);
    }
  }
  // Text sizes (NFR-06): HTML text only; SVG engraving is decoration.
  const small = await page.evaluate(() => {
    const bad: string[] = [];
    const walker = document.createTreeWalker(document.getElementById("app")!, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!;
      if (!n.textContent?.trim() || el.closest("svg") || el.closest(".hidden")) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).visibility === "hidden") continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 24) bad.push(`${n.textContent.trim().slice(0, 30)} (${px}px)`);
    }
    return bad;
  });
  for (const s of small) problems.push(`${screen}: text < 24px: ${s}`);
  const extra = await page.evaluate(() => ({
    inputs: document.querySelectorAll("input, textarea, [contenteditable]").length,
    titles: document.querySelectorAll("#app [title]").length,
  }));
  if (extra.inputs) problems.push(`${screen}: text input present`);
  if (extra.titles) problems.push(`${screen}: title tooltip present`);
  await info.attach(`touch-audit-${screen}.csv`, { body: table.join("\n"), contentType: "text/csv" });
  expect(problems, problems.join("\n")).toEqual([]);
}

test("no :hover rules anywhere in the styles (UX-03)", async ({ page }) => {
  await fresh(page);
  const hovers = await page.evaluate(() =>
    [...document.styleSheets].flatMap((s) => {
      try {
        return [...s.cssRules].map((r) => r.cssText).filter((t) => t.includes(":hover"));
      } catch {
        return [];
      }
    }),
  );
  expect(hovers).toEqual([]);
});

test("audit: S1, S2, S3, Step 0, D2 Tell me more, D1 confirm", async ({ page }, info) => {
  await fresh(page);
  await audit(page, info, "S1");
  await tap(page, page.locator(".screen.start"));
  await expect(view(page)).toHaveAttribute("data-view", "picker");
  await audit(page, info, "S2");
  await page.waitForTimeout(650);
  await tapSlow(page, page.locator(".mc-start"));
  await expect(page.locator(".step-card h2")).toHaveText("Mission 1: Squares");
  await audit(page, info, "S3");
  await tapSlow(page, page.locator(".rail .more-btn"));
  await audit(page, info, "D2");
  await tapSlow(page, page.getByText("Close"));
  await page.waitForTimeout(400);
  await tapSlow(page, mainBtn(page));
  await audit(page, info, "S4-step0");
  await tapSlow(page, page.locator(".hdr-startover"));
  await audit(page, info, "D1");
});

test("audit: S4 switch step with picker, plug step, S5", async ({ page }, info) => {
  await devMission(page);
  await toStep1(page);
  await page.waitForTimeout(500);
  await audit(page, info, "S4-switch");
  await tapSlow(page, hit(page, "sw:c.j1"));
  await audit(page, info, "S4-picker");
  await tapSlow(page, page.locator('.pick[data-value="1"]'));
  await expect(mainBtn(page)).toHaveText("Next step");
  await tapSlow(page, mainBtn(page));
  await page.waitForTimeout(500);
  await audit(page, info, "S4-plug");
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 10_000 });
  await audit(page, info, "S5");
});

test("audit: S6 idle, busy, after press 3; S7; S9; S10", async ({ page }, info) => {
  await toRun(page);
  await mock(page, "speed", { slow: 60 });
  await audit(page, info, "S6-idle");
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".init-btn")).toHaveClass(/busy/);
  await audit(page, info, "S6-busy");
  for (let i = 0; i < 3; i++) {
    await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 15_000 });
    await page.waitForTimeout(450);
    if (i < 2) await tap(page, page.locator(".init-btn"));
  }
  await expect(page.locator(".keep-btn")).toBeVisible();
  await audit(page, info, "S6-extras");
  await tapSlow(page, page.locator(".show-me"));
  await expect(view(page)).toHaveAttribute("data-view", "result");
  await audit(page, info, "S7");
  await mock(page, "config", { idle: { setupS: 2, runS: 2, countdownS: 10 } });
  await expect(page.locator(".still")).toBeVisible({ timeout: 6000 });
  await audit(page, info, "S9");
  await mock(page, "fault", { recoverAfterMs: 60_000 });
  await expect(view(page)).toHaveAttribute("data-view", "error");
  await audit(page, info, "S10");
});
