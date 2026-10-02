// Shared overlays for the walkthrough videos (not part of CI): title and
// end cards, a caption over the left stage, and a visible ripple on every
// touch. Injected with bypassCSP; nothing here is in the kiosk bundle.
import type { Page } from "@playwright/test";
import { afterSpeech, lineMs, speak, speakNoWait } from "./narrate.ts";

// Overlay helpers: title/end cards, captions, and a visible tap ripple.
export async function overlays(page: Page) {
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
export async function card(page: Page, html: string, ms: number) {
  await page.evaluate((html) => {
    const c = document.createElement("div"); c.id = "vid-card"; c.innerHTML = html; document.body.append(c);
  }, html);
  // Narration: title and end cards stay up at least as long as their line.
  const key = /<h1>Thank you<\/h1>/.test(html) ? "end card" : "title card";
  const t = Date.now();
  await speak(page, key);
  const left = Math.max(ms, lineMs(key)) - (Date.now() - t);
  if (left > 0) await page.waitForTimeout(left);
  await page.evaluate(() => { const c = document.getElementById("vid-card"); if (c) { c.style.opacity = "0"; setTimeout(() => c.remove(), 700); } });
  await page.waitForTimeout(700);
}
export async function cap(page: Page, text: string | null) {
  await page.evaluate((text) => {
    let c = document.getElementById("vid-cap");
    if (!c) { c = document.createElement("div"); c.id = "vid-cap"; document.body.append(c); }
    if (text) { c.textContent = text; c.style.opacity = "1"; } else c.style.opacity = "0";
  }, text);
  await speak(page, text ?? "(caption cleared)");
}
/** Move the caption (centre x and distance from the bottom, in px) so it
 *  does not cover what is being tapped; capAt(page) puts it back. */
export async function capAt(page: Page, x = 700, bottom = 40) {
  await page.evaluate(({ x, bottom }) => {
    let c = document.getElementById("vid-cap");
    if (!c) { c = document.createElement("div"); c.id = "vid-cap"; document.body.append(c); }
    c.style.left = x + "px"; c.style.bottom = bottom + "px";
  }, { x, bottom });
}
/** Narration with no caption: the line keyed by `beat` (e.g. "(tour: f3)"). */
export const say = (page: Page, beat: string) => speak(page, beat);
/** The same, but the action goes on while it is said. */
export const sayOver = (_page: Page, beat: string) => speakNoWait(beat);
export const pause = (page: Page, ms: number) => page.waitForTimeout(afterSpeech(ms));

