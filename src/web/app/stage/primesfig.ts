// Primes explained as sharing evenly (UX 8.2.3, direction from Nick
// 2026-10-01): the same tile floor as Squares.
//
// Briefing: 12 cookies (tiles) snap into 3 equal groups of 4: it shares
// evenly. 7 tries 2 groups and 3 groups and always has one left over: 7 is
// prime. Plan: three "group checkers" (groups of 3, 5, 7) try each number at
// once; a number nobody calls "fits!" for is prime and gets a card.
//
// Conventions as in stage/tiles.ts: the timelines are pure data
// (unit-tested); the DOM figure applies each beat's final state on a plain
// timer, CSS transitions are decoration only, so a throttled browser can
// never stall the figure. Meaning is never carried by colour alone: badges
// (check, X, star) and words ("fits", "1 left over", "prime") go with it.

import { h, svgFromString } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { COPY } from "../copy.ts";

// ------------------------------------------------------------------ pure layout

export interface Slot {
  r: number; // row (group)
  c: number; // column within the row
  left: boolean; // the leftover tile(s)
}

/**
 * n tiles shared into groups of `size` (one row per group). Leftovers hang
 * over at the end of the last full row, or (hangOver false) sit in a row of
 * their own under the groups. size 0 = all in one row.
 */
export function shareLayout(n: number, size: number, hangOver = true): Slot[] {
  if (size <= 0) return Array.from({ length: n }, (_, c) => ({ r: 0, c, left: false }));
  if (size > n) return Array.from({ length: n }, (_, c) => ({ r: 0, c, left: true }));
  const groups = Math.floor(n / size);
  const out: Slot[] = [];
  for (let g = 0; g < groups; g++) for (let c = 0; c < size; c++) out.push({ r: g, c, left: false });
  for (let k = 0; k < n - groups * size; k++) out.push(hangOver ? { r: groups - 1, c: size + k, left: true } : { r: groups, c: k, left: true });
  return out;
}

/** n split into `groups` equal groups (rows of floor(n/groups)), the rest left over. */
export function groupsLayout(n: number, groups: number): Slot[] {
  if (groups <= 1) return shareLayout(n, 0);
  return shareLayout(n, Math.floor(n / groups));
}

export const fits = (n: number, size: number) => size > 0 && n % size === 0;

// ------------------------------------------------------------------ briefing timeline

export type Badge = "fits" | "x" | "prime" | null;

export interface BriefBeat {
  at: number;
  n: number; // tiles shown
  groups: number; // 0/1 = one row
  badge: Badge;
  caption: string;
}

export const BRIEF_LOOP_MS = 11_000;

/** UX 8.2.3 briefing table. */
export function briefingBeats(): BriefBeat[] {
  const P = COPY.primes;
  return [
    { at: 300, n: 12, groups: 1, badge: null, caption: P.cookies(12) },
    { at: 1500, n: 12, groups: 3, badge: "fits", caption: P.shares },
    { at: 4000, n: 7, groups: 1, badge: null, caption: P.now7 },
    { at: 5200, n: 7, groups: 2, badge: "x", caption: P.leftOver(2) },
    { at: 6600, n: 7, groups: 3, badge: "x", caption: P.leftOver(3) },
    { at: 8200, n: 7, groups: 1, badge: "prime", caption: P.prime7 },
  ];
}

/** The beat in force at `ms` (null before the first). */
export function briefAt(beats: BriefBeat[], ms: number): BriefBeat | null {
  let cur: BriefBeat | null = null;
  for (const b of beats) if (b.at <= ms) cur = b;
  return cur;
}

// ------------------------------------------------------------------ plan timeline

export const CHECKERS = [3, 5, 7];
export const PLAN_LOOP_MS = 13_000;

export type Fate = "trying" | "out" | "prime";

export interface PlanBeat {
  at: number;
  n: number | null; // the candidate
  tried: boolean; // the checkers show their result
  fate: Fate;
  math: boolean; // the math line is written
}

/** UX 8.2.3 plan table: 9 (out), 11 (prime), 15 (out), then the math line. */
export function planBeats(): PlanBeat[] {
  return [
    { at: 300, n: 9, tried: false, fate: "trying", math: false },
    { at: 1500, n: 9, tried: true, fate: "trying", math: false },
    { at: 2600, n: 9, tried: true, fate: "out", math: false },
    { at: 4200, n: 11, tried: true, fate: "trying", math: false },
    { at: 5600, n: 11, tried: true, fate: "prime", math: false },
    { at: 7800, n: 15, tried: true, fate: "out", math: false },
    { at: 10_000, n: 15, tried: true, fate: "out", math: true },
  ];
}

export function planAt(beats: PlanBeat[], ms: number): PlanBeat | null {
  let cur: PlanBeat | null = null;
  for (const b of beats) if (b.at <= ms) cur = b;
  return cur;
}

/** Primes the plan has punched so far (cards on the punch). */
export function punchedBy(beats: PlanBeat[], ms: number): number[] {
  return beats.filter((b) => b.at <= ms && b.fate === "prime" && b.n !== null).map((b) => b.n!).filter((v, i, a) => a.indexOf(v) === i);
}

// ------------------------------------------------------------------ DOM

const BIG = 64, BIG_PITCH = 78; // briefing tiles
const SMALL = 22, SMALL_PITCH = 27; // checker tiles

/** A bell glyph, drawn (no emoji font on the kiosk). */
export function bell(): HTMLElement {
  return svgFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" class="bell" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><path d="M16 4c-5 0-8 4-8 9v6l-3 4h22l-3-4v-6c0-5-3-9-8-9z" fill="currentColor"/><circle cx="16" cy="26" r="3" fill="currentColor"/></svg>`,
  ) as unknown as HTMLElement;
}

function badgeEl(kind: Exclude<Badge, null>, label: string): HTMLElement {
  const glyph = kind === "fits" ? "✓" : kind === "x" ? "✕" : "★";
  return h("div", { class: `share-badge ${kind}`, "data-badge": kind }, h("span", { class: "glyph", "aria-hidden": "true" }, glyph), h("span", {}, label));
}

/** A figure on the stage: play() loops, showFinal() for reduced motion, stop() clears timers. */
export interface Figure {
  readonly el: HTMLElement;
  play(): void;
  showFinal(): void;
  stop(): void;
}

/** S3 briefing: cookies shared into equal groups (UX 8.2.3). */
export class SharingFigure implements Figure {
  readonly el: HTMLElement;
  private floor: HTMLElement;
  private tiles: HTMLElement[] = [];
  private caption: HTMLElement;
  private badge: HTMLElement;
  private groups: HTMLElement;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private beats = briefingBeats();

  constructor(reduceMotion: boolean) {
    this.floor = h("div", { class: "share-floor" });
    this.groups = h("div", { class: "share-groups" });
    this.floor.append(this.groups);
    for (let i = 0; i < 12; i++) {
      const t = h("div", { class: "share-tile", "data-i": i });
      this.tiles.push(t);
      this.floor.append(t);
    }
    this.badge = h("div", { class: "share-badge-slot" });
    this.caption = h("div", { class: "tiles-caption share-caption", "aria-live": "polite" });
    const kids: HTMLElement[] = [this.floor, this.badge, this.caption];
    if (!reduceMotion) kids.push(button(COPY.tiles.again, "light outline tiles-again", () => this.play()));
    this.el = h("div", { class: "tiles share share-briefing", "data-figure": "primes-briefing" }, ...kids);
  }

  play(): void {
    this.clear();
    this.el.classList.remove("still");
    this.apply(null);
    this.el.dataset.pass = String(Number(this.el.dataset.pass ?? 0) + 1);
    for (const b of this.beats) this.timers.push(setTimeout(() => this.apply(b), b.at));
    this.timers.push(setTimeout(() => this.play(), BRIEF_LOOP_MS));
  }

  /** Reduced motion: both examples side by side, finished. */
  showFinal(): void {
    this.clear();
    this.el.classList.add("still");
    this.floor.replaceChildren();
    this.badge.replaceChildren();
    const panel = (n: number, groups: number, b: Exclude<Badge, null>, label: string, caption: string) => {
      const box = h("div", { class: "share-still" });
      const fl = h("div", { class: "share-floor small" });
      const slots = groupsLayout(n, groups);
      slots.forEach((s, i) => {
        const t = h("div", { class: `share-tile on${s.left ? " left" : ""}${b === "prime" ? " prime" : ""}`, "data-i": i });
        t.style.left = `${s.c * BIG_PITCH}px`;
        t.style.top = `${s.r * BIG_PITCH}px`;
        fl.append(t);
      });
      fl.style.width = `${Math.max(...slots.map((s) => s.c + 1)) * BIG_PITCH}px`;
      fl.style.height = `${Math.max(...slots.map((s) => s.r + 1)) * BIG_PITCH}px`;
      box.append(fl, badgeEl(b, label), h("div", { class: "share-still-cap" }, caption));
      return box;
    };
    this.floor.append(
      panel(12, 3, "fits", COPY.primes.fits, COPY.primes.shares),
      panel(7, 2, "prime", "P", COPY.primes.prime7),
    );
    this.caption.textContent = "";
  }

  stop(): void {
    this.clear();
  }

  private clear(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  private apply(b: BriefBeat | null): void {
    const n = b?.n ?? 0;
    const slots = b ? groupsLayout(b.n, b.groups) : [];
    const cols = Math.max(1, ...slots.map((s) => s.c + 1));
    const rows = Math.max(1, ...slots.map((s) => s.r + 1));
    const x0 = (1360 - cols * BIG_PITCH) / 2, y0 = 300 - (rows * BIG_PITCH) / 2;
    this.tiles.forEach((t, i) => {
      const s = slots[i];
      t.classList.toggle("on", i < n);
      t.classList.toggle("left", !!s?.left && b?.badge === "x");
      t.classList.toggle("prime", b?.badge === "prime");
      t.classList.toggle("fit", b?.badge === "fits");
      if (s) {
        t.style.left = `${x0 + s.c * BIG_PITCH}px`;
        t.style.top = `${y0 + s.r * BIG_PITCH}px`;
      }
    });
    // Each equal group gets an outline (UX 8.2.3 "rows outlined").
    this.groups.replaceChildren();
    if (b && b.groups > 1) {
      const size = Math.floor(b.n / b.groups);
      for (let r = 0; r < b.groups; r++) {
        const g = h("div", { class: "share-group" });
        g.style.left = `${x0 - 8}px`;
        g.style.top = `${y0 + r * BIG_PITCH - 8}px`;
        g.style.width = `${size * BIG_PITCH - (BIG_PITCH - BIG) + 16}px`;
        g.style.height = `${BIG + 16}px`;
        this.groups.append(g);
      }
    }
    this.badge.replaceChildren();
    if (b?.badge === "fits") this.badge.append(badgeEl("fits", COPY.primes.fits));
    if (b?.badge === "x") this.badge.append(badgeEl("x", COPY.primes.left(b.n % Math.floor(b.n / b.groups))));
    if (b?.badge === "prime") this.badge.append(badgeEl("prime", "P"));
    this.caption.textContent = b?.caption ?? "";
  }
}

/** Step 0: three group checkers try 9, 11 and 15 (UX 8.2.3 plan canvas). */
export class CheckersFigure implements Figure {
  readonly el: HTMLElement;
  private cand: HTMLElement;
  private candTiles: HTMLElement;
  private fateEl: HTMLElement;
  private wheels: { k: number; el: HTMLElement; floor: HTMLElement; badge: HTMLElement }[] = [];
  private punch: HTMLElement;
  private math: HTMLElement;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private beats = planBeats();

  constructor(mathLine: string, reduceMotion: boolean) {
    this.candTiles = h("div", { class: "cand-tiles" });
    this.fateEl = h("div", { class: "cand-fate" });
    this.cand = h("div", { class: "cand" }, h("div", { class: "cand-num" }), this.candTiles, this.fateEl);
    const row = h("div", { class: "checkers" });
    for (const k of CHECKERS) {
      const floor = h("div", { class: "checker-floor" });
      const badge = h("div", { class: "checker-badge" });
      const el = h("div", { class: "checker", "data-k": k }, h("div", { class: "checker-title" }, COPY.primes.groupsOf(k)), floor, badge);
      row.append(el);
      this.wheels.push({ k, el, floor, badge });
    }
    row.append(h("div", { class: "checker-more" }, COPY.primes.more));
    this.punch = h("div", { class: "fig-punch" }, h("div", { class: "fig-punch-title" }, COPY.primes.punch));
    this.math = h("div", { class: "plan-math share-math" }, mathLine);
    const kids: HTMLElement[] = [h("div", { class: "fig-slowed" }, COPY.primes.slowed), this.cand, row, this.punch, this.math];
    if (!reduceMotion) kids.push(button(COPY.tiles.again, "light outline tiles-again", () => this.play()));
    this.el = h("div", { class: "tiles share share-plan", "data-figure": "primes-plan" }, ...kids);
  }

  play(): void {
    this.clear();
    this.el.classList.remove("still");
    this.apply(null, 0);
    this.el.dataset.pass = String(Number(this.el.dataset.pass ?? 0) + 1);
    for (const b of this.beats) this.timers.push(setTimeout(() => this.apply(b, b.at), b.at));
    this.timers.push(setTimeout(() => this.play(), PLAN_LOOP_MS));
  }

  /** Reduced motion: 11 tried by every checker, punched, the math line written. */
  showFinal(): void {
    this.clear();
    this.el.classList.add("still");
    this.apply({ at: 0, n: 11, tried: true, fate: "prime", math: true }, Infinity);
  }

  stop(): void {
    this.clear();
  }

  private clear(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  private apply(b: PlanBeat | null, ms: number): void {
    const n = b?.n ?? null;
    (this.cand.querySelector(".cand-num") as HTMLElement).textContent = n === null ? "" : COPY.primes.candidate(n);
    this.cand.dataset.fate = b?.fate ?? "trying";
    this.cand.classList.toggle("on", n !== null);
    this.candTiles.replaceChildren(...Array.from({ length: n ?? 0 }, () => h("div", { class: "cand-tile" })));
    this.fateEl.replaceChildren();
    if (b?.fate === "out") this.fateEl.append(badgeEl("x", COPY.primes.out));
    if (b?.fate === "prime") this.fateEl.append(badgeEl("prime", COPY.primes.prime));
    for (const w of this.wheels) {
      w.floor.replaceChildren();
      w.badge.replaceChildren();
      w.el.classList.toggle("trying", n !== null);
      const ok = n !== null && b!.tried && fits(n, w.k);
      w.el.classList.toggle("fit", ok);
      if (n === null || !b!.tried) continue;
      const slots = shareLayout(n, w.k, false);
      for (const s of slots) {
        const t = h("div", { class: `chk-tile${s.left ? " left" : ""}` });
        t.style.left = `${s.c * SMALL_PITCH}px`;
        t.style.top = `${s.r * SMALL_PITCH}px`;
        w.floor.append(t);
      }
      w.badge.append(ok ? h("div", { class: "fits-chip" }, bell(), COPY.primes.fitsBang) : badgeEl("x", COPY.primes.left(n % w.k)));
    }
    this.punch.querySelectorAll(".fig-card").forEach((c) => c.remove());
    for (const p of punchedBy(this.beats, ms)) this.punch.append(h("div", { class: "fig-card" }, String(p)));
    this.math.classList.toggle("on", !!b?.math);
  }
}
