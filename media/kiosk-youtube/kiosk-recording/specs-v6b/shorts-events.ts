// THROWAWAY (M1 follow-up, 2026-10-12): in-page event log for the Shorts footage
// (F1 attract-tap, F2 squares-fullspeed-lamps). No overlays, no ripples, no captions.
// Times are performance.now() ms = ms since the page was created = video time
// (the recording starts at page creation, as narrate.ts assumes).
import type { Page } from "@playwright/test";

export async function logEvents(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const ev: any[] = ((window as any).__ev = []);
    const t = () => Math.round(performance.now());
    addEventListener("touchstart", (e) => {
      for (const c of Array.from((e as TouchEvent).changedTouches)) ev.push({ t: t(), type: "tap", x: Math.round(c.clientX), y: Math.round(c.clientY),
        target: ((e.target as Element)?.className?.toString?.() || (e.target as Element)?.tagName || "").slice(0, 60) });
    }, { capture: true, passive: true });
    let last: Record<string, string> = {};
    const snap = () => {
      const cur: Record<string, string> = {};
      cur.view = document.querySelector("[data-view]")?.getAttribute("data-view") ?? "";
      cur.scene = document.querySelector("[data-scene]")?.getAttribute("data-scene") ?? "";
      document.querySelectorAll(".readout-value").forEach((r) => (cur["readout" + (r as HTMLElement).dataset.acc] = r.textContent ?? ""));
      cur.plates = Array.from(document.querySelectorAll('[class*="plate"]')).map((p) => (p.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60)).join(" | ");
      cur.keep = document.querySelector(".keep-btn")?.className.includes("running") ? "running" : (document.querySelector(".keep-btn") ? "idle" : "none");
      cur.busy = document.querySelector(".init-btn")?.className.includes("busy") ? "busy" : "idle";
      cur.speed = document.querySelector('.speed-btn[aria-pressed="true"]')?.getAttribute("data-speed") ?? "";
      cur.picker = document.querySelector(".mission-card") ? (document.getAnimations().length ? "fading" : "settled") : "";
      for (const k of Object.keys(cur)) if (cur[k] !== last[k]) ev.push({ t: t(), type: "change", key: k, value: cur[k] });
      last = cur;
    };
    setInterval(snap, 20);
  });
}
export const events = (page: Page) => page.evaluate(() => (window as any).__ev as any[]);
