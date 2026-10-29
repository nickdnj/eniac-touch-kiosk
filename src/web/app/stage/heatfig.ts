// Top Secret's front of house: a classified manila folder, a red stamp and a rod of heat bars.
// The title figure plays the whole idea on an 8 s loop: the heat starts in the middle cell and
// every step spreads it out, using the real numbers the program prints (1; 1 2 1; 1 4 6 4 1;
// 7 15 20 15 7; 36 57 70 57 36). The plan figure shows the one rule ENIAC repeats; the picker
// card is the stamped folder. Flat SVG. The mission is a labelled stand-in, so the art says so.

import { h, svgFromString } from "../ui/dom.ts";
import type { Figure } from "./primesfig.ts";

const NIGHT = "#15171B";
const MANILA = "#D9C089";
const MANILA2 = "#C4A96B";
const INK = "#1D1A12";
const RED = "#B8322A";
const HEAT = "#FFB000";
const HOT = "#FF6A2B";
const CREAM = "#F4EFE3";
const W = 1360;
const H = 904;

/** The rows the program really prints, one per INIT (5 cells of an 11-cell rod). */
const ROWS = [
  [0, 0, 1, 0, 0],
  [0, 1, 2, 1, 0],
  [1, 4, 6, 4, 1],
  [7, 15, 20, 15, 7],
  [36, 57, 70, 57, 36],
];

/** A red rubber stamp, slightly rotated. */
function stamp(cx: number, cy: number, text: string, rot: number, size = 1): string {
  const w = 440 * size;
  const hgt = 100 * size;
  return (
    `<g transform="translate(${cx} ${cy}) rotate(${rot})">` +
    `<rect x="${-w / 2}" y="${-hgt / 2}" width="${w}" height="${hgt}" rx="8" fill="none" stroke="${RED}" stroke-width="${8 * size}"/>` +
    `<text x="0" y="${24 * size}" text-anchor="middle" class="bs-stamp" fill="${RED}" style="font-size:${72 * size}px">${text}</text>` +
    `</g>`
  );
}

/** The five bars of one row, normalised to its own tallest cell, with the numbers above them. */
function bars(row: number[], x0: number, base: number, maxH: number, gap: number, bw: number): string {
  const top = Math.max(...row, 1);
  let s = "";
  row.forEach((v, i) => {
    const bh = v === 0 ? 6 : Math.max(14, (v / top) * maxH);
    const x = x0 + i * (bw + gap);
    const fill = v === 0 ? MANILA2 : v === top ? HOT : HEAT;
    s += `<rect x="${x}" y="${base - bh}" width="${bw}" height="${bh}" rx="8" fill="${fill}" stroke="${INK}" stroke-width="5"/>`;
    s += `<text x="${x + bw / 2}" y="${base - bh - 16}" text-anchor="middle" class="gf-ribbon" fill="${INK}">${v}</text>`;
  });
  return s;
}

const DUR = 10;

export class HeatBriefFigure implements Figure {
  readonly el: HTMLElement;
  private svg: SVGSVGElement;

  constructor(_reduceMotion: boolean) {
    let b = `<rect width="${W}" height="${H}" rx="8" fill="${NIGHT}"/>`;
    // The folder: a tab, the body, and the label.
    b += `<path d="M110 150H470L520 100H800L850 150H1250V820H110Z" fill="${MANILA}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`;
    b += `<text x="680" y="92" text-anchor="middle" class="gf-kicker" fill="${HEAT}">LOS ALAMOS  ·  1945  ·  A STAND-IN</text>`;
    b += `<text x="680" y="262" text-anchor="middle" class="bs-title army-title" fill="${INK}">TOP SECRET</text>`;
    b += stamp(1040, 330, "CLASSIFIED", -9, 0.8);
    // The rod: a slab the bars stand on.
    b += `<rect x="260" y="640" width="840" height="26" rx="6" fill="${INK}"/>`;
    const bw = 130;
    const gap = 40;
    const x0 = 680 - (5 * bw + 4 * gap) / 2;
    ROWS.forEach((row, k) => {
      const a = k / ROWS.length;
      const z = (k + 1) / ROWS.length;
      const eps = 0.005;
      const kt = k === 0 ? `0;${z - eps};${z};1` : `0;${a};${a + eps};${z - eps};${z};1`;
      const vals = k === 0 ? "1;1;0;0" : "0;0;1;1;0;0";
      const last = k === ROWS.length - 1;
      const kt2 = last ? `0;${a};${a + eps};1` : kt;
      const vals2 = last ? "0;0;1;1" : vals;
      b += `<g opacity="0">${bars(row, x0, 636, 250, gap, bw)}<animate attributeName="opacity" values="${vals2}" keyTimes="${kt2}" dur="${DUR}s" repeatCount="indefinite"/></g>`;
    });
    // The step counter under the rod.
    ROWS.forEach((_, k) => {
      const a = k / ROWS.length;
      const z = (k + 1) / ROWS.length;
      const eps = 0.005;
      const kt = k === 0 ? `0;${z - eps};${z};1` : k === ROWS.length - 1 ? `0;${a};${a + eps};1` : `0;${a};${a + eps};${z - eps};${z};1`;
      const vals = k === 0 ? "1;1;0;0" : k === ROWS.length - 1 ? "0;0;1;1" : "0;0;1;1;0;0";
      b += `<text x="680" y="720" text-anchor="middle" class="gf-ribbon" fill="${INK}" opacity="0">STEP ${k + 1} OF ${ROWS.length}<animate attributeName="opacity" values="${vals}" keyTimes="${kt}" dur="${DUR}s" repeatCount="indefinite"/></text>`;
    });
    b += `<text x="680" y="780" text-anchor="middle" class="gf-small" fill="${INK}">EVERY STEP THE HEAT SPREADS OUT. ENIAC ONLY ADDS.</text>`;
    this.svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="gunnery-title-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${b}</svg>`);
    this.el = h("div", { class: "gunnery-title heat-title-fig", "data-figure": "heat-title" }, this.svg as unknown as HTMLElement);
  }

  private clock(): { pauseAnimations?: () => void; unpauseAnimations?: () => void; setCurrentTime?: (t: number) => void } {
    return this.svg as unknown as ReturnType<HeatBriefFigure["clock"]>;
  }

  play(): void {
    this.el.classList.remove("still");
    this.clock().unpauseAnimations?.();
  }

  showFinal(): void {
    this.el.classList.add("still");
    this.clock().pauseAnimations?.();
    this.clock().setCurrentTime?.(DUR * 0.95);
  }

  stop(): void {
    this.clock().pauseAnimations?.();
  }
}

/** The plan figure: the one rule, three neighbours added into the next cell. */
export class HeatPlanFigure implements Figure {
  readonly el: HTMLElement;
  constructor(_math: string, _reduceMotion: boolean) {
    const cell = (x: number, y: number, label: string, v: string, hot: boolean) =>
      `<rect x="${x}" y="${y}" width="240" height="200" rx="18" fill="${hot ? HEAT : MANILA}" stroke="${INK}" stroke-width="8"/>` +
      `<text x="${x + 120}" y="${y + 84}" text-anchor="middle" class="gf-pop" fill="${INK}">${v}</text>` +
      `<text x="${x + 120}" y="${y + 160}" text-anchor="middle" class="gf-small" fill="${INK}" style="font-size:${label.length > 12 ? 20 : 28}px">${label}</text>`;
    let b = `<rect width="${W}" height="${H}" rx="8" fill="${NIGHT}"/>`;
    b += `<text x="680" y="110" text-anchor="middle" class="gf-kicker" fill="${HEAT}">ONE RULE  ·  1 + 2 × 2 + 1 = 6</text>`;
    b += cell(150, 200, "LEFT", "1", false);
    b += cell(560, 200, "ME  (COUNT IT TWICE)", "2", true);
    b += cell(970, 200, "RIGHT", "1", false);
    b += `<text x="445" y="320" text-anchor="middle" class="gf-pop" fill="${CREAM}">+</text><text x="855" y="320" text-anchor="middle" class="gf-pop" fill="${CREAM}">+</text>`;
    b += `<path d="M680 430V560" stroke="${CREAM}" stroke-width="10" stroke-linecap="round"/><path d="M650 536L680 580L710 536" fill="none" stroke="${CREAM}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
    b += `<rect x="560" y="600" width="240" height="200" rx="18" fill="${HOT}" stroke="${INK}" stroke-width="8"/>`;
    b += `<text x="680" y="684" text-anchor="middle" class="gf-pop" fill="${INK}">6</text><text x="680" y="760" text-anchor="middle" class="gf-small" fill="${INK}">ME, NEXT STEP</text>`;
    b += `<text x="1010" y="716" text-anchor="start" class="gf-small" fill="${CREAM}">ENIAC ONLY ADDS.</text>`;
    const svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="gunnery-title-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${b}</svg>`);
    this.el = h("div", { class: "gunnery-title gunnery-plan heat-title-fig", "data-figure": "heat-plan" }, svg as unknown as HTMLElement);
  }
  play(): void {}
  showFinal(): void {}
  stop(): void {}
}

/** The picker card picture (480 x 200): a manila folder with a stamp and a few bars. */
export function heatPicker(): string {
  let b = `<path d="M20 36H150L166 20H260L276 36H460V186H20Z" fill="${MANILA}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
  b += `<text x="214" y="84" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="36" letter-spacing="2" fill="${INK}">TOP SECRET</text>`;
  const vs = [36, 57, 70, 57, 36];
  vs.forEach((v, i) => {
    const bh = (v / 70) * 52;
    b += `<rect x="${112 + i * 54}" y="${176 - bh}" width="40" height="${bh}" rx="4" fill="${v === 70 ? HOT : HEAT}" stroke="${INK}" stroke-width="3"/>`;
  });
  b += `<g transform="translate(398 112) rotate(-10)"><rect x="-58" y="-16" width="116" height="32" rx="4" fill="none" stroke="${RED}" stroke-width="3"/><text x="0" y="8" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="20" fill="${RED}">STAND-IN</text></g>`;
  return b;
}
