// Fire Mission's front of house: an Army field map. Olive drab and khaki, stencil lettering,
// a contour-line map with a grid, a howitzer, a forward observer on a hill and a target. The
// title figure plays the whole idea on a loop: a spotting round lands short, the observer
// radios a correction, the second round hits. The plan figure shows the three choices; the
// picker card is a small banner over the map. Flat SVG.

import { h, svgFromString } from "../ui/dom.ts";
import type { Figure } from "./primesfig.ts";
import { fillBest, scorePlate } from "./scoreplate.ts";

const OLIVE = "#3E4A22";
const DRAB = "#5A6B33";
const MAP = "#C9BD93";
const MAP2 = "#B5A878";
const KHAKI = "#E3D9B0";
const STENCIL = "#F2EBD0";
const RED = "#C8432B";
const YELLOW = "#F2C230";
const INK = "#1D2210";
const W = 1360;
const H = 904;

/** A howitzer in profile, muzzle to the right. `k` scales the 300-unit drawing. */
function gun(x: number, y: number, k: number, aim: number, big = 1): string {
  const bl = 120 * big;
  return (
    `<g transform="translate(${x} ${y}) scale(${k})">` +
    `<path d="M0 -30L-90 -4L-110 0L-84 0L8 -20Z" fill="${DRAB}" stroke="${INK}" stroke-width="${5 / k}" stroke-linejoin="round"/>` +
    `<g transform="translate(0 -52) rotate(${-aim})"><rect x="-16" y="-9" width="${bl + 16}" height="18" rx="4" fill="${INK}"/><rect x="${bl * 0.4}" y="-14" width="16" height="28" rx="3" fill="${DRAB}" stroke="${INK}" stroke-width="${4 / k}"/></g>` +
    `<path d="M-6 -86L26 -68V-24H-6Z" fill="${OLIVE}" stroke="${INK}" stroke-width="${5 / k}" stroke-linejoin="round"/>` +
    `<circle cy="-28" r="28" fill="${INK}"/><circle cy="-28" r="17" fill="${KHAKI}" stroke="${INK}" stroke-width="${4 / k}"/><circle cy="-28" r="6" fill="${INK}"/>` +
    `</g>`
  );
}

/** A tank in profile, turret to the right. */
function tank(x: number, y: number, k: number): string {
  let s = `<g transform="translate(${x} ${y}) scale(${k})">`;
  s += `<rect x="-60" y="-34" width="120" height="30" rx="14" fill="${OLIVE}" stroke="${INK}" stroke-width="${5 / k}"/>`;
  s += `<rect x="-26" y="-62" width="56" height="30" rx="8" fill="${DRAB}" stroke="${INK}" stroke-width="${5 / k}"/>`;
  s += `<rect x="26" y="-54" width="64" height="9" rx="3" fill="${INK}"/>`;
  for (let i = -4; i <= 4; i++) s += `<circle cx="${i * 13}" cy="-14" r="7" fill="${KHAKI}" stroke="${INK}" stroke-width="${3 / k}"/>`;
  return s + `</g>`;
}

/** A forward observer lying on a rise with binoculars, and a radio. */
function observer(x: number, y: number): string {
  return (
    `<g transform="translate(${x} ${y})"><path d="M-70 0Q-30 -52 20 -50Q64 -48 90 0Z" fill="${DRAB}" stroke="${INK}" stroke-width="5"/>` +
    `<circle cx="0" cy="-66" r="17" fill="${KHAKI}" stroke="${INK}" stroke-width="5"/><path d="M-20 -72Q0 -92 20 -72Z" fill="${OLIVE}" stroke="${INK}" stroke-width="5"/>` +
    `<rect x="12" y="-72" width="26" height="12" rx="4" fill="${INK}"/><line x1="-30" y1="-52" x2="-30" y2="-118" stroke="${INK}" stroke-width="5"/></g>`
  );
}

/** The map: khaki ground, contour lines, a lettered grid. */
function map(x: number, y: number, w: number, hgt: number): string {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="${MAP}" stroke="${STENCIL}" stroke-width="6"/>`;
  s += `<g fill="none" stroke="${MAP2}" stroke-width="3">`;
  for (let i = 0; i < 5; i++) s += `<path d="M${x} ${y + 60 + i * 56}Q${x + w * 0.25} ${y + 10 + i * 56} ${x + w * 0.5} ${y + 70 + i * 56}T${x + w} ${y + 40 + i * 56}"/>`;
  s += `</g>`;
  for (let i = 1; i < 10; i++) s += `<line x1="${x + (i * w) / 10}" y1="${y}" x2="${x + (i * w) / 10}" y2="${y + hgt}" stroke="${MAP2}" stroke-width="2" stroke-dasharray="10 8"/>`;
  for (let i = 0; i < 10; i++) s += `<text x="${x + (i * w) / 10 + w / 20}" y="${y - 12}" text-anchor="middle" class="bs-coord" fill="${STENCIL}">${"ABCDEFGHIJ"[i]}</text>`;
  return s;
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

const DUR = 8;

export class ArmyTitleFigure implements Figure {
  readonly el: HTMLElement;
  private svg: SVGSVGElement;

  constructor(_reduceMotion: boolean) {
    // One 8 s loop: round 1 flies (0.05-0.30), lands short (dust), the observer calls it (0.34-0.56), round 2 flies (0.58-0.82) and hits.
    const arc1 = "M330 650 Q 640 330 900 660";
    const arc2 = "M330 650 Q 700 240 1070 660";
    const t = (a: number, b: number) => `keyTimes="0;${a};${b};1" values="0;0;1;1"`;
    let b = `<rect width="${W}" height="${H}" rx="8" fill="${OLIVE}"/>`;
    b += `<rect x="120" y="40" width="1120" height="230" rx="10" fill="${DRAB}" stroke="${STENCIL}" stroke-width="8"/>`;
    b += `<text x="680" y="204" text-anchor="middle" class="bs-title army-title" fill="${INK}" transform="translate(8 8)">FIRE MISSION</text><text x="680" y="204" text-anchor="middle" class="bs-title army-title" fill="${STENCIL}" stroke="${INK}">FIRE MISSION</text>`;
    b += `<text x="680" y="30" text-anchor="middle" class="gf-kicker" fill="${YELLOW}">ENIAC  ·  BUILT FOR THE U.S. ARMY</text>`;
    b += map(120, 330, 1120, 400);
    b += gun(300, 700, 1.15, 34, 1.1);
    b += `<circle cx="470" cy="610" r="40" fill="${YELLOW}" opacity="0"><animate attributeName="opacity" values="0;1;0;0;0;1;0;0" keyTimes="0;0.02;0.08;0.5;0.58;0.6;0.66;1" dur="${DUR}s" repeatCount="indefinite"/></circle>`;
    b += observer(680, 700);
    b += tank(1070, 700, 1.1);
    b += `<path d="${arc1}" fill="none" stroke="${STENCIL}" stroke-width="5" stroke-dasharray="4 20" stroke-linecap="round" opacity="0"><animate attributeName="opacity" values="0;.9;.9;0;0" keyTimes="0;0.05;0.34;0.4;1" dur="${DUR}s" repeatCount="indefinite"/></path>`;
    b += `<circle r="13" fill="${YELLOW}" stroke="${INK}" stroke-width="5" opacity="0"><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.29;0.3;1" dur="${DUR}s" repeatCount="indefinite"/><animateMotion dur="${DUR}s" repeatCount="indefinite" path="${arc1}" keyPoints="0;0;1;1" keyTimes="0;0.05;0.3;1" calcMode="linear"/></circle>`;
    b += `<g transform="translate(900 680)"><ellipse rx="70" ry="22" fill="${MAP2}" stroke="${INK}" stroke-width="5"/><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.29;0.31;0.5;0.56;1" dur="${DUR}s" repeatCount="indefinite"/></g>`;
    b += `<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.34;0.37;0.54;0.57;1" dur="${DUR}s" repeatCount="indefinite"/><rect x="560" y="440" width="300" height="104" rx="14" fill="${STENCIL}" stroke="${INK}" stroke-width="6" transform="rotate(-3 710 490)"/><text x="710" y="480" text-anchor="middle" class="army-radio" fill="${INK}">SHORT 300!</text><text x="710" y="522" text-anchor="middle" class="army-radio" fill="${RED}">ADD RANGE</text></g>`;
    b += `<path d="${arc2}" fill="none" stroke="${STENCIL}" stroke-width="5" stroke-dasharray="4 20" stroke-linecap="round" opacity="0"><animate attributeName="opacity" values="0;0;.9;.9;0;0" keyTimes="0;0.57;0.58;0.84;0.9;1" dur="${DUR}s" repeatCount="indefinite"/></path>`;
    b += `<circle r="13" fill="${YELLOW}" stroke="${INK}" stroke-width="5" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.58;0.6;0.83;0.84;1" dur="${DUR}s" repeatCount="indefinite"/><animateMotion dur="${DUR}s" repeatCount="indefinite" path="${arc2}" keyPoints="0;0;1;1" keyTimes="0;0.6;0.84;1" calcMode="linear"/></circle>`;
    b += `<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.84;0.86;0.97;0.99;1" dur="${DUR}s" repeatCount="indefinite"/><g transform="translate(1070 640)">${starburst(0, 0, 50, 104, 11, RED)}${starburst(0, 0, 30, 66, 9, YELLOW)}</g><g transform="translate(1030 500) rotate(-8)"><rect x="-150" y="-44" width="300" height="88" rx="8" fill="${STENCIL}" stroke="${RED}" stroke-width="8"/><text x="0" y="22" text-anchor="middle" class="bs-stamp" fill="${RED}">TARGET!</text></g></g>`;
    void t;
    b += scorePlate("2 ROUNDS · 3 GUNS");
    this.svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="gunnery-title-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${b}</svg>`);
    this.el = h("div", { class: "gunnery-title battleship-title army-title-fig", "data-figure": "army-title" }, this.svg as unknown as HTMLElement);
    void fillBest(this.svg, "firemission");
  }

  private clock(): { pauseAnimations?: () => void; unpauseAnimations?: () => void; setCurrentTime?: (t: number) => void } {
    return this.svg as unknown as ReturnType<ArmyTitleFigure["clock"]>;
  }

  play(): void {
    this.el.classList.remove("still");
    this.clock().unpauseAnimations?.();
  }

  showFinal(): void {
    this.el.classList.add("still");
    this.clock().pauseAnimations?.();
    this.clock().setCurrentTime?.(DUR * 0.9);
  }

  stop(): void {
    this.clock().pauseAnimations?.();
  }
}

/** The plan figure: gun, charge and angle make one flight; two flights make a mission. */
export class ArmyPlanFigure implements Figure {
  readonly el: HTMLElement;
  constructor(_math: string, _reduceMotion: boolean) {
    const card = (cx: number, title: string, sub: string, body: string) =>
      `<rect x="${cx - 190}" y="170" width="380" height="520" rx="22" fill="${KHAKI}" stroke="${INK}" stroke-width="8"/>` +
      body +
      `<rect x="${cx - 170}" y="600" width="340" height="64" rx="12" fill="${RED}" stroke="${INK}" stroke-width="6"/><text x="${cx}" y="646" text-anchor="middle" class="gf-ribbon" fill="${STENCIL}">${title}</text>` +
      `<text x="${cx}" y="750" text-anchor="middle" class="gf-small" fill="${STENCIL}">${sub}</text>`;
    let b = `<rect width="${W}" height="${H}" rx="8" fill="${OLIVE}"/><text x="680" y="110" text-anchor="middle" class="gf-kicker" fill="${YELLOW}">THREE CHOICES  ·  ONE FLIGHT  ·  TWO ROUNDS</text>`;
    b += card(250, "GUN", "SMALL TO BIG", gun(180, 420, 0.5, 20, 0.7) + gun(210, 520, 0.7, 20, 1) + gun(170, 585, 0.62, 20, 1.5));
    b += card(680, "CHARGE", "SLOW TO FAST", [0, 1, 2, 3].map((i) => `<rect x="${530 + (i % 2) * 20}" y="${230 + i * 88}" width="${100 + i * 38}" height="26" rx="8" fill="${DRAB}" stroke="${INK}" stroke-width="5"/>`).join(""));
    b += card(1110, "ANGLE", "FLAT TO STEEP", `<path d="M960 560H1260" stroke="${INK}" stroke-width="8"/>` + [10, 20, 35, 50].map((d, i) => `<line x1="960" y1="560" x2="${960 + Math.cos((d * Math.PI) / 180) * 280}" y2="${560 - Math.sin((d * Math.PI) / 180) * 280}" stroke="${i === 1 ? RED : DRAB}" stroke-width="${i === 1 ? 10 : 6}" stroke-linecap="round"/>`).join(""));
    b += `<text x="465" y="470" text-anchor="middle" class="gf-pop" fill="${STENCIL}" stroke="${INK}">+</text><text x="895" y="470" text-anchor="middle" class="gf-pop" fill="${STENCIL}" stroke="${INK}">+</text>`;
    b += `<rect x="330" y="800" width="700" height="64" rx="32" fill="${RED}" stroke="${STENCIL}" stroke-width="6"/><text x="680" y="845" text-anchor="middle" class="gf-ribbon" fill="${STENCIL}">= ONE FLIGHT FOR ENIAC</text>`;
    const svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="gunnery-title-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${b}</svg>`);
    this.el = h("div", { class: "gunnery-title gunnery-plan battleship-title", "data-figure": "army-plan" }, svg as unknown as HTMLElement);
  }
  play(): void {}
  showFinal(): void {}
  stop(): void {}
}

/** The picker card picture (480 x 200): a banner over the field map with a gun, a tank and a shell's arc. */
export function armyPicker(): string {
  let b = `<rect x="14" y="14" width="452" height="76" rx="8" fill="${DRAB}" stroke="${STENCIL}" stroke-width="4"/>`;
  b += `<text x="240" y="70" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="44" letter-spacing="3" fill="${STENCIL}" stroke="${INK}" stroke-width="2" paint-order="stroke">FIRE MISSION</text>`;
  b += `<rect x="14" y="104" width="452" height="82" fill="${MAP}" stroke="${STENCIL}" stroke-width="4"/>`;
  for (let i = 1; i < 10; i++) b += `<line x1="${14 + i * 45.2}" y1="104" x2="${14 + i * 45.2}" y2="186" stroke="${MAP2}" stroke-width="2"/>`;
  b += gun(96, 180, 0.42, 28, 1) + tank(372, 180, 0.36);
  b += `<path d="M130 140Q 250 80 360 140" fill="none" stroke="${INK}" stroke-width="4" stroke-dasharray="3 10" stroke-linecap="round"/>`;
  return b;
}
