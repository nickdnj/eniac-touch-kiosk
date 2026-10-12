// S16 drawings (docs/tubes.md 2.3 to 2.5; mockup docs/mockups/tubes.html).
// SVG markup strings, pure: every number comes from tubes/content.ts.
//
// The re-enactment's panels are DRAWN here: their lamps are tagged
// data-source="script", they carry no unit art ids of the live room
// (no "lamp:acc..." ids), and their names are ACC 1 to ACC 4 (RE-2, RE-3).
// The lamp look (amber core, dark ring when off) reuses the kit's shared
// gradients (panels/art.ts DEFS), which are paint only.

import { CAPTIONS, DOTS, MYTH, POWER, TRY, WEEK, WORK, type TubeCard } from "./content.ts";

const FONT = `font-family="Atkinson Hyperlegible, sans-serif"`;
const W = 1360;
const H = 904;

/** XML-escapes visitor text placed inside SVG. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function svg(body: string, w = W, h = H, cls = "tb-fig"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;
}

/** Defs only S16 uses (prefixed tb-): glass, warm and cold glows. Injected once per screen. */
export const TUBE_DEFS = `<linearGradient id="tb-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".3" stop-color="#fff" stop-opacity=".30"/><stop offset=".6" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>
<radialGradient id="tb-heat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB000" stop-opacity=".9"/><stop offset="1" stop-color="#FF7A00" stop-opacity="0"/></radialGradient>
<radialGradient id="tb-cold" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#56B4E9" stop-opacity=".7"/><stop offset="1" stop-color="#56B4E9" stop-opacity="0"/></radialGradient>`;

// ---------------------------------------------------------------- card 1: one dot per tube

export const DOT_PITCH = 6;
const DOT = 4;
const DX0 = 80;
const DY0 = 222;

/** The dot field: a pattern of exactly DOTS.cols x DOTS.rows dots (18,000), with the comparison boxes on top. */
export function figTubes(): string {
  const P = DOT_PITCH;
  const fw = DOTS.cols * P, fh = DOTS.rows * P;
  const pat = (id: string, fill: string, op = 1) =>
    `<pattern id="${id}" x="${DX0}" y="${DY0}" width="${P}" height="${P}" patternUnits="userSpaceOnUse"><rect width="${DOT}" height="${DOT}" fill="${fill}" opacity="${op}"/></pattern>`;
  let boxes = "";
  for (const b of DOTS.boxes) {
    const x = DX0 + b.col * P, y = DY0 + b.row * P;
    boxes += `<rect class="tb-dots-box" data-box="${b.id}" data-dots="${b.w * b.h}" x="${x}" y="${y}" width="${b.w * P}" height="${b.h * P}" fill="url(#tb-dot-hot)"/>`;
    boxes += `<rect x="${x - 4}" y="${y - 4}" width="${b.w * P + 2}" height="${b.h * P + 2}" fill="none" stroke="#F4EFE3" stroke-width="3" rx="3"/>`;
    boxes += `<text x="${x - 4}" y="${DY0 - 16}" ${FONT} font-size="24" font-weight="700" fill="#F4EFE3">${esc(b.label)}</text>`;
  }
  const lx = DX0 + 40 * P, ly = DY0 + 52 * P;
  return svg(`<defs>${pat("tb-dot-dim", "#FFB000", 0.5)}${pat("tb-dot-hot", "#FFD35A")}</defs>
    <rect class="tb-dots" data-dots="${(fw / P) * (fh / P)}" x="${DX0}" y="${DY0}" width="${fw}" height="${fh}" fill="url(#tb-dot-dim)"/>${boxes}
    <rect x="${lx}" y="${ly}" width="${120 * P}" height="${22 * P}" rx="14" fill="#0b0c0f" stroke="#F4EFE3" stroke-width="3"/>
    <text x="${lx + 60 * P}" y="${ly + 14 * P}" ${FONT} font-size="56" font-weight="700" fill="#FFD35A" text-anchor="middle">${esc(CAPTIONS.tubes.eniac)}</text>`);
}

// ---------------------------------------------------------------- card 2: where the power went

export const BAR = { x: 80, w: 1100 };

/** The 150 kW bar split 80 / 45 / 20 / 5, and one home's 1.2 kW on the same scale. */
export function figPower(): string {
  const u = BAR.w / POWER.totalKw;
  let x = BAR.x, s = "";
  for (const p of POWER.parts) {
    const w = p.kw * u, mid = x + w / 2, small = p.kw < 10;
    s += `<rect class="tb-kw" data-kw="${p.kw}" x="${x}" y="260" width="${w}" height="120" fill="${p.colour}" stroke="#000" stroke-width="3"/>`;
    if (small) {
      s += `<path d="M${mid} 380 v26" stroke="#F4EFE3" stroke-width="3"/><text x="${Math.min(mid, BAR.x + BAR.w - 60)}" y="436" text-anchor="middle" font-size="24" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(p.label)}: ${p.kw} kW</text>`;
    } else {
      s += `<text x="${mid}" y="332" text-anchor="middle" font-size="34" font-weight="700" fill="${p.text}" ${FONT}>${p.kw} kW</text>`;
      s += `<text x="${mid}" y="238" text-anchor="middle" font-size="24" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(p.label)}</text>`;
    }
    x += w;
  }
  const c = CAPTIONS.power;
  return svg(`${s}
    <text x="${BAR.x}" y="196" font-size="30" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(c.total)}</text>
    <text x="${BAR.x}" y="508" font-size="24" fill="#C9C2A8" ${FONT}>${esc(c.scale)}</text>
    <rect class="tb-home" data-kw="${POWER.homeKw}" x="${BAR.x}" y="530" width="${POWER.homeKw * u}" height="60" fill="#F4EFE3" stroke="#000" stroke-width="3"/>
    <text x="${BAR.x + 40}" y="570" font-size="26" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(c.home)}</text>
    <text x="${BAR.x}" y="680" font-size="28" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(c.hour)}</text>
    <text x="${BAR.x}" y="732" font-size="24" fill="#C9C2A8" ${FONT}>${esc(c.thermostat)}</text>`);
}

// ---------------------------------------------------------------- card 3: one week, 1946 to 1948

export function figWhy(): string {
  const X = 100, DW = 160, Y = 330, c = CAPTIONS.why;
  const shift = (DW - 8) * (WEEK.shiftHours / 24);
  let s = "";
  c.days.forEach((d, i) => {
    const x = X + i * DW;
    s += `<text x="${x + DW / 2}" y="${Y - 24}" text-anchor="middle" font-size="26" font-weight="700" fill="#F4EFE3" ${FONT}>${d}</text>`;
    s += `<rect x="${x + 4}" y="${Y}" width="${DW - 8}" height="64" fill="#1B1D21" stroke="#34383f" stroke-width="2"/>`;
    if (i < WEEK.workDays) s += `<rect class="tb-shift" x="${x + 4 + shift}" y="${Y}" width="${shift}" height="64" fill="#FFB000"/>`;
    s += `<rect class="tb-heaters" x="${x + 4}" y="${Y + 112}" width="${DW - 8}" height="64" fill="#CC79A7" opacity=".85"/>`;
  });
  const colours = ["#FFB000", "#CC79A7", "#C9C2A8"];
  c.legend.forEach((t, i) => {
    s += `<text x="${X}" y="${Y + 240 + i * 44}" font-size="26" font-weight="700" fill="${colours[i]}" ${FONT}>&#9632; ${esc(t)}</text>`;
  });
  s += `<text x="${X}" y="${Y + 420}" font-size="24" fill="#C9C2A8" ${FONT}>${esc(c.note)}</text>`;
  return svg(s);
}

// ---------------------------------------------------------------- card 4: the hunt

export function figHunt(): string {
  const rung = (y: number, n: number, h: string, t: string) =>
    `<g transform="translate(120,${y})"><rect width="1060" height="150" rx="14" fill="#1B1D21" stroke="#5b606a" stroke-width="3"/><circle cx="80" cy="75" r="40" fill="#000" stroke="#F4EFE3" stroke-width="4"/><text x="80" y="90" text-anchor="middle" font-size="44" font-weight="700" fill="#fff" ${FONT}>${n}</text>
    <text x="160" y="64" font-size="38" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(h)}</text><text x="160" y="108" font-size="26" fill="#C9C2A8" ${FONT}>${esc(t)}</text></g>`;
  const arrow = (y: number) => `<path d="M650 ${y} v36 m-18 -14 l18 16 l18 -16" stroke="#F0E442" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const r = CAPTIONS.hunt.rungs;
  return svg(`${rung(170, 1, r[0].h, r[0].t)}${arrow(324)}${rung(366, 2, r[1].h, r[1].t)}${arrow(520)}${rung(562, 3, r[2].h, r[2].t)}
    <text x="120" y="780" font-size="26" fill="#C9C2A8" ${FONT}>${esc(CAPTIONS.hunt.note)}</text>`);
}

// ---------------------------------------------------------------- card 5: time at work

export function figWeek(): string {
  const X = 400, BW = 800;
  const bar = (y: number, w: (typeof WORK)[number]) =>
    `<text x="${X - 24}" y="${y + 44}" text-anchor="end" font-size="28" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(w.label)}</text>
    <rect x="${X}" y="${y}" width="${BW}" height="64" fill="#1B1D21" stroke="#34383f" stroke-width="3"/><rect class="tb-work" data-from="${w.from}" data-to="${w.to}" x="${X + (BW * w.from) / 100}" y="${y}" width="${(BW * (w.to - w.from)) / 100}" height="64" fill="#FFB000"/>
    <text x="${X + (BW * w.to) / 100 + 16}" y="${y + 44}" font-size="30" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(w.text)}</text>`;
  const ticks = [0, 25, 50, 75, 100].map((p) => `<text x="${X + (BW * p) / 100}" y="580" text-anchor="middle" font-size="22" fill="#9AA0A8" ${FONT}>${p}%</text>`).join("");
  const c = CAPTIONS.week;
  return svg(`${WORK.map((w, i) => bar(230 + i * 130, w)).join("")}${ticks}
    <text x="${X}" y="640" font-size="24" fill="#C9C2A8" ${FONT}>${esc(c.note)}</text>
    <text x="${X}" y="690" font-size="26" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(c.trouble[0])}</text>
    <text x="${X}" y="726" font-size="26" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(c.trouble[1])}</text>`);
}

// ---------------------------------------------------------------- the myth card

export function figMyth(): string {
  return svg(`<g transform="translate(680,330) rotate(-6)"><rect x="-300" y="-110" width="600" height="220" rx="16" fill="none" stroke="#D55E00" stroke-width="14"/><text x="0" y="40" text-anchor="middle" font-size="150" font-weight="700" fill="#D55E00" ${FONT} letter-spacing="10">MYTH</text></g>
    <text x="680" y="600" text-anchor="middle" font-size="40" font-weight="700" fill="#F4EFE3" ${FONT}>${esc(MYTH.quote)}</text>
    <text x="680" y="650" text-anchor="middle" font-size="28" fill="#C9C2A8" ${FONT}>${esc(MYTH.who)}</text>`);
}

export const FIGURES: Record<TubeCard["id"], () => string> = { tubes: figTubes, power: figPower, why: figWhy, hunt: figHunt, week: figWeek };

/** The rail card's banner (456 x 112). */
export function banner(id: TubeCard["id"] | "myth"): string {
  const bg = `<rect width="456" height="112" fill="#101215"/>`;
  let s = "";
  if (id === "tubes") s = Array.from({ length: 30 }, (_, i) => `<rect x="${12 + (i % 15) * 29}" y="${14 + Math.floor(i / 15) * 44}" width="14" height="34" rx="7" fill="#FFB000" opacity=".8"/>`).join("");
  else if (id === "power") s = `<rect x="12" y="34" width="231" height="44" fill="#CC79A7"/><rect x="243" y="34" width="130" height="44" fill="#56B4E9"/><rect x="373" y="34" width="57" height="44" fill="#009E73"/><rect x="430" y="34" width="14" height="44" fill="#F0E442"/>`;
  else if (id === "why") s = [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${12 + i * 62}" y="20" width="56" height="22" fill="${i < 5 ? "#FFB000" : "#1B1D21"}"/><rect x="${12 + i * 62}" y="62" width="56" height="22" fill="#CC79A7"/>`).join("");
  else if (id === "hunt") s = [0, 1, 2].map((i) => `<circle cx="${120 + i * 108}" cy="56" r="30" fill="#000" stroke="#F4EFE3" stroke-width="4"/><text x="${120 + i * 108}" y="68" text-anchor="middle" font-size="34" font-weight="700" fill="#fff" ${FONT}>${i + 1}</text>`).join("");
  else if (id === "week") s = WORK.map((w, i) => `<rect x="40" y="${20 + i * 26}" width="376" height="20" fill="#1B1D21"/><rect x="${40 + (376 * w.from) / 100}" y="${20 + i * 26}" width="${(376 * (w.to - w.from)) / 100}" height="20" fill="#FFB000"/>`).join("");
  else s = `<text x="228" y="76" text-anchor="middle" font-size="60" font-weight="700" fill="#D55E00" ${FONT} letter-spacing="6">MYTH</text>`;
  return svg(`${bg}${s}`, 456, 112, "tb-banner");
}

// ---------------------------------------------------------------- the re-enactment (drawn, never live)

/** Stage-local layout (the stage is x24-1384, y112-1016 in app coordinates). */
export const STAGE = { x: 24, y: 112, w: W, h: H };
export const LAYOUT = {
  plateH: 88,
  /** The four drawn accumulators (306 x 700, on a 326 px pitch). */
  panel: { x: 38, y: 156, w: 306, h: 700, pitch: 326 },
  /** The ten digit-place columns (100 wide, on a 116 px pitch). */
  place: { x: 22, y: 156, w: 1316, h: 720, gx: 150, pitch: 116, colW: 100, colTop: 96, colH: 552 },
  /** The eight tubes (112 x 300, on a 128 px pitch). */
  tube: { x: 176, y: 196, w: 112, h: 300, pitch: 128 },
};

export interface Rect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Hit rects in APP coordinates for each tap step (for the 16 px tolerance of UX 6.6). */
export function targets(step: 2 | 3 | 4): Rect[] {
  const out: Rect[] = [];
  if (step === 2) {
    const p = LAYOUT.panel;
    for (let i = 0; i < 4; i++) out.push({ id: String(i), x: STAGE.x + p.x + i * p.pitch, y: STAGE.y + p.y, w: p.w, h: p.h });
  } else if (step === 3) {
    const q = LAYOUT.place;
    for (let c = 0; c < 10; c++) out.push({ id: String(c), x: STAGE.x + q.x + q.gx + c * q.pitch - q.colW / 2, y: STAGE.y + q.y + q.colTop, w: q.colW, h: q.colH });
  } else {
    const t = LAYOUT.tube;
    for (let i = 0; i < 8; i++) out.push({ id: String(i), x: STAGE.x + t.x + i * t.pitch, y: STAGE.y + t.y, w: t.w, h: t.h });
  }
  return out;
}

function lamp(cx: number, cy: number, r: number, lit: boolean, place: number, digit: number): string {
  const inner = lit
    ? `<circle cx="${cx}" cy="${cy}" r="${r * 2.1}" fill="url(#g-lamp-glow)"/><circle cx="${cx}" cy="${cy}" r="${r * 1.4}" fill="url(#g-lamp-core)" stroke="#8a4b00" stroke-width="1.5"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g-lamp-off)" stroke="#5a4528" stroke-width="2"/>`;
  return `<g class="tl${lit ? " on" : ""}" data-source="script" data-place="${place + 1}" data-digit="${digit}">${inner}</g>`;
}

interface AccOpts {
  w: number;
  h: number;
  gx: number;
  gy: number;
  px: number;
  py: number;
  r: number;
  label: string;
  tall?: boolean;
  slots: { w: number; h: number; dy: number };
}

/** One drawn accumulator: ten places (left to right), lamps 9 (top) down to 0 (bottom) in each, a plug-in slot under each place. */
export function accSvg(digits: number[], o: AccOpts): string {
  const { w, h, gx, gy, px, py, r, label, tall, slots } = o;
  let s = `<rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="#101215"/><rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="8" fill="url(#g-panel)" stroke="#34383f" stroke-width="2"/>`;
  s += `<rect x="${w / 2 - 110}" y="16" width="220" height="${tall ? 56 : 44}" rx="6" fill="#0E0F11" stroke="#D9D0B0" stroke-width="2"/><text x="${w / 2}" y="${tall ? 52 : 46}" text-anchor="middle" font-size="${tall ? 30 : 24}" font-weight="700" fill="#D9D0B0" ${FONT} letter-spacing="2">${esc(label)}</text>`;
  for (let row = 0; row < 10; row++) {
    // Digit 0 is the bottom row and 9 the top, as on the real machine (same rule as app/panels/art.ts, 52105ee).
    const y = gy + (9 - row) * py;
    s += `<text x="${gx - px * 0.8}" y="${y + 8}" text-anchor="middle" font-size="${tall ? 24 : 20}" fill="#9AA0A8" font-family="IBM Plex Mono, monospace">${row}</text>`;
    for (let c = 0; c < 10; c++) s += lamp(gx + c * px, y, r, digits[c] === row, c, row);
  }
  for (let c = 0; c < 10; c++) {
    const x = gx + c * px - slots.w / 2, y = gy + 9 * py + slots.dy;
    s += `<rect x="${x}" y="${y}" width="${slots.w}" height="${slots.h}" rx="6" fill="url(#g-jackblock)" stroke="#8a8470" stroke-width="2"/><rect x="${x + slots.w / 2 - slots.w * 0.28}" y="${y + slots.h / 2 - 4}" width="${slots.w * 0.56}" height="8" rx="4" fill="#3b3326"/>`;
  }
  return s;
}

/** A small drawn accumulator for steps 1, 2 and the fixed state. */
export function panelSvg(digits: number[], i: number): string {
  const { w, h } = LAYOUT.panel;
  const body = accSvg(digits, { w, h, gx: 50, gy: 108, px: 25, py: 40, r: 8, label: TRY.acc(i + 1), slots: { w: 19, h: 56, dy: 44 } });
  const jacks = [0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${50 + k * 41}" cy="${h - 56}" r="10" fill="#000"/>`).join("");
  return svg(`${body}<rect x="20" y="${h - 84}" width="${w - 40}" height="56" rx="6" fill="url(#g-jackblock)" opacity=".9"/>${jacks}`, w, h, "tb-acc");
}

/** The faulty accumulator, filling the stage, for step 3. */
export function placeSvg(digits: number[], acc: number): string {
  const q = LAYOUT.place;
  const body = accSvg(digits, { w: q.w, h: q.h, gx: q.gx, gy: 112, px: q.pitch, py: 44, r: 14, label: TRY.acc(acc), tall: true, slots: { w: 88, h: 60, dy: 52 } });
  const labels = Array.from({ length: 10 }, (_, c) => `<text x="${q.gx + c * q.pitch}" y="${q.h - 40}" text-anchor="middle" font-size="22" font-weight="700" fill="#C9C2A8" ${FONT}>${esc(TRY.placeLabel(c + 1))}</text>`).join("");
  return svg(`${body}${labels}`, q.w, q.h, "tb-acc big");
}

/** One drawn tube (112 x 260): untouched, warm (amber glow) or COLD (blue glow). */
export function tubeSvg(felt: "warm" | "cold" | undefined): string {
  const glow = felt ? `<ellipse cx="56" cy="104" rx="46" ry="62" fill="url(#tb-${felt === "cold" ? "cold" : "heat"})"/>` : "";
  return svg(
    `${glow}<path d="M26 190 V70 Q26 22 56 22 Q86 22 86 70 V190 Z" fill="#1a1c20" stroke="#9AA0A8" stroke-width="3"/><path d="M26 190 V70 Q26 22 56 22 Q86 22 86 70 V190 Z" fill="url(#tb-glass)"/>
    <rect x="44" y="62" width="24" height="84" rx="4" fill="none" stroke="#6B7078" stroke-width="3"/><path d="M50 150 V176 M62 150 V176" stroke="${felt === "warm" ? "#FFB000" : "#6B7078"}" stroke-width="4"/>
    <rect x="22" y="190" width="68" height="26" rx="5" fill="url(#g-rail)" stroke="#2a2d32" stroke-width="2"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="${28 + i * 13}" y="216" width="5" height="14" fill="#C4B994"/>`).join("")}`,
    112,
    260,
    "tb-tube-art",
  );
}

/** The chassis under the tubes on step 4 and 5. */
export function chassisSvg(): string {
  return svg(
    `<rect x="120" y="20" width="1096" height="150" rx="14" fill="url(#g-rail)" stroke="#2a2d32" stroke-width="4"/><rect x="170" y="70" width="996" height="30" rx="6" fill="#26282c"/><rect x="540" y="110" width="256" height="40" rx="10" fill="url(#g-jackblock)" stroke="#8a8470" stroke-width="3"/><text x="668" y="140" text-anchor="middle" font-size="24" font-weight="700" fill="#1B1D21" ${FONT}>${esc(TRY.unitLabel)}</text>`,
    1336,
    200,
    "tb-chassis",
  );
}
