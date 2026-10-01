// Shared e2e helpers. All input is touch (page.touchscreen.tap), which
// Chromium turns into pointer events: pointerdown + pointerup on release.

import { expect, type Page, type Locator } from "@playwright/test";

export async function mock(page: Page, path: string, body?: unknown): Promise<any> {
  const r = await page.request.post(`/__mock/${path}`, { data: body ?? {} });
  return r.json();
}
export async function mockGet(page: Page, path: string): Promise<any> {
  const r = await page.request.get(`/__mock/${path}`);
  return r.json();
}

/** Messages the UI sent to the bridge, in order. */
export async function sent(page: Page): Promise<any[]> {
  return mockGet(page, "log");
}

/** Tap the centre of an element (or an offset from it) with a touch. */
export async function tap(page: Page, target: Locator | { x: number; y: number }, offset = { x: 0, y: 0 }): Promise<void> {
  let x: number, y: number;
  if ("boundingBox" in target) {
    await expect(target).toBeVisible();
    const b = (await target.boundingBox())!;
    x = b.x + b.width / 2;
    y = b.y + b.height / 2;
  } else ({ x, y } = target);
  await page.touchscreen.tap(x + offset.x, y + offset.y);
}

/** Taps respecting the 400 ms debounce of step actions (UX 9.3). */
export async function tapSlow(page: Page, target: Locator | { x: number; y: number }, offset = { x: 0, y: 0 }): Promise<void> {
  await tap(page, target, offset);
  await page.waitForTimeout(450);
}

export async function fresh(page: Page, query = ""): Promise<void> {
  await mock(page, "reset");
  await page.goto(`/${query}`);
  await expect(page.locator("#app")).toHaveAttribute("data-view", /start|boot/);
}

/** From S1 to the Squares briefing. */
export async function toBriefing(page: Page): Promise<void> {
  await fresh(page);
  await expect(page.locator("#app")).toHaveAttribute("data-view", "start");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator("#app")).toHaveAttribute("data-view", "picker");
  await tapSlow(page, page.getByRole("button", { name: "Start", exact: true }).first());
  await expect(page.locator("#app")).toHaveAttribute("data-view", "mission");
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
}

export const view = (page: Page) => page.locator("#app");

/** Hit-area marker of a step target in the open close-up window(s). */
export const hit = (page: Page, id: string) => page.locator(`.windows .hit[data-id="${id}"]`);
export const mainBtn = (page: Page) => page.locator(".rail .main-btn");
export const feedback = (page: Page) => page.locator(".step-card .feedback");

/** Dev shortcut (?mission=squares, dev builds only) straight to the briefing. */
export async function devMission(page: Page): Promise<void> {
  await mock(page, "reset");
  await page.goto("/?mission=squares");
  await expect(page.locator(".step-card h2")).toHaveText("What is a square?");
}

/** Briefing -> plan -> step 1. */
export async function toStep1(page: Page): Promise<void> {
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Here is the trick");
  await tapSlow(page, mainBtn(page));
  await expect(page.locator(".step-card h2")).toHaveText("Dial in the number 1");
}

/** Does one step correctly by touch and waits for the success state. */
export async function doStepByTouch(page: Page, step: { kind: string; ids: string[]; value?: string }): Promise<void> {
  if (step.kind === "switch") {
    await tapSlow(page, hit(page, step.ids[0]));
    await tapSlow(page, page.locator(`.picker .pick[data-value="${step.value}"]`));
  } else {
    await tapSlow(page, hit(page, step.ids[0]));
    await tapSlow(page, hit(page, step.ids[1]));
  }
  await expect(feedback(page)).toHaveClass(/ok/);
}

/** The seven Squares steps as element ids (UX 8.1.2). */
export const SQUARES_STEPS = [
  { id: "j1-one", kind: "switch", ids: ["sw:c.j1"], value: "1", line: "s c.j1 1" },
  { id: "const-to-trunk1", kind: "plug", ids: ["jack:c.o", "trunk:1"], line: "p c.o 1" },
  { id: "trunk1-to-a1", kind: "plug", ids: ["trunk:1", "jack:a1.α"], line: "p 1 a1.α" },
  { id: "a1-to-a2", kind: "plug", ids: ["jack:a1.A", "jack:a2.β"], line: "p a1.A a2.β" },
  { id: "a1-twice", kind: "switch", ids: ["sw:a1.rp6"], value: "2", line: "s a1.rp6 2" },
  { id: "init-to-1-1", kind: "plug", ids: ["jack:i.io", "trunk:1-1"], line: "p i.io 1-1" },
  { id: "a2-6o-to-1-3", kind: "plug", ids: ["jack:a2.6o", "trunk:1-3"], line: "p a2.6o 1-3" },
];

/** Whole setup by correct taps, ending on S5 with Continue enabled. */
export async function doAllSteps(page: Page): Promise<void> {
  for (const [i, st] of SQUARES_STEPS.entries()) {
    await doStepByTouch(page, st);
    await expect(mainBtn(page)).toHaveText(i === 6 ? "Finish wiring" : "Next step");
    await tapSlow(page, mainBtn(page));
  }
}

export async function toRun(page: Page, how: "touch" | "skip" = "skip"): Promise<void> {
  await devMission(page);
  await toStep1(page);
  if (how === "touch") await doAllSteps(page);
  else await tapSlow(page, page.locator(".rail .skip-btn"));
  await expect(mainBtn(page)).toHaveText("Continue", { timeout: 15_000 });
  await expect(mainBtn(page)).toBeVisible();
  await tapSlow(page, mainBtn(page));
  await expect(view(page)).toHaveAttribute("data-view", "run");
}

/** The five Primes steps as element ids (UX 8.2.2). */
export const PRIMES_STEPS = [
  { id: "k1-two", kind: "switch", ids: ["sw:c.k1"], value: "2", line: "s c.k1 2" },
  { id: "a1-fits", kind: "plug", ids: ["jack:a1.12o", "trunk:1-7"], line: "p a1.12o 1-7" },
  { id: "trunk17-to-mp", kind: "plug", ids: ["trunk:1-7", "jack:p.Adi"], line: "p 1-7 p.Adi" },
  { id: "trunk19-to-punch", kind: "plug", ids: ["trunk:1-9", "jack:i.pi"], line: "p 1-9 i.pi" },
  { id: "punch-done-to-14", kind: "plug", ids: ["jack:i.po", "trunk:1-4"], line: "p i.po 1-4" },
];

/** The first odd primes, for checking real cards (3, 5, 7, ... in order). */
export function oddPrimes(n: number): number[] {
  const out: number[] = [];
  for (let x = 3; out.length < n; x += 2) {
    let p = true;
    for (let d = 3; d * d <= x; d += 2) if (x % d === 0) p = false;
    if (p) out.push(x);
  }
  return out;
}

/** From the dev shortcut (?mission=ID) to that mission's briefing (mock). */
export async function devMissionId(page: Page, id: string, briefing: string): Promise<void> {
  await mock(page, "reset");
  await page.goto(`/?mission=${id}`);
  await expect(page.locator(".step-card h2")).toHaveText(briefing);
}

/** Card values the UI holds for this session, oldest first (from window.__eniac). */
export async function cardValues(page: Page, fields: number[]): Promise<number[]> {
  return page.evaluate((fields) => {
    const app = (window as any).__eniac;
    return app.cards.cards.map((c: any) => Number(fields.map((i: number) => c.fields[i]).join("").trim()));
  }, fields);
}
