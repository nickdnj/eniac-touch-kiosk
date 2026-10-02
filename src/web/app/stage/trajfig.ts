// Trajectory explained as connect-the-dots on a tile floor (UX 8.3.3): the
// same floor as Squares and Primes, as graph paper.
//
// Briefing: a cannon at the lower left; eight dots light one at a time along
// a rising and falling arc, each with a small card icon; then the arc is
// traced through them. Plan: one hop in four beats (the shell's speed
// arrow; the air makes it shorter; gravity bends it down; the dot hops and a
// card is punched; "still flying?"), then the beats repeat quicker.
//
// The dots and arrows are explanatory art, labelled "how it works, slowed
// down"; no number here is presented as machine output, and there are no
// units (no feet, no seconds) until they are fact-checked. Conventions as in
// stage/tiles.ts: pure timelines, final states applied on plain timers,
// transitions are decoration only, reduced motion shows the finished
// picture, meaning is never carried by colour alone.

import { h, s, svgFromString } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { COPY } from "../copy.ts";
import type { Figure } from "./primesfig.ts";

// ------------------------------------------------------------------ pure

/** The briefing's eight dots on a drag-flattened arc, figure coordinates (900 x 480). */
export function arcDots(n = 8, w = 760, h = 300, x0 = 110, y0 = 400): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    // A little steeper on the way down, like a shell slowed by the air.
    const y = 4 * t * (1 - t) * (1 - 0.25 * t);
    out.push({ x: x0 + t * w, y: y0 - (y / 0.75) * h });
  }
  return out;
}

export interface DotsBeat {
  at: number;
  dots: number; // dots lit
  traced: boolean; // the dashed arc
  caption: string;
}

export const DOTS_START = 400;
export const DOTS_GAP = 350;

/** UX 8.3.3 briefing: a dot every 350 ms with a count, then the traced arc. */
export function dotsBeats(n = 8): DotsBeat[] {
  const T = COPY.traj;
  const out: DotsBeat[] = [];
  for (let i = 1; i <= n; i++) out.push({ at: DOTS_START + i * DOTS_GAP, dots: i, traced: false, caption: T.dots(i) });
  const end = DOTS_START + (n + 1) * DOTS_GAP;
  out.push({ at: end, dots: n, traced: true, caption: T.joined });
  return out;
}
export const DOTS_LOOP_MS = 9000;

export type HopStage = "start" | "air" | "gravity" | "hop" | "check";

export interface HopBeat {
  at: number;
  stage: HopStage;
  hop: number; // 0-based hop being shown
}

/** UX 8.3.3 plan: one hop in four beats, then the beats repeat quicker for two more hops. */
export function hopBeats(): HopBeat[] {
  const first: [number, HopStage][] = [[300, "start"], [1800, "air"], [3400, "gravity"], [5000, "hop"], [6500, "check"]];
  const out: HopBeat[] = first.map(([at, stage]) => ({ at, stage, hop: 0 }));
  // Twice quicker for hops 2 and 3.
  for (let hop = 1; hop <= 2; hop++) {
    const base = 7600 + (hop - 1) * 2200;
    (["start", "air", "gravity", "hop", "check"] as HopStage[]).forEach((stage, k) => out.push({ at: base + k * 420, stage, hop }));
  }
  return out;
}
export const HOP_LOOP_MS = 12_000;

export function beatAt<T extends { at: number }>(beats: T[], ms: number): T | null {
  let cur: T | null = null;
  for (const b of beats) if (b.at <= ms) cur = b;
  return cur;
}

// ------------------------------------------------------------------ DOM

const FIG_W = 900, FIG_H = 480;

function floorSvg(): string {
  let g = "";
  for (let x = 0; x <= FIG_W; x += 60) g += `<path d="M${x} 0V${FIG_H}" class="gp-line"/>`;
  for (let y = 0; y <= FIG_H; y += 60) g += `<path d="M0 ${y}H${FIG_W}" class="gp-line"/>`;
  return g;
}

/** A cannon at (x, y), drawn (no emoji). */
function cannon(x: number, y: number): string {
  return `<g class="cannon"><g transform="rotate(-38 ${x} ${y})"><rect x="${x - 6}" y="${y - 14}" width="78" height="22" rx="6"/></g><circle cx="${x}" cy="${y + 6}" r="20"/><circle cx="${x}" cy="${y + 6}" r="7" class="hub"/></g>`;
}

/** A small card glyph (cut corner). */
function cardGlyph(x: number, y: number, cls = "card-glyph"): string {
  return `<path class="${cls}" d="M${x + 5} ${y}H${x + 28}V${y + 20}H${x}V${y + 5}Z"/>`;
}

/** S3 briefing: the dots appear. */
export class DotsFigure implements Figure {
  readonly el: HTMLElement;
  private svg: SVGSVGElement;
  private caption: HTMLElement;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private beats = dotsBeats();
  private pts = arcDots();

  constructor(reduceMotion: boolean) {
    let b = `<g class="gp">${floorSvg()}</g><path d="M30 ${400 + 6}H${FIG_W - 20}" class="ground"/>`;
    b += cannon(70, 392);
    const path = this.pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
    b += `<path d="M86 380${path.replace(/^M/, "L")}" class="arc-trace"/>`;
    this.pts.forEach((p, i) => {
      b += `<g class="dot" data-i="${i}"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="14"/>${cardGlyph(p.x + 14, p.y - 40)}</g>`;
    });
    this.svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="traj-fig" viewBox="0 0 ${FIG_W} ${FIG_H}" width="${FIG_W}" height="${FIG_H}">${b}</svg>`);
    this.caption = h("div", { class: "tiles-caption traj-caption", "aria-live": "polite" });
    const kids: HTMLElement[] = [this.svg as unknown as HTMLElement, this.caption];
    if (!reduceMotion) kids.push(button(COPY.tiles.again, "light outline tiles-again", () => this.play()));
    this.el = h("div", { class: "tiles traj traj-briefing", "data-figure": "traj-briefing" }, ...kids);
  }

  play(): void {
    this.clear();
    this.el.classList.remove("still");
    this.apply(null);
    this.el.dataset.pass = String(Number(this.el.dataset.pass ?? 0) + 1);
    for (const b of this.beats) this.timers.push(setTimeout(() => this.apply(b), b.at));
    this.timers.push(setTimeout(() => this.play(), DOTS_LOOP_MS));
  }

  showFinal(): void {
    this.clear();
    this.el.classList.add("still");
    this.apply(this.beats[this.beats.length - 1]);
  }

  stop(): void {
    this.clear();
  }

  private clear(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  private apply(b: DotsBeat | null): void {
    this.svg.querySelectorAll<SVGGElement>(".dot").forEach((d, i) => d.classList.toggle("on", !!b && i < b.dots));
    this.svg.querySelector(".arc-trace")?.classList.toggle("on", !!b?.traced);
    this.caption.textContent = b?.caption ?? "";
  }
}

/** Step 0: one hop in four beats (UX 8.3.3 plan canvas). */
export class HopFigure implements Figure {
  readonly el: HTMLElement;
  private svg: SVGSVGElement;
  private labels: HTMLElement;
  private card: HTMLElement;
  private math: HTMLElement;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private beats = hopBeats();

  /** Spots A, B, C, D of three hops (explanatory art). */
  static readonly SPOTS = [
    { x: 150, y: 330 },
    { x: 360, y: 210 },
    { x: 560, y: 150 },
    { x: 750, y: 150 },
  ];

  constructor(mathLine: string, reduceMotion: boolean) {
    let b = `<g class="gp">${floorSvg()}</g><path d="M30 406H${FIG_W - 20}" class="ground"/>`;
    b += `<g class="trail"></g><g class="shell"><circle r="16"/></g>`;
    b += `<g class="speed"><path class="arrow" d="M0 0L150 -80"/><path class="arrow-head" d="M150 -80l-22 -2l10 18z"/></g>`;
    this.svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="traj-fig" viewBox="0 0 ${FIG_W} ${FIG_H}" width="${FIG_W}" height="${FIG_H}">${b}</svg>`);
    this.labels = h("div", { class: "hop-labels" });
    this.card = h("div", { class: "hop-card" });
    this.math = h("div", { class: "plan-math share-math traj-math" }, mathLine);
    const kids: HTMLElement[] = [h("div", { class: "fig-slowed" }, COPY.primes.slowed), this.svg as unknown as HTMLElement, this.labels, this.card, this.math];
    if (!reduceMotion) kids.push(button(COPY.tiles.again, "light outline tiles-again", () => this.play()));
    this.el = h("div", { class: "tiles traj traj-plan", "data-figure": "traj-plan" }, ...kids);
  }

  play(): void {
    this.clear();
    this.el.classList.remove("still");
    this.apply(null);
    this.el.dataset.pass = String(Number(this.el.dataset.pass ?? 0) + 1);
    for (const b of this.beats) this.timers.push(setTimeout(() => this.apply(b), b.at));
    this.timers.push(setTimeout(() => this.play(), HOP_LOOP_MS));
  }

  /** Reduced motion: three hops done, the card punched, the line written. */
  showFinal(): void {
    this.clear();
    this.el.classList.add("still");
    this.apply({ at: 0, stage: "check", hop: 2 });
  }

  stop(): void {
    this.clear();
  }

  private clear(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  private apply(b: HopBeat | null): void {
    const T = COPY.traj;
    const spots = HopFigure.SPOTS;
    const hop = b?.hop ?? 0;
    const landedOn = b && (b.stage === "hop" || b.stage === "check") ? hop + 1 : hop;
    const at = spots[Math.min(landedOn, spots.length - 1)];
    const shell = this.svg.querySelector<SVGGElement>(".shell")!;
    shell.setAttribute("transform", `translate(${at.x} ${at.y})`);
    shell.classList.toggle("on", !!b);
    // The trail: the dots already visited (one card each).
    const trail = this.svg.querySelector(".trail")!;
    trail.replaceChildren();
    for (let i = 0; i < landedOn; i++) trail.append(s("circle", { cx: spots[i].x, cy: spots[i].y, r: 10, class: "trail-dot" }));
    // The speed arrow: full, shorter (air), bent down (gravity).
    const speed = this.svg.querySelector<SVGGElement>(".speed")!;
    const stage = b?.stage ?? null;
    const len = stage === "air" ? 0.7 : stage === "gravity" ? 0.7 : 1;
    const bend = stage === "gravity" ? 22 : 0;
    speed.setAttribute("transform", `translate(${at.x} ${at.y}) rotate(${bend}) scale(${len})`);
    speed.classList.toggle("on", stage === "start" || stage === "air" || stage === "gravity");
    speed.dataset.stage = stage ?? "";
    // Labels: words and glyphs, not colour alone.
    this.labels.replaceChildren();
    const label = (cls: string, glyph: string, text: string) => h("div", { class: `hop-label ${cls}` }, h("span", { class: "glyph", "aria-hidden": "true" }, glyph), text);
    if (stage === "air") this.labels.append(label("air", "≋", T.air));
    if (stage === "gravity") this.labels.append(label("gravity", "↓", T.gravity));
    if (stage === "hop") this.labels.append(label("hop", "✓", T.punched));
    if (stage === "check") this.labels.append(label("check", "✓", T.stillFlying));
    this.card.classList.toggle("on", landedOn > 0);
    this.card.textContent = landedOn > 0 ? T.card(landedOn) : "";
    this.math.classList.toggle("on", !!b && (b.hop >= 2 && b.stage === "check"));
  }
}
