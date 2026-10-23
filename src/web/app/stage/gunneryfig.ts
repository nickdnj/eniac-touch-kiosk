// Gunnery's front of house: a 1946 fairground shooting gallery, drawn flat in
// the colours of a pinball backglass (navy, cream, cherry red, mustard). The
// title figure (S3 briefing) is a marquee with chasing bulbs, an awning, a
// field gun that lobs a shell at a flag over and over, and today's best score
// on a plate. The plan figure shows the two dials. The picker card is a small
// marquee. Pure art plus one read of the score list; it names no numbers of its
// own beyond what the mission's game block says (three charges, four angles).

import { h, svgFromString } from "../ui/dom.ts";
import type { Figure } from "./primesfig.ts";
import { fetchScores } from "../net/api.ts";

const NAVY = "#12263A";
const NAVY2 = "#173048";
const CREAM = "#F4EFE3";
const RED = "#D6382B";
const MUSTARD = "#F2B632";
const INK = "#1B1D21";
const TEAL = "#1D5566";
const GREEN = "#2FA66B";
const ORANGE = "#E69F00";

const W = 1360;
const H = 904;

/** Light bulbs around a rounded rectangle, alternating between two chase groups. */
function bulbs(x: number, y: number, w: number, hgt: number, step: number, r: number): string {
  let a = "";
  let b = "";
  let i = 0;
  const put = (cx: number, cy: number) => {
    const c = `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}"/>`;
    if (i++ % 2) b += c;
    else a += c;
  };
  for (let px = x; px <= x + w; px += step) put(px, y);
  for (let py = y + step; py < y + hgt; py += step) put(x + w, py);
  for (let px = x + w - step; px >= x; px -= step) put(px, y + hgt);
  for (let py = y + hgt - step; py > y; py -= step) put(x, py);
  return `<g class="gf-bulb gf-bulb-a" fill="${MUSTARD}">${a}</g><g class="gf-bulb gf-bulb-b" fill="${MUSTARD}">${b}</g>`;
}

function sunburst(cx: number, cy: number, n: number, len: number): string {
  let s = "";
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    s += `<path d="M${cx} ${cy}L${(cx + Math.cos(a0) * len).toFixed(1)} ${(cy + Math.sin(a0) * len).toFixed(1)}L${(cx + Math.cos(a1) * len).toFixed(1)} ${(cy + Math.sin(a1) * len).toFixed(1)}Z" fill="${NAVY2}"/>`;
  }
  return s;
}

/** A field gun on a wheel, muzzle up and to the right. Origin at the wheel's centre. */
function gun(x: number, y: number, deg: number): string {
  return (
    `<g transform="translate(${x} ${y})">` +
    `<g transform="rotate(${-deg})"><rect x="-14" y="-17" width="150" height="34" rx="9" fill="${CREAM}" stroke="${INK}" stroke-width="5"/><rect x="108" y="-22" width="30" height="44" rx="7" fill="${MUSTARD}" stroke="${INK}" stroke-width="5"/></g>` +
    `<circle r="46" fill="${RED}" stroke="${INK}" stroke-width="6"/><circle r="12" fill="${INK}"/>` +
    [0, 45, 90, 135].map((d) => `<path d="M0 0L${(Math.cos((d * Math.PI) / 180) * 42).toFixed(1)} ${(Math.sin((d * Math.PI) / 180) * 42).toFixed(1)}M0 0L${(-Math.cos((d * Math.PI) / 180) * 42).toFixed(1)} ${(-Math.sin((d * Math.PI) / 180) * 42).toFixed(1)}" stroke="${INK}" stroke-width="4"/>`).join("") +
    `</g>`
  );
}

function flag(x: number, y: number): string {
  return (
    `<g transform="translate(${x} ${y})"><line x1="0" y1="0" x2="0" y2="-170" stroke="${CREAM}" stroke-width="9" stroke-linecap="round"/>` +
    `<g class="gf-wave"><path d="M0 -170 L112 -138 L0 -106Z" fill="${RED}" stroke="${CREAM}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M30 -140l6 12 13 2-10 9 3 13-12-7-12 7 3-13-10-9 13-2z" fill="${CREAM}"/></g></g>`
  );
}

/** The score zones as bands of the counter around the flag, outermost first. */
function bands(cx: number, y: number): string {
  const spec: [number, string][] = [[225, "#D55E00"], [180, ORANGE], [135, "#F0E442"], [90, GREEN], [38, "#FFD700"]];
  return spec.map(([half, fill]) => `<rect x="${cx - half}" y="${y}" width="${half * 2}" height="26" fill="${fill}" stroke="${INK}" stroke-width="4"/>`).join("");
}

function awning(x0: number, x1: number, y: number): string {
  const n = 18;
  const w = (x1 - x0) / n;
  let s = "";
  for (let i = 0; i < n; i++) {
    const fill = i % 2 ? CREAM : RED;
    const xa = x0 + i * w;
    s += `<path d="M${xa} ${y}h${w}v52a${w / 2} ${w / 2} 0 0 1 ${-w} 0z" fill="${fill}" stroke="${INK}" stroke-width="4"/>`;
  }
  return s;
}

export class GunneryTitleFigure implements Figure {
  readonly el: HTMLElement;
  private svg: SVGSVGElement;
  private best: SVGElement | null;
  private who: SVGElement | null;
  private note: SVGElement | null;

  constructor(_reduceMotion: boolean) {
    const arc = "M340 600 Q 680 150 1010 690";
    let b = `<rect width="${W}" height="${H}" rx="8" fill="${NAVY}"/>` + sunburst(680, 640, 40, 1500);
    // The sign.
    b += `<rect x="120" y="36" width="1120" height="250" rx="34" fill="${INK}" stroke="${CREAM}" stroke-width="8"/>` + bulbs(150, 66, 1060, 190, 40, 8);
    b += `<rect x="172" y="88" width="1016" height="146" rx="18" fill="${RED}" stroke="${CREAM}" stroke-width="5"/>`;
    b += `<text x="680" y="212" text-anchor="middle" class="gf-title" fill="${INK}" transform="translate(7 7)">GUNNERY</text><text x="680" y="212" text-anchor="middle" class="gf-title" fill="${CREAM}">GUNNERY</text>`;
    b += `<text x="680" y="78" text-anchor="middle" class="gf-kicker" fill="${MUSTARD}">★  ENIAC  ·  1946  ★</text>`;
    b += `<path d="M300 296h760l-34 52H334z" fill="${MUSTARD}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><text x="680" y="334" text-anchor="middle" class="gf-ribbon" fill="${INK}">CAN ENIAC HIT THE FLAG?</text>`;
    // The gallery.
    b += `<rect x="120" y="384" width="1120" height="330" fill="${TEAL}" stroke="${INK}" stroke-width="6"/>`;
    b += `<g fill="${CREAM}" opacity=".16"><ellipse cx="300" cy="470" rx="90" ry="26"/><ellipse cx="350" cy="450" rx="60" ry="26"/><ellipse cx="900" cy="450" rx="110" ry="28"/><ellipse cx="970" cy="428" rx="70" ry="26"/></g>`;
    b += awning(120, 1240, 384);
    b += `<rect x="120" y="690" width="1120" height="40" fill="#7A2A22" stroke="${INK}" stroke-width="6"/>` + bands(1010, 690);
    b += `<path d="${arc}" fill="none" stroke="${CREAM}" stroke-width="6" stroke-dasharray="4 22" stroke-linecap="round" opacity=".85"/>`;
    b += gun(250, 650, 40) + flag(1010, 690);
    // The shell, and what happens when it lands.
    b += `<circle r="15" fill="${MUSTARD}" stroke="${INK}" stroke-width="5"><animateMotion dur="3.6s" repeatCount="indefinite" path="${arc}" keyPoints="0;1;1" keyTimes="0;0.78;1" calcMode="linear"/></circle>`;
    b += `<g class="gf-burst" transform="translate(1010 640)">${Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return `<line x1="${(Math.cos(a) * 36).toFixed(1)}" y1="${(Math.sin(a) * 36).toFixed(1)}" x2="${(Math.cos(a) * 82).toFixed(1)}" y2="${(Math.sin(a) * 82).toFixed(1)}" stroke="#FFD700" stroke-width="7" stroke-linecap="round"/>`;
    }).join("")}<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.78;0.8;0.95;1" dur="3.6s" repeatCount="indefinite"/></g>`;
    b += `<text x="1010" y="560" text-anchor="middle" class="gf-pop" fill="#FFD700" stroke="${INK}">+1000<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.8;0.84;0.95;1" dur="3.6s" repeatCount="indefinite"/></text>`;
    // The score plate.
    b += `<rect x="120" y="752" width="1120" height="124" rx="22" fill="${INK}" stroke="${CREAM}" stroke-width="6"/>`;
    b += `<text x="200" y="800" class="gf-label" fill="${MUSTARD}">TODAY'S BEST</text>`;
    for (let i = 0; i < 4; i++) b += `<rect x="${200 + i * 78}" y="814" width="64" height="44" rx="6" fill="${CREAM}"/>`;
    b += `<text class="gf-digits" data-best="" fill="${INK}" x="232" y="850" text-anchor="middle">-</text>`;
    b += `<text x="540" y="850" class="gf-who" data-who="" fill="${CREAM}"></text>`;
    b += `<text x="1180" y="800" text-anchor="end" class="gf-label" fill="${CREAM}">ONE PLAYER</text><text x="1180" y="848" text-anchor="end" class="gf-small" data-note="" fill="${MUSTARD}">3 CHARGES · 4 ANGLES</text>`;
    this.svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="gunnery-title-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${b}</svg>`);
    this.el = h("div", { class: "gunnery-title", "data-figure": "gunnery-title" }, this.svg as unknown as HTMLElement);
    this.best = this.svg.querySelector("[data-best]");
    this.who = this.svg.querySelector("[data-who]");
    this.note = this.svg.querySelector("[data-note]");
    void this.loadBest();
  }

  /** Today's best score on the plate, one digit to a window; "BE THE FIRST" while there is none. */
  private async loadBest(): Promise<void> {
    const b = await fetchScores("gunnery");
    const top = b?.today[0];
    if (!this.best || !this.who) return;
    const digits = top ? String(top.score).padStart(4, "0").slice(-4) : "";
    this.best.textContent = "";
    if (top) {
      this.best.replaceChildren();
      [...digits].forEach((d, i) => {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", String(232 + i * 78));
        t.setAttribute("y", "850");
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("class", "gf-digits");
        t.setAttribute("fill", INK);
        t.textContent = d;
        this.best!.parentNode!.insertBefore(t, this.best);
      });
      this.who.textContent = top.name;
    } else {
      this.who.textContent = "BE THE FIRST";
    }
    void this.note;
  }

  // The shell and the burst are SMIL animations on the SVG's own clock.
  private clock(): { pauseAnimations?: () => void; unpauseAnimations?: () => void; setCurrentTime?: (t: number) => void } {
    return this.svg as unknown as ReturnType<GunneryTitleFigure["clock"]>;
  }

  play(): void {
    this.el.classList.remove("still");
    this.clock().unpauseAnimations?.();
  }

  showFinal(): void {
    this.el.classList.add("still");
    this.clock().pauseAnimations?.();
    this.clock().setCurrentTime?.(2.9);
  }

  stop(): void {
    this.clock().pauseAnimations?.();
  }
}

/** The plan figure: the two dials that make one flight. */
export class GunneryPlanFigure implements Figure {
  readonly el: HTMLElement;
  private svg: SVGSVGElement;

  constructor(_math: string, _reduceMotion: boolean) {
    const dial = (cx: number, label: string, sub: string, needle: number, ticks: string[]) => {
      let s = `<circle cx="${cx}" cy="430" r="190" fill="${CREAM}" stroke="${INK}" stroke-width="10"/><circle cx="${cx}" cy="430" r="160" fill="none" stroke="${INK}" stroke-width="4"/>`;
      ticks.forEach((t, i) => {
        const a = ((-120 + (i * 240) / (ticks.length - 1)) * Math.PI) / 180;
        s += `<line x1="${cx + Math.sin(a) * 134}" y1="${430 - Math.cos(a) * 134}" x2="${cx + Math.sin(a) * 160}" y2="${430 - Math.cos(a) * 160}" stroke="${INK}" stroke-width="6"/><text x="${cx + Math.sin(a) * 106}" y="${430 - Math.cos(a) * 106 + 8}" text-anchor="middle" class="gf-tick" fill="${INK}">${t}</text>`;
      });
      s += `<g class="gf-needle" transform="rotate(${needle} ${cx} 430)"><path d="M${cx - 8} 430L${cx} 340L${cx + 8} 430Z" fill="${RED}" stroke="${INK}" stroke-width="4"/></g><circle cx="${cx}" cy="430" r="18" fill="${INK}"/>`;
      s += `<rect x="${cx - 190}" y="650" width="380" height="64" rx="12" fill="${MUSTARD}" stroke="${INK}" stroke-width="6"/><text x="${cx}" y="696" text-anchor="middle" class="gf-ribbon" fill="${INK}">${label}</text><text x="${cx}" y="750" text-anchor="middle" class="gf-small" fill="${CREAM}">${sub}</text>`;
      return s;
    };
    let b = `<rect width="${W}" height="${H}" rx="8" fill="${NAVY}"/>` + sunburst(680, 440, 40, 1500);
    b += `<text x="680" y="120" text-anchor="middle" class="gf-kicker" fill="${MUSTARD}">TWO DIALS  ·  ONE FLIGHT</text>`;
    b += dial(330, "CHARGE", "HOW FAST IT LEAVES THE GUN", 24, ["1", "2", "3"]);
    b += `<text x="680" y="452" text-anchor="middle" class="gf-pop" fill="${CREAM}" stroke="${INK}">+</text>`;
    b += dial(1030, "ELEVATION", "HOW STEEPLY IT CLIMBS", -34, ["5°", "10°", "15°", "20°"]);
    b += `<rect x="360" y="800" width="640" height="64" rx="32" fill="${RED}" stroke="${CREAM}" stroke-width="6"/><text x="680" y="845" text-anchor="middle" class="gf-ribbon" fill="${CREAM}">= ONE FLIGHT FOR ENIAC</text>`;
    this.svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="gunnery-title-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${b}</svg>`);
    this.el = h("div", { class: "gunnery-title gunnery-plan", "data-figure": "gunnery-plan" }, this.svg as unknown as HTMLElement);
  }
  play(): void {}
  showFinal(): void {}
  stop(): void {}
}

/** The picker card picture (480 x 200): a small marquee with a flag and a shot's dotted arc. */
export function gunneryPicker(): string {
  let b = `<rect x="14" y="14" width="452" height="104" rx="16" fill="${INK}" stroke="${CREAM}" stroke-width="4"/>` + bulbs(26, 26, 428, 80, 22, 4);
  b += `<rect x="40" y="38" width="400" height="58" rx="10" fill="${RED}" stroke="${CREAM}" stroke-width="3"/><text x="240" y="84" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="52" letter-spacing="4" fill="${CREAM}" stroke="${INK}" stroke-width="2" paint-order="stroke">GUNNERY</text>`;
  b += `<path d="M64 186Q 220 96 372 186" fill="none" stroke="${CREAM}" stroke-width="4" stroke-dasharray="3 12" stroke-linecap="round"/>`;
  b += `<g transform="translate(372 186)"><line y2="-46" stroke="${CREAM}" stroke-width="4"/><path d="M0 -46L34 -35L0 -24Z" fill="${RED}" stroke="${CREAM}" stroke-width="2"/></g>`;
  b += `<g transform="translate(60 178)"><rect x="-4" y="-10" width="46" height="14" rx="4" transform="rotate(-38)" fill="${CREAM}"/><circle r="12" fill="${RED}" stroke="${CREAM}" stroke-width="3"/></g>`;
  return b;
}
