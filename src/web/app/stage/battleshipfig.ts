// Battleship's front of house: the look of the old board-game TV commercials. A deep navy
// room, the ten-by-ten ocean grid with lettered columns, grey warships, red and white
// pegs, a starburst when a shell lands on the enemy ship. Flat SVG.
// The title figure (S3 briefing) lobs a shell from your ship at the enemy's on a loop and
// shows today's best score; the plan figure shows the three choices (ship, gun, angle); the
// picker card is a small banner over a grid.

import { h, svgFromString } from "../ui/dom.ts";
import type { Figure } from "./primesfig.ts";
import { fillBest, scorePlate } from "./scoreplate.ts";

const NAVY = "#0B2545";
const SEA = "#1B4E8C";
const SEA2 = "#2B66AE";
const CREAM = "#F4EFE3";
const RED = "#E0312B";
const GREY = "#8A93A0";
const GREY2 = "#B7BEC8";
const YELLOW = "#FFD23F";
const INK = "#10161F";

const W = 1360;
const H = 904;

/** A warship in profile, bow to the right: hull, bridge, funnels, turrets with guns. `len` is the hull length. */
function warship(x: number, y: number, len: number, guns: number, aim = 0): string {
  const k = len / 300;
  let s = `<g transform="translate(${x} ${y}) scale(${k})">`;
  s += `<path d="M-150 -34H152L120 14H-122Z" fill="${GREY}" stroke="${INK}" stroke-width="${5 / k}" stroke-linejoin="round"/>`;
  s += `<rect x="-52" y="-84" width="104" height="52" rx="5" fill="${GREY2}" stroke="${INK}" stroke-width="${5 / k}"/>`;
  s += `<rect x="-20" y="-124" width="44" height="42" rx="5" fill="${GREY2}" stroke="${INK}" stroke-width="${5 / k}"/>`;
  s += `<rect x="-40" y="-110" width="14" height="30" fill="${RED}" stroke="${INK}" stroke-width="${4 / k}"/><rect x="32" y="-110" width="14" height="30" fill="${RED}" stroke="${INK}" stroke-width="${4 / k}"/>`;
  s += `<line x1="2" y1="-124" x2="2" y2="-168" stroke="${CREAM}" stroke-width="${5 / k}"/>`;
  const turret = (tx: number) => `<g transform="translate(${tx} -40)"><g transform="rotate(${-aim})"><rect x="0" y="-5" width="${guns > 1 ? 70 : 56}" height="10" rx="3" fill="${INK}"/>${guns > 1 ? `<rect x="0" y="-18" width="70" height="10" rx="3" fill="${INK}"/>` : ""}</g><circle r="22" fill="${GREY2}" stroke="${INK}" stroke-width="${5 / k}"/></g>`;
  s += turret(-100) + turret(92);
  return s + `</g>`;
}

/** The ten-by-ten ocean: lettered columns, numbered rows, and a few pegs. */
function ocean(x: number, y: number, w: number, hgt: number): string {
  const cols = 10;
  const rows = 5;
  const cw = w / cols;
  const rh = hgt / rows;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="${SEA}" stroke="${CREAM}" stroke-width="6"/>`;
  for (let i = 1; i < cols; i++) s += `<line x1="${x + i * cw}" y1="${y}" x2="${x + i * cw}" y2="${y + hgt}" stroke="${SEA2}" stroke-width="3"/>`;
  for (let j = 1; j < rows; j++) s += `<line x1="${x}" y1="${y + j * rh}" x2="${x + w}" y2="${y + j * rh}" stroke="${SEA2}" stroke-width="3"/>`;
  for (let i = 0; i < cols; i++) s += `<text x="${x + i * cw + cw / 2}" y="${y - 12}" text-anchor="middle" class="bs-coord" fill="${CREAM}">${"ABCDEFGHIJ"[i]}</text>`;
  const pegs: [number, number, string][] = [[2, 1, CREAM], [4, 3, CREAM], [5, 0, CREAM], [7, 2, CREAM], [1, 3, RED], [3, 0, CREAM], [8, 4, CREAM]];
  for (const [c, r, fill] of pegs) s += `<circle cx="${x + c * cw + cw / 2}" cy="${y + r * rh + rh / 2}" r="13" fill="${fill}" stroke="${INK}" stroke-width="4"/>`;
  return s;
}

function stripes(x: number, y: number, w: number): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="10" fill="${CREAM}"/><rect x="${x}" y="${y + 14}" width="${w}" height="10" fill="${RED}"/>`;
}

function starburst(cx: number, cy: number, r1: number, r2: number, n: number, fill: string): string {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? r1 : r2;
    d += `${i ? "L" : "M"}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
}

export class BattleshipTitleFigure implements Figure {
  readonly el: HTMLElement;
  private svg: SVGSVGElement;

  constructor(_reduceMotion: boolean) {
    const arc = "M360 540 Q 700 210 1010 600";
    let b = `<rect width="${W}" height="${H}" rx="8" fill="${NAVY}"/>`;
    b += `<g fill="none" stroke="${SEA}" stroke-width="3" opacity=".5">${[200, 340, 480, 620, 760].map((r) => `<circle cx="680" cy="430" r="${r}"/>`).join("")}</g>`;
    // The title.
    b += `<rect x="120" y="40" width="1120" height="230" rx="14" fill="${RED}" stroke="${CREAM}" stroke-width="8"/>` + stripes(150, 60, 1060) + stripes(150, 218, 1060);
    b += `<text x="680" y="204" text-anchor="middle" class="bs-title" fill="${INK}" transform="translate(8 8)">BATTLESHIP</text><text x="680" y="204" text-anchor="middle" class="bs-title" fill="${CREAM}" stroke="${INK}">BATTLESHIP</text>`;
    b += `<text x="680" y="30" text-anchor="middle" class="gf-kicker" fill="${YELLOW}">ENIAC  ·  1946</text>`;
    // The sea, with the two ships.
    b += ocean(120, 330, 1120, 360);
    b += warship(310, 650, 340, 2, 32);
    b += `<circle class="bs-flash" cx="470" cy="560" r="44" fill="${YELLOW}" opacity="0"><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.03;0.12;1" dur="3.6s" repeatCount="indefinite"/></circle>`;
    b += warship(1020, 650, 220, 1, 0);
    b += `<path d="${arc}" fill="none" stroke="${CREAM}" stroke-width="6" stroke-dasharray="4 22" stroke-linecap="round" opacity=".9"/>`;
    b += `<circle r="14" fill="${YELLOW}" stroke="${INK}" stroke-width="5"><animateMotion dur="3.6s" repeatCount="indefinite" path="${arc}" keyPoints="0;1;1" keyTimes="0;0.78;1" calcMode="linear"/></circle>`;
    b += `<g class="bs-boom"><g transform="translate(1010 590)">${starburst(0, 0, 50, 104, 11, RED)}${starburst(0, 0, 30, 66, 9, YELLOW)}</g><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.78;0.8;0.95;1" dur="3.6s" repeatCount="indefinite"/></g>`;
    b += `<g transform="translate(1010 470) rotate(-8)"><rect x="-150" y="-44" width="300" height="88" rx="8" fill="${CREAM}" stroke="${RED}" stroke-width="8"/><text x="0" y="22" text-anchor="middle" class="bs-stamp" fill="${RED}">SUNK!</text><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.82;0.86;0.96;1" dur="3.6s" repeatCount="indefinite"/></g>`;
    b += scorePlate("3 SHIPS · 6 GUNS");
    this.svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="gunnery-title-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${b}</svg>`);
    this.el = h("div", { class: "gunnery-title battleship-title", "data-figure": "battleship-title" }, this.svg as unknown as HTMLElement);
    void fillBest(this.svg, "battleship");
  }

  private clock(): { pauseAnimations?: () => void; unpauseAnimations?: () => void; setCurrentTime?: (t: number) => void } {
    return this.svg as unknown as ReturnType<BattleshipTitleFigure["clock"]>;
  }

  play(): void {
    this.el.classList.remove("still");
    this.clock().unpauseAnimations?.();
  }

  showFinal(): void {
    this.el.classList.add("still");
    this.clock().pauseAnimations?.();
    this.clock().setCurrentTime?.(3.2);
  }

  stop(): void {
    this.clock().pauseAnimations?.();
  }
}

/** The plan figure: ship, gun and angle make one flight. */
export class BattleshipPlanFigure implements Figure {
  readonly el: HTMLElement;
  constructor(_math: string, _reduceMotion: boolean) {
    const card = (cx: number, title: string, sub: string, body: string) =>
      `<rect x="${cx - 190}" y="170" width="380" height="520" rx="22" fill="${CREAM}" stroke="${INK}" stroke-width="8"/>` +
      body +
      `<rect x="${cx - 170}" y="600" width="340" height="64" rx="12" fill="${RED}" stroke="${INK}" stroke-width="6"/><text x="${cx}" y="646" text-anchor="middle" class="gf-ribbon" fill="${CREAM}">${title}</text>` +
      `<text x="${cx}" y="750" text-anchor="middle" class="gf-small" fill="${CREAM}">${sub}</text>`;
    let b = `<rect width="${W}" height="${H}" rx="8" fill="${NAVY}"/><text x="680" y="110" text-anchor="middle" class="gf-kicker" fill="${YELLOW}">THREE CHOICES  ·  ONE FLIGHT</text>`;
    b += card(250, "SHIP", "SMALL TO BIG", warship(250, 320, 150, 1) + warship(250, 430, 220, 1) + warship(250, 560, 300, 2));
    b += card(680, "GUN", "SLOW TO FAST", [0, 1, 2, 3].map((i) => `<rect x="${530 + (i % 2) * 20}" y="${230 + i * 88}" width="${100 + i * 38}" height="26" rx="8" fill="${GREY}" stroke="${INK}" stroke-width="5"/>`).join(""));
    b += card(1110, "ANGLE", "FLAT TO STEEP", `<path d="M960 560H1260" stroke="${INK}" stroke-width="8"/>` + [10, 20, 35, 50].map((d, i) => `<line x1="960" y1="560" x2="${960 + Math.cos((d * Math.PI) / 180) * 280}" y2="${560 - Math.sin((d * Math.PI) / 180) * 280}" stroke="${i === 1 ? RED : GREY}" stroke-width="${i === 1 ? 10 : 6}" stroke-linecap="round"/>`).join(""));
    b += `<text x="465" y="470" text-anchor="middle" class="gf-pop" fill="${CREAM}" stroke="${INK}">+</text><text x="895" y="470" text-anchor="middle" class="gf-pop" fill="${CREAM}" stroke="${INK}">+</text>`;
    b += `<rect x="360" y="800" width="640" height="64" rx="32" fill="${RED}" stroke="${CREAM}" stroke-width="6"/><text x="680" y="845" text-anchor="middle" class="gf-ribbon" fill="${CREAM}">= ONE FLIGHT FOR ENIAC</text>`;
    const svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="gunnery-title-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${b}</svg>`);
    this.el = h("div", { class: "gunnery-title gunnery-plan battleship-title", "data-figure": "battleship-plan" }, svg as unknown as HTMLElement);
  }
  play(): void {}
  showFinal(): void {}
  stop(): void {}
}

/** The picker card picture (480 x 200): a banner over the ocean grid with an enemy ship and a peg. */
export function battleshipPicker(): string {
  let b = `<rect x="14" y="14" width="452" height="76" rx="8" fill="${RED}" stroke="${CREAM}" stroke-width="4"/>`;
  b += `<text x="240" y="70" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="46" letter-spacing="3" fill="${CREAM}" stroke="${INK}" stroke-width="2" paint-order="stroke">BATTLESHIP</text>`;
  b += `<rect x="14" y="104" width="452" height="82" fill="${SEA}" stroke="${CREAM}" stroke-width="4"/>`;
  for (let i = 1; i < 10; i++) b += `<line x1="${14 + i * 45.2}" y1="104" x2="${14 + i * 45.2}" y2="186" stroke="${SEA2}" stroke-width="2"/>`;
  b += `<line x1="14" y1="145" x2="466" y2="145" stroke="${SEA2}" stroke-width="2"/>`;
  b += warship(110, 176, 130, 2, 28) + warship(350, 176, 100, 1, 0);
  b += `<path d="M150 130Q 250 90 340 150" fill="none" stroke="${CREAM}" stroke-width="4" stroke-dasharray="3 10" stroke-linecap="round"/>`;
  b += `<circle cx="352" cy="132" r="9" fill="${RED}" stroke="${CREAM}" stroke-width="3"/>`;
  return b;
}
