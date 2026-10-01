// Squares as tiles on a floor (docs/handoff-squares-tiles.md): the briefing
// and plan figures on the stage.
//
// Briefing: 9 tiles light one at a time with a counting caption, then loop.
// Plan: a 4x4 grid grows from the 3x3 base by a row, a column and a corner;
// each piece lights its own term of content.plan.math. Each piece also has a
// text label ("+3", "+3", "+1") so meaning is not carried by colour alone
// (UX 6.4).
//
// The timelines are pure data (unit-tested). The DOM figure applies each
// beat's final state with a class toggle on a plain timer; CSS transitions
// are decoration only, so a throttled browser can never stall the figure or
// anything after it (ui/anim.ts rule).

import { h } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { COPY } from "../copy.ts";

export type Part = "base" | "row" | "col" | "corner";
export type Term = Part | "total";
export const TERMS: Term[] = ["base", "row", "col", "corner", "total"];

/** Side of the starting square (3 x 3 = 9). */
export const N = 3;

export interface Tile {
  r: number;
  c: number;
  part: Part;
}

/** Tiles of an n x n square grown to (n+1) x (n+1), in lighting order. */
export function grownGrid(n = N): Tile[] {
  const out: Tile[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out.push({ r, c, part: "base" });
  for (let c = 0; c < n; c++) out.push({ r: n, c, part: "row" }); // bottom row, left to right
  for (let r = 0; r < n; r++) out.push({ r, c: n, part: "col" }); // right column, top to bottom
  out.push({ r: n, c: n, part: "corner" });
  return out;
}

/** One moment in a timeline: tiles (indices) and terms that light, a caption. */
export interface Beat {
  at: number;
  tiles?: number[];
  terms?: Term[];
  labels?: Part[];
  caption?: string;
}

export interface Timeline {
  beats: Beat[];
  /** The figure restarts from empty at this time. */
  loopMs: number;
}

/** Briefing: a tile every 350 ms, counting, then the two summary captions. */
export const BRIEF_START = 400;
export const BRIEF_GAP = 350;
export function briefingTimeline(n = N): Timeline {
  const beats: Beat[] = [];
  const total = n * n;
  for (let i = 0; i < total; i++) beats.push({ at: BRIEF_START + (i + 1) * BRIEF_GAP, tiles: [i], caption: COPY.tiles.count(i + 1) });
  const done = BRIEF_START + (total + 1) * BRIEF_GAP;
  beats.push({ at: done, caption: COPY.tiles.rows(n) });
  beats.push({ at: done + 1600, caption: COPY.tiles.square(n) });
  return { beats, loopMs: done + 5000 };
}

/** Plan: the beat table of the handoff (base, row, column, corner, = 16). */
export const PLAN_LOOP_MS = 11_000;
export function planTimeline(n = N): Timeline {
  const grid = grownGrid(n);
  const idx = (p: Part) => grid.flatMap((t, i) => (t.part === p ? [i] : []));
  const base = idx("base"), row = idx("row"), col = idx("col"), corner = idx("corner");
  const beats: Beat[] = [
    { at: 300, tiles: base },
    { at: 500, terms: ["base"] },
    ...row.map((t, i) => ({ at: 1800 + i * 250, tiles: [t], ...(i === 0 ? { terms: ["row" as Term], labels: ["row" as Part] } : {}) })),
    ...col.map((t, i) => ({ at: 3600 + i * 250, tiles: [t], ...(i === 0 ? { terms: ["col" as Term], labels: ["col" as Part] } : {}) })),
    { at: 5400, tiles: corner, terms: ["corner"], labels: ["corner"] },
    { at: 6600, terms: ["total"] },
  ];
  return { beats, loopMs: PLAN_LOOP_MS };
}

export interface FigureState {
  tiles: Set<number>;
  terms: Set<Term>;
  labels: Set<Part>;
  caption: string;
}

/** The figure's state at `ms` into one pass (ms >= loopMs is the end state). */
export function stateAt(tl: Timeline, ms: number): FigureState {
  const s: FigureState = { tiles: new Set(), terms: new Set(), labels: new Set(), caption: "" };
  for (const b of tl.beats) {
    if (b.at > ms) break;
    b.tiles?.forEach((t) => s.tiles.add(t));
    b.terms?.forEach((t) => s.terms.add(t));
    b.labels?.forEach((l) => s.labels.add(l));
    if (b.caption !== undefined) s.caption = b.caption;
  }
  return s;
}

/** The finished picture (reduced motion). */
export function finalState(tl: Timeline): FigureState {
  return stateAt(tl, Number.POSITIVE_INFINITY);
}

/**
 * Splits the plan math ("9 + 3 + 3 + 1 = 16") into tokens and gives each
 * number its term in order. Null if it is not exactly five numbers, in which
 * case the plan shows the math plainly.
 */
export function mathTerms(math: string): { text: string; term: Term | null }[] | null {
  const tokens = math.trim().split(/\s+/).filter(Boolean);
  const nums = tokens.filter((t) => /^\d+$/.test(t));
  if (nums.length !== TERMS.length) return null;
  let k = 0;
  return tokens.map((text) => ({ text, term: /^\d+$/.test(text) ? TERMS[k++] : null }));
}

// ------------------------------------------------------------------ DOM

const PITCH = 112; // tile 100 px + 12 px gap
const TILE = 100;

/** A tile figure on the stage. play() loops; stop() clears every timer. */
export class TileFigure {
  readonly el: HTMLElement;
  private tiles: HTMLElement[] = [];
  private terms = new Map<Term, HTMLElement>();
  private labels = new Map<Part, HTMLElement>();
  private caption: HTMLElement | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

  readonly kind: "briefing" | "plan";
  private readonly tl: Timeline;

  private constructor(kind: "briefing" | "plan", tl: Timeline, tiles: Tile[], extra: (fig: TileFigure, grid: HTMLElement) => HTMLElement[]) {
    this.kind = kind;
    this.tl = tl;
    const side = Math.max(...tiles.map((t) => Math.max(t.r, t.c))) + 1;
    const grid = h("div", { class: "tiles-grid" });
    grid.style.width = grid.style.height = `${side * PITCH - (PITCH - TILE)}px`;
    for (const [i, t] of tiles.entries()) {
      const d = h("div", { class: `tile ${t.part}`, "data-i": i, "data-part": t.part });
      d.style.left = `${t.c * PITCH}px`;
      d.style.top = `${t.r * PITCH}px`;
      grid.append(d);
      this.tiles.push(d);
    }
    this.el = h("div", { class: `tiles tiles-${kind}`, "data-figure": kind }, ...extra(this, grid));
  }

  /** S3: 9 tiles and a caption. */
  static briefing(): TileFigure {
    const tl = briefingTimeline();
    const tiles = grownGrid().filter((t) => t.part === "base");
    return new TileFigure("briefing", tl, tiles, (fig, grid) => {
      fig.caption = h("div", { class: "tiles-caption", "aria-live": "polite" });
      return [grid, fig.caption];
    });
  }

  /** Step 0: the grown grid, its labels, the equation and Again. Null if the math does not fit. */
  static plan(math: string, reduceMotion: boolean): TileFigure | null {
    const terms = mathTerms(math);
    if (!terms) return null;
    const tl = planTimeline();
    return new TileFigure("plan", tl, grownGrid(), (fig, grid) => {
      // Second cue beside colour (UX 6.4): +3 left of the row, +3 above the
      // column, +1 right of the corner.
      const at = (p: Part, x: number, y: number, text: string) => {
        const l = h("div", { class: `tile-label ${p}`, "data-part": p }, text);
        l.style.left = `${x}px`;
        l.style.top = `${y}px`;
        fig.labels.set(p, l);
        grid.append(l);
      };
      at("row", -96, N * PITCH, COPY.tiles.plus(N));
      at("col", N * PITCH, -80, COPY.tiles.plus(N));
      at("corner", (N + 1) * PITCH, N * PITCH, COPY.tiles.plus(1));
      const eq = h("div", { class: "tiles-eq" });
      for (const t of terms) {
        const span = h("span", t.term ? { class: `term ${t.term}`, "data-term": t.term } : { class: "op" }, t.text);
        if (t.term) fig.terms.set(t.term, span);
        eq.append(span);
      }
      const out: HTMLElement[] = [grid, eq];
      if (!reduceMotion) out.push(button(COPY.tiles.again, "light outline tiles-again", () => fig.play()));
      return out;
    });
  }

  /** Starts (or restarts) the loop from an empty figure. */
  play(): void {
    this.clearTimers();
    this.apply(stateAt(this.tl, -1));
    this.el.dataset.pass = String(Number(this.el.dataset.pass ?? 0) + 1);
    for (const b of this.tl.beats) this.timers.push(setTimeout(() => this.apply(stateAt(this.tl, b.at)), b.at));
    this.timers.push(setTimeout(() => this.play(), this.tl.loopMs));
  }

  /** The finished picture, no timers (reduced motion). */
  showFinal(): void {
    this.clearTimers();
    this.el.classList.add("still");
    this.apply(finalState(this.tl));
  }

  stop(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  private apply(s: FigureState): void {
    this.tiles.forEach((t, i) => t.classList.toggle("on", s.tiles.has(i)));
    for (const [k, el] of this.terms) el.classList.toggle("lit", s.terms.has(k));
    for (const [k, el] of this.labels) el.classList.toggle("on", s.labels.has(k));
    if (this.caption) this.caption.textContent = s.caption;
  }
}
