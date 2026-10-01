// Helpers for the real-bridge suite. No mock controls exist here: outgoing
// messages are recorded in the page, core stdin comes from the bridge's debug
// log, machine state from the UI's own mirror.

import { expect, type Page } from "@playwright/test";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { tap, tapSlow, view } from "../e2e/helpers.ts";

const LOG = join(__dirname, "..", "..", "..", "build", "e2e", "bridge.log");
const HEALTH = "http://127.0.0.1:8752/healthz";

/** Byte offset of the bridge log now; pass to stdinSince(). */
export function logMark(): number {
  try {
    return statSync(LOG).size;
  } catch {
    return 0;
  }
}

/** Core stdin commands written since `mark` (from `core< ...` debug lines). */
export function stdinSince(mark: number): string[] {
  const text = readFileSync(LOG).subarray(mark).toString("utf8");
  const out: string[] = [];
  // slog's text handler quotes the message (it contains spaces) Go-style.
  for (const m of text.matchAll(/msg="core< ((?:[^"\\]|\\.)*)"/g)) out.push(JSON.parse(`"${m[1]}"`));
  return out;
}

/** Commands the UI asked for (session setup lines like `f p`, `s cy.rate`, `d i` excluded). */
export const visitorLines = (cmds: string[]) => cmds.filter((c) => /^(p |s (?!cy\.)|b )/.test(c));

export async function recordSent(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __sent: unknown[] };
    w.__sent = [];
    const orig = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data: string | ArrayBufferLike | Blob | ArrayBufferView) {
      try {
        w.__sent.push(JSON.parse(String(data)));
      } catch {}
      return orig.call(this, data);
    };
  });
}

export async function sent(page: Page): Promise<any[]> {
  return page.evaluate(() => (window as unknown as { __sent: unknown[] }).__sent);
}

export async function machine(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__eniac.mirror.machine);
}

export async function sessionId(page: Page): Promise<string | null> {
  return page.evaluate(() => (window as any).__eniac.mirror.session?.id ?? null);
}

export async function healthz(): Promise<any> {
  const r = await fetch(HEALTH);
  return r.json();
}

/** Waits until the bridge's core is up again (after a kill test). */
export async function coreUp(): Promise<void> {
  await expect.poll(async () => (await healthz()).core?.state, { timeout: 60_000 }).toBe("up");
}

/** S1 -> S2 -> Start -> briefing, the way a visitor gets there. */
export async function startSquares(page: Page): Promise<void> {
  await coreUp();
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(1);
  await page.waitForTimeout(650);
  await tapSlow(page, page.locator(".mc-start"));
  await expect(page.locator(".step-card h2")).toHaveText("Mission 1: Squares");
}

/** Decodes an accumulator from the lit DOM lamps in the run view. */
export async function lampValue(page: Page, n: number): Promise<number> {
  return page.evaluate((n) => {
    let digits = "";
    for (let d = 1; d <= 10; d++) {
      const lit = [...document.querySelectorAll(`.run-stage [id^="lamp:acc.${n}.d.${d}."].on`)];
      if (lit.length !== 1) return -1;
      digits += lit[0].id.split(".").pop();
    }
    return Number(digits);
  }, n);
}

export async function pressInitAndSettle(page: Page): Promise<void> {
  await tap(page, page.locator(".init-btn"));
  await expect(page.locator(".init-btn")).toHaveClass(/busy/);
  await expect(page.locator(".init-btn")).not.toHaveClass(/busy/, { timeout: 30_000 });
  await page.waitForTimeout(450);
}
