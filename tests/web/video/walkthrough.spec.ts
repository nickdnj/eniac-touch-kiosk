import { test, expect, type Page } from "@playwright/test";
import { tap, tapSlow, hit, mainBtn, feedback, view } from "../e2e/helpers.ts";

// Overlay helpers: title/end cards, captions, and a visible tap ripple.
async function overlays(page: Page) {
  await page.addInitScript(() => {
    const css = `
      #vid-card{position:fixed;inset:0;z-index:99999;background:#0e1013;color:#f2ede1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;font-family:'Atkinson Hyperlegible',sans-serif;text-align:center;transition:opacity .6s}
      #vid-card h1{font-size:84px;margin:0;letter-spacing:.06em;color:#e8dcb5}
      #vid-card p{font-size:34px;margin:0;max-width:1300px;line-height:1.35;color:#cfc8b6}
      #vid-card small{font-size:24px;color:#8f8a7e}
      #vid-cap{position:fixed;left:700px;bottom:40px;transform:translateX(-50%);z-index:99998;background:rgba(14,16,19,.92);color:#ffd27a;border:2px solid #ffb000;border-radius:14px;padding:14px 28px;font:600 30px 'Atkinson Hyperlegible',sans-serif;pointer-events:none;opacity:0;transition:opacity .4s;white-space:nowrap}
      .vid-ripple{position:fixed;z-index:99997;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;border:5px solid rgba(255,255,255,.9);background:rgba(255,255,255,.25);pointer-events:none;animation:vr .7s ease-out forwards}
      @keyframes vr{from{transform:scale(.4);opacity:1}to{transform:scale(1.4);opacity:0}}`;
    addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style"); s.textContent = css; document.head.append(s);
    });
    addEventListener("touchstart", (e) => {
      for (const t of Array.from((e as TouchEvent).changedTouches)) {
        const d = document.createElement("div"); d.className = "vid-ripple";
        d.style.left = t.clientX + "px"; d.style.top = t.clientY + "px";
        document.body.append(d); setTimeout(() => d.remove(), 800);
      }
    }, { capture: true, passive: true });
  });
}
async function card(page: Page, html: string, ms: number) {
  await page.evaluate((html) => {
    const c = document.createElement("div"); c.id = "vid-card"; c.innerHTML = html; document.body.append(c);
  }, html);
  await page.waitForTimeout(ms);
  await page.evaluate(() => { const c = document.getElementById("vid-card"); if (c) { c.style.opacity = "0"; setTimeout(() => c.remove(), 700); } });
  await page.waitForTimeout(700);
}
async function cap(page: Page, text: string | null) {
  await page.evaluate((text) => {
    let c = document.getElementById("vid-cap");
    if (!c) { c = document.createElement("div"); c.id = "vid-cap"; document.body.append(c); }
    if (text) { c.textContent = text; c.style.opacity = "1"; } else c.style.opacity = "0";
  }, text);
}
const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

test("ENIAC touch kiosk walkthrough", async ({ page }) => {
  await overlays(page);
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await card(page, "<h1>ENIAC Touch Kiosk</h1><p>A touch-screen prototype for museum visitors, running Brian L. Stuart's pulse-level ENIAC simulator.</p><small>Prototype · Squares mission · recorded live on the real simulator</small>", 6000);

  await cap(page, "Attract screen: a visitor walks up and touches");
  await pause(page, 3000);
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(1);
  await cap(page, "Pick a mission");
  await pause(page, 2500);
  await tapSlow(page, page.locator(".mc-start"));

  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
  await cap(page, "What is a square? Tiles on a floor");
  await pause(page, 6000);
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  await cap(page, "The trick: a bigger square is a row, a column and a corner added");
  await pause(page, 10000);
  await tapSlow(page, mainBtn(page));

  await expect(page.locator(".step-card h2")).toHaveText("Dial in the number 1");
  await cap(page, "Step 1: set a dial on the Constant Transmitter");
  await pause(page, 3500);
  await tapSlow(page, hit(page, "sw:c.j1"));
  await pause(page, 1200);
  await tapSlow(page, page.locator('.picker .pick[data-value="4"]'));
  await cap(page, "A wrong choice gets a gentle hint, and never reaches the simulator");
  await pause(page, 3500);
  await tapSlow(page, hit(page, "sw:c.j1"));
  await pause(page, 800);
  await tapSlow(page, page.locator('.picker .pick[data-value="1"]'));
  await expect(feedback(page)).toHaveClass(/ok/);
  await cap(page, null);
  await pause(page, 2500);
  await tapSlow(page, mainBtn(page));

  await cap(page, "Step 2: plug a cable — tap one jack, then the other");
  await pause(page, 3500);
  await tapSlow(page, hit(page, "jack:c.o"));
  await pause(page, 900);
  await tapSlow(page, hit(page, "trunk:1"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 3000);
  await tapSlow(page, mainBtn(page));

  await cap(page, "Step 3: carry the number to Accumulator 1");
  await pause(page, 3000);
  await tapSlow(page, hit(page, "trunk:1"));
  await pause(page, 900);
  await tapSlow(page, hit(page, "jack:a1.α"));
  await expect(feedback(page)).toHaveClass(/ok/);
  await pause(page, 2500);

  await cap(page, "Short on time? Skip ahead — the rest is wired automatically");
  await pause(page, 2500);
  await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 30_000 });
  await pause(page, 4000);
  await tapSlow(page, mainBtn(page));

  await expect(view(page)).toHaveAttribute("data-view", "run");
  await cap(page, "Press INIT — ENIAC's GO button. Lamps show the simulator's real accumulators.");
  await pause(page, 4000);
  for (let i = 0; i < 3; i++) {
    await tap(page, page.locator(".init-btn"));
    await expect(page.locator(".init-btn")).toHaveClass(/busy/);
    await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 30_000 });
    await pause(page, 3500);
  }
  await cap(page, "1, 4, 9 … each press adds a row, a column and a corner");
  await pause(page, 3500);
  await cap(page, "Skip to the answer: full speed up to 12 × 12");
  await pause(page, 2000);
  await tap(page, page.locator(".skip-answer-btn"));
  await expect(view(page)).toHaveAttribute("data-view", "result", { timeout: 90_000 });
  await cap(page, null);
  await pause(page, 8000);
  await cap(page, null);

  await card(page, "<h1>Thank you</h1><p>Simulator: Brian L. Stuart, Drexel University — github.com/blstuart/eniac-simulator</p><p>Touch front end: prototype for the Vintage Computer Federation museum</p><small>Squares mission · M1 prototype · not for distribution</small>", 7000);
});
