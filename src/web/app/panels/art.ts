// SVG panel kit for the Squares units (issue #14, UX 6.1-6.3, architecture 6.1).
//
// Pure string builders: no DOM. The same code
//   - renders the panels at runtime (screens insert the markup), and
//   - generates the committed panels/*.svg files (scripts/gen-panels.ts),
// so art, IDs and cable geometry can never drift apart. The ID grammar is the
// contract (panels/README.md); positions are art.
//
// Look: charcoal panels (#1B1D21) with a darker cabinet, engraved plates,
// cream jack blocks (#D8CFAE) with dark sockets, black knobs with a white
// pointer, and amber neon lamps with a soft glow.

export interface Pt {
  x: number;
  y: number;
  r: number;
}
export interface SwitchGeom extends Pt {
  positions: string[];
  value: string;
}
export interface PanelGeom {
  w: number;
  h: number;
  jacks: Record<string, Pt>; // "jack:a1.α" -> centre
  switches: Record<string, SwitchGeom>; // "sw:a1.rp6"
  trunks: Record<string, { y: number; x0: number; x1: number }>; // "trunk:1"
  lamps: string[]; // every lamp id in the panel
}
export interface Panel {
  name: string;
  markup: string;
  geom: PanelGeom;
}

// ---------------------------------------------------------------- palette

export const C = {
  cabinet: "#101215",
  panel: "#1B1D21",
  recess: "#0B0C0E",
  jackBlock: "#D8CFAE",
  plateInk: "#D9D0B0",
  engrave: "#8A8E96",
  ink: "#1B1D21",
  lampOn: "#FFB000",
  lampOff: "#3A2E1E",
};

const FONT_UI = "Atkinson Hyperlegible, sans-serif";
const FONT_MONO = "IBM Plex Mono, monospace";

// Shared gradients. At runtime they are injected once (injectDefs in
// panels/load.ts); the standalone .svg files embed them.
export const DEFS = `<defs>
<radialGradient id="g-lamp-glow"><stop offset="0" stop-color="#FFB000" stop-opacity=".8"/><stop offset=".45" stop-color="#FF9A00" stop-opacity=".32"/><stop offset="1" stop-color="#FF7A00" stop-opacity="0"/></radialGradient>
<radialGradient id="g-lamp-core" cx=".42" cy=".38" r=".62"><stop offset="0" stop-color="#FFF7D6"/><stop offset=".3" stop-color="#FFD35A"/><stop offset=".72" stop-color="#FFB000"/><stop offset="1" stop-color="#C96A00"/></radialGradient>
<radialGradient id="g-lamp-off" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#4A3A26"/><stop offset="1" stop-color="#17120C"/></radialGradient>
<linearGradient id="g-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262a30"/><stop offset=".5" stop-color="#1B1D21"/><stop offset="1" stop-color="#15171a"/></linearGradient>
<linearGradient id="g-jackblock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6DEC1"/><stop offset=".6" stop-color="#D8CFAE"/><stop offset="1" stop-color="#C4B994"/></linearGradient>
<radialGradient id="g-knob" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#6A6E76"/><stop offset=".35" stop-color="#26282c"/><stop offset="1" stop-color="#060607"/></radialGradient>
<radialGradient id="g-socket" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#000"/><stop offset=".8" stop-color="#15130f"/><stop offset="1" stop-color="#3a3326"/></radialGradient>
<linearGradient id="g-rail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A3A8B0"/><stop offset=".45" stop-color="#6B7078"/><stop offset="1" stop-color="#3A3D43"/></linearGradient>
<radialGradient id="g-screw" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#9aa0a8"/><stop offset="1" stop-color="#3a3e44"/></radialGradient>
</defs>`;

// ---------------------------------------------------------------- primitives

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const n1 = (v: number) => Math.round(v * 10) / 10;

export function text(
  x: number,
  y: number,
  s: string,
  o: { size?: number; fill?: string; weight?: string | number; anchor?: string; mono?: boolean; cls?: string; id?: string; ls?: number } = {},
): string {
  return `<text${o.id ? ` id="${esc(o.id)}"` : ""}${o.cls ? ` class="${o.cls}"` : ""} x="${n1(x)}" y="${n1(y)}" font-family="${o.mono ? FONT_MONO : FONT_UI}" font-size="${o.size ?? 12}" font-weight="${o.weight ?? 700}" fill="${o.fill ?? C.engrave}" text-anchor="${o.anchor ?? "middle"}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${esc(s)}</text>`;
}

/** A neon lamp. `.lamp.on` shows the glow and the 1.4x core (styles/panels.css). */
export function lamp(id: string, x: number, y: number, r: number): string {
  return `<g id="${esc(id)}" class="lamp"><circle class="lamp-off" cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="url(#g-lamp-off)" stroke="#6A5436" stroke-opacity=".7" stroke-width="1"/><g class="lamp-lit"><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 2.1)}" fill="url(#g-lamp-glow)"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 1.4 * 0.72)}" fill="url(#g-lamp-core)"/></g></g>`;
}

export function screw(x: number, y: number): string {
  return `<circle cx="${x}" cy="${y}" r="5" fill="url(#g-screw)" stroke="#0a0a0b" stroke-width="1"/><path d="M${x - 3.2} ${y + 1.2}L${x + 3.2} ${y - 1.2}" stroke="#202226" stroke-width="1.4"/>`;
}

/** Charcoal cabinet face with bevel and corner screws. */
export function panelFace(w: number, h: number): string {
  return (
    `<rect x="0" y="0" width="${w}" height="${h}" rx="6" fill="${C.cabinet}"/>` +
    `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="5" fill="url(#g-panel)" stroke="#34383f" stroke-width="1"/>` +
    `<path d="M4 ${h - 4}V4H${w - 4}" fill="none" stroke="#3b3f47" stroke-width="1.5" opacity=".7"/>` +
    `<path d="M4 ${h - 4}H${w - 4}V4" fill="none" stroke="#050506" stroke-width="1.5" opacity=".8"/>` +
    screw(12, 12) +
    screw(w - 12, 12) +
    screw(12, h - 12) +
    screw(w - 12, h - 12)
  );
}

/** Engraved title plate. */
export function plate(x: number, y: number, w: number, h: number, lines: string[], size = 24): string {
  let out =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#0E0F11" stroke="#4a4e57" stroke-width="1.2"/>` +
    `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="3" fill="none" stroke="#24262b" stroke-width="1"/>`;
  const lh = size * 1.05;
  const top = y + h / 2 - ((lines.length - 1) * lh) / 2 + size * 0.36;
  lines.forEach((l, i) => {
    out += text(x + w / 2, top + i * lh, l, { size, fill: C.plateInk, ls: 1.5 });
  });
  return out;
}

export function recess(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.recess}" stroke="#000" stroke-width="1"/><path d="M${x + 2} ${y + h - 2}H${x + w - 2}" stroke="#2c2f35" stroke-width="1"/>`;
}

export function jackBlock(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#g-jackblock)" stroke="#8f8566" stroke-width="1.2"/><path d="M${x + 3} ${y + 2}H${x + w - 3}" stroke="#F4EEDA" stroke-width="1.2" opacity=".8"/>`;
}

/** A jack socket on a cream block. id is "jack:<term>" or "trunk:<n>". */
export function jack(id: string, x: number, y: number, r: number, label?: string, labelSize = 10): string {
  let out = `<g id="${esc(id)}" class="jack">`;
  out += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 1.35)}" fill="#BDB28C" stroke="#8a8062" stroke-width="1"/>`;
  out += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="url(#g-socket)" stroke="#2c271c" stroke-width="1.2"/>`;
  out += `<circle cx="${n1(x - r * 0.25)}" cy="${n1(y - r * 0.3)}" r="${n1(r * 0.28)}" fill="#3b3a36" opacity=".55"/>`;
  out += `</g>`;
  if (label) out += text(x, y + r * 1.35 + labelSize + 2, label, { size: labelSize, fill: C.ink });
  return out;
}

export function dialAngle(positions: string[], value: string): number {
  const i = Math.max(0, positions.indexOf(value));
  if (positions.length <= 1) return 0;
  return -135 + (i * 270) / (positions.length - 1);
}

/** A rotary switch knob with a white pointer. id is "sw:<unit>.<switch>". */
export function dial(id: string, x: number, y: number, r: number, positions: string[], value: string, ticks = true): string {
  const a = dialAngle(positions, value);
  let out = `<g id="${esc(id)}" class="dial" data-positions="${esc(positions.join("|"))}" data-value="${esc(value)}" data-cx="${n1(x)}" data-cy="${n1(y)}">`;
  if (ticks) {
    positions.forEach((_, i) => {
      const t = ((-135 + (i * 270) / Math.max(1, positions.length - 1) - 90) * Math.PI) / 180;
      const r1 = r * 1.18;
      const r2 = r * 1.36;
      out += `<path d="M${n1(x + r1 * Math.cos(t))} ${n1(y + r1 * Math.sin(t))}L${n1(x + r2 * Math.cos(t))} ${n1(y + r2 * Math.sin(t))}" stroke="#9aa0a8" stroke-width="${r > 30 ? 2 : 1}" stroke-linecap="round"/>`;
    });
  }
  out += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 1.08)}" fill="#050506"/>`;
  out += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="url(#g-knob)" stroke="#000" stroke-width="1"/>`;
  out += `<g class="dial-pointer" transform="rotate(${n1(a)} ${n1(x)} ${n1(y)})"><path d="M${n1(x)} ${n1(y - r * 0.92)}L${n1(x)} ${n1(y - r * 0.2)}" stroke="#F4EFE3" stroke-width="${n1(Math.max(1.6, r * 0.14))}" stroke-linecap="round"/></g>`;
  out += `</g>`;
  return out;
}

function wrapSvg(w: number, h: number, body: string, standalone: boolean, cls: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="panel ${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${standalone ? DEFS : ""}${body}</svg>`;
}

function emptyGeom(w: number, h: number): PanelGeom {
  return { w, h, jacks: {}, switches: {}, trunks: {}, lamps: [] };
}

// ---------------------------------------------------------------- catalogs

export const GREEK = ["α", "β", "γ", "δ", "ε"];
export const ACC_OP = ["α", "β", "γ", "δ", "ε", "0", "A", "AS", "S"];
export const ACC_RP = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
export const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
export const CT_SEL = ["0", "Al", "Ar", "Alr", "Bl", "Br", "Blr", "Cl", "Cr", "Clr", "Dl", "Dr", "Dlr", "El", "Er", "Elr", "Fl", "Fr", "Flr", "Gl", "Gr", "Glr", "Hl", "Hr", "Hlr", "Jl", "Jr", "Jlr", "Kl", "Kr", "Klr"];

/** Default value a switch shows before config/steps set it. */
export function switchDefault(swId: string): string {
  if (/\.rp\d+$/.test(swId)) return "1";
  if (/\.op\d+$/.test(swId)) return "0";
  if (/c\.s\d+$/.test(swId)) return "0";
  return "0";
}

// ---------------------------------------------------------------- accumulator (workbench card)

export const CARD_W = 300;
export const CARD_H = 680;

export function accumulatorPanel(n: number, standalone = false): Panel {
  const W = CARD_W, H = CARD_H;
  const g = emptyGeom(W, H);
  const a = `a${n}`;
  let b = panelFace(W, H);
  b += plate(14, 14, W - 28, 52, [`ACCUMULATOR ${n}`]);

  // Lamp band: sign + 10 digit columns x rows 0..9 (UX 6.2: 14 px lamps).
  b += recess(12, 76, W - 24, 252);
  const col = (d: number) => 68 + (d - 1) * 22.4;
  const row = (v: number) => 102 + v * 16;
  b += text(26, 92, "±", { size: 11 });
  for (let v = 0; v <= 9; v++) b += text(50, row(v) + 3.5, String(v), { size: 10, weight: 400 });
  for (const [s, v] of [["P", 0], ["M", 1]] as const) {
    const id = `lamp:acc.${n}.sign.${s}`;
    b += lamp(id, 24, row(v), 6.5);
    g.lamps.push(id);
  }
  b += text(36, row(0) + 3.5, "P", { size: 8, weight: 400 });
  b += text(36, row(1) + 3.5, "M", { size: 8, weight: 400 });
  for (let d = 1; d <= 10; d++) {
    for (let v = 0; v <= 9; v++) {
      const id = `lamp:acc.${n}.d.${d}.${v}`;
      b += lamp(id, col(d), row(v), 7);
      g.lamps.push(id);
    }
  }
  // Carry, repeat and program flip-flops.
  b += text(40, 272, "CY", { size: 8, weight: 400 });
  for (let d = 1; d <= 10; d++) {
    const id = `lamp:acc.${n}.carry.${d}`;
    b += lamp(id, col(d), 269, 4.5);
    g.lamps.push(id);
  }
  b += text(40, 295, "RPT", { size: 8, weight: 400 });
  for (let v = 0; v <= 9; v++) {
    const id = `lamp:acc.${n}.rep.${v}`;
    b += lamp(id, col(v + 1), 292, 4.5);
    g.lamps.push(id);
  }
  b += text(40, 318, "PRG", { size: 8, weight: 400 });
  for (let p = 1; p <= 12; p++) {
    const id = `lamp:acc.${n}.prog.${p}`;
    b += lamp(id, 60 + (p - 1) * 19, 315, 4.5);
    g.lamps.push(id);
  }

  // Dial band: operation and repeat switches for programs 5..12.
  b += text(24, 356, "OPERATION", { size: 10, anchor: "start", ls: 1 });
  b += text(24, 432, "REPEAT", { size: 10, anchor: "start", ls: 1 });
  for (let p = 5; p <= 12; p++) {
    const x = 42 + (p - 5) * 31;
    b += text(x, 372, String(p), { size: 9, weight: 400 });
    const op = `sw:${a}.op${p}`;
    b += dial(op, x, 394, 11, ACC_OP, switchDefault(op), false);
    g.switches[op] = { x, y: 394, r: 11, positions: ACC_OP, value: switchDefault(op) };
    b += text(x, 448, String(p), { size: 9, weight: 400 });
    const rp = `sw:${a}.rp${p}`;
    b += dial(rp, x, 470, 11, ACC_RP, switchDefault(rp), false);
    g.switches[rp] = { x, y: 470, r: 11, positions: ACC_RP, value: switchDefault(rp) };
  }

  // Jack band: data in α..ε, data out A and S, program in 1i..12i, out 5o..12o.
  b += jackBlock(12, 504, W - 24, 164);
  GREEK.forEach((l, i) => {
    const id = `jack:${a}.${l}`;
    const x = 34 + i * 34;
    b += jack(id, x, 532, 10, l, 13);
    g.jacks[id] = { x, y: 532, r: 10 };
  });
  (["A", "S"] as const).forEach((l, i) => {
    const id = `jack:${a}.${l}`;
    const x = 222 + i * 42;
    b += jack(id, x, 532, 11, l, 13);
    g.jacks[id] = { x, y: 532, r: 11 };
  });
  b += `<path d="M24 568H276" stroke="#a89d78" stroke-width="1"/>`;
  b += text(24, 584, "PROGRAM IN", { size: 9, anchor: "start", fill: C.ink, ls: 1 });
  b += text(24, 632, "PROGRAM OUT", { size: 9, anchor: "start", fill: C.ink, ls: 1 });
  for (let p = 1; p <= 12; p++) {
    const x = 30 + (p - 1) * 21.8;
    const id = `jack:${a}.${p}i`;
    b += jack(id, x, 603, 6.5, String(p), 8);
    g.jacks[id] = { x, y: 603, r: 6.5 };
    if (p >= 5) {
      const oid = `jack:${a}.${p}o`;
      b += jack(oid, x, 648, 6.5);
      g.jacks[oid] = { x, y: 648, r: 6.5 };
    }
  }
  return { name: `accumulator-${n}`, markup: wrapSvg(W, H, b, standalone, `unit-${a}`), geom: g };
}

// ---------------------------------------------------------------- constant transmitter

export function constantPanel(standalone = false): Panel {
  const W = CARD_W, H = CARD_H;
  const g = emptyGeom(W, H);
  let b = panelFace(W, H);
  b += plate(14, 14, W - 28, 52, ["CONSTANT TRANSMITTER"], 19);

  // Program lamps ct.1..30.
  b += recess(12, 76, W - 24, 112);
  b += text(24, 94, "PROGRAM", { size: 10, anchor: "start", ls: 1 });
  for (let p = 1; p <= 30; p++) {
    const r = Math.floor((p - 1) / 10), c = (p - 1) % 10;
    const id = `lamp:ct.${p}`;
    b += lamp(id, 42 + c * 24, 116 + r * 26, 7);
    g.lamps.push(id);
  }

  // J and K constant dials (digit 10 on the left, digit 1 on the right).
  for (const [k, y] of [["j", 232], ["k", 300]] as const) {
    b += text(24, y - 26, k === "j" ? "J CONSTANT" : "K CONSTANT", { size: 10, anchor: "start", ls: 1 });
    for (let d = 10; d >= 1; d--) {
      const x = 36 + (10 - d) * 25.3;
      const id = `sw:c.${k}${d}`;
      b += dial(id, x, y, 10.5, DIGITS, "0", false);
      g.switches[id] = { x, y, r: 10.5, positions: DIGITS, value: "0" };
      b += text(x, y + 24, String(d), { size: 8, weight: 400 });
    }
  }
  // Program selector switches c.s1..c.s30.
  b += text(24, 352, "SELECTORS", { size: 10, anchor: "start", ls: 1 });
  for (let p = 1; p <= 30; p++) {
    const r = Math.floor((p - 1) / 10), c = (p - 1) % 10;
    const id = `sw:c.s${p}`;
    const x = 42 + c * 24, y = 378 + r * 38;
    b += dial(id, x, y, 8.5, CT_SEL, "0", false);
    g.switches[id] = { x, y, r: 8.5, positions: CT_SEL, value: "0" };
    b += text(x, y + 20, String(p), { size: 7, weight: 400 });
  }

  // Jacks: output and program inputs.
  b += jackBlock(12, 504, W - 24, 164);
  b += text(24, 524, "PROGRAM IN", { size: 9, anchor: "start", fill: C.ink, ls: 1 });
  for (let p = 1; p <= 30; p++) {
    const r = Math.floor((p - 1) / 10), c = (p - 1) % 10;
    const id = `jack:c.${p}i`;
    const x = 30 + c * 19.5, y = 548 + r * 40;
    b += jack(id, x, y, 6, String(p), 8);
    g.jacks[id] = { x, y, r: 6 };
  }
  b += text(254, 524, "OUT", { size: 12, fill: C.ink, ls: 1 });
  b += jack("jack:c.o", 254, 574, 14, "O", 13);
  g.jacks["jack:c.o"] = { x: 254, y: 574, r: 14 };
  return { name: "constant", markup: wrapSvg(W, H, b, standalone, "unit-c"), geom: g };
}

// ---------------------------------------------------------------- initiating unit

/** Init lamp names in `init` string order (architecture 5.1 / 6.1). */
export const INIT_LAMPS: [string, number][] = [
  ["clear.1", 0], ["clear.2", 1], ["clear.3", 2], ["clear.4", 3], ["clear.5", 4], ["clear.6", 5],
  ["rdff", 6], ["prff", 7], ["rdfinish", 8], ["rdilock", 9], ["rdsync", 10], ["g66", 13], ["g69", 14],
];

export function initiatingPanel(standalone = false): Panel {
  const W = CARD_W, H = CARD_H;
  const g = emptyGeom(W, H);
  let b = panelFace(W, H);
  b += plate(14, 14, W - 28, 52, ["INITIATING UNIT"], 22);

  b += recess(12, 76, W - 24, 176);
  b += text(24, 96, "SELECTIVE CLEAR", { size: 10, anchor: "start", ls: 1 });
  for (let i = 1; i <= 6; i++) {
    const id = `lamp:init.clear.${i}`;
    const x = 44 + (i - 1) * 42;
    b += lamp(id, x, 120, 7);
    b += text(x, 142, String(i), { size: 9, weight: 400 });
    g.lamps.push(id);
  }
  const rest: [string, string][] = [["rdff", "RD"], ["prff", "PR"], ["rdfinish", "RDF"], ["rdilock", "RDI"], ["rdsync", "SYN"], ["g66", "G66"], ["g69", "G69"]];
  b += text(24, 166, "READER / PRINTER / GATES", { size: 10, anchor: "start", ls: 1 });
  rest.forEach(([k, lab], i) => {
    const id = `lamp:init.${k}`;
    const x = 38 + i * 37;
    b += lamp(id, x, 192, 7);
    b += text(x, 216, lab, { size: 8, weight: 400 });
    g.lamps.push(id);
  });

  // Decorative push buttons (the real INIT is the kiosk's own button).
  const btn = (x: number, y: number, label: string) =>
    `<circle cx="${x}" cy="${y}" r="24" fill="#0a0a0b" stroke="#3a3d44" stroke-width="2"/><circle cx="${x}" cy="${y}" r="17" fill="url(#g-knob)"/>` +
    text(x, y + 44, label, { size: 10, ls: 1 });
  b += btn(70, 300, "INITIATE");
  b += btn(150, 300, "CLEAR");
  b += btn(230, 300, "READ");
  b += `<rect x="40" y="380" width="220" height="90" rx="6" fill="#141619" stroke="#2e3137"/>`;
  b += text(150, 410, "HEATERS", { size: 10, ls: 1 });
  for (let i = 0; i < 4; i++) b += `<rect x="${62 + i * 48}" y="424" width="14" height="30" rx="3" fill="#2a2d33" stroke="#000"/><rect x="${64 + i * 48}" y="${i % 2 ? 440 : 426}" width="10" height="12" rx="2" fill="#c9c2a8"/>`;

  // Jacks. i.io (initiating pulse out) is the Squares target; the rest are
  // real neighbours used as decoys. Non-M1 names are provisional until the
  // econfig jack grammar (#9) lands.
  b += jackBlock(12, 504, W - 24, 164);
  const top: [string, string, number][] = [["i.io", "Io", 13], ["i.ri", "Ri", 9], ["i.ro", "Ro", 9], ["i.pi", "Pi", 9], ["i.po", "Po", 9]];
  top.forEach(([t, lab, r], i) => {
    const id = `jack:${t}`;
    const x = i === 0 ? 44 : 104 + (i - 1) * 46;
    b += jack(id, x, 536, r, lab, 12);
    g.jacks[id] = { x, y: 536, r };
  });
  b += text(24, 586, "CLEAR IN / OUT", { size: 9, anchor: "start", fill: C.ink, ls: 1 });
  for (let i = 1; i <= 6; i++) {
    const x = 44 + (i - 1) * 42;
    const ci = `jack:i.ci${i}`, co = `jack:i.co${i}`;
    b += jack(ci, x, 606, 6.5, String(i), 8);
    b += jack(co, x, 648, 6.5);
    g.jacks[ci] = { x, y: 606, r: 6.5 };
    g.jacks[co] = { x, y: 648, r: 6.5 };
  }
  return { name: "initiating", markup: wrapSvg(W, H, b, standalone, "unit-i"), geom: g };
}

// ---------------------------------------------------------------- cycling unit (strip)

export function cyclingPanel(standalone = false): Panel {
  const W = 640, H = 96;
  const g = emptyGeom(W, H);
  let b = panelFace(W, H);
  b += plate(16, 18, 150, 60, ["CYCLING", "UNIT"], 18);
  b += recess(180, 12, 448, 72);
  for (let k = 0; k < 20; k++) {
    const id = `lamp:cyc.pulse.${k}`;
    const x = 200 + k * 21;
    b += lamp(id, x, 36, 6.5);
    g.lamps.push(id);
    if (k % 5 === 0) b += text(x, 60, String(k), { size: 9, weight: 400 });
  }
  b += lamp("lamp:cyc.ccg", 212, 70, 5);
  b += text(240, 74, "CCG", { size: 9, weight: 400 });
  b += lamp("lamp:cyc.tenp", 280, 70, 5);
  b += text(306, 74, "10P", { size: 9, weight: 400 });
  g.lamps.push("lamp:cyc.ccg", "lamp:cyc.tenp");
  b += text(560, 76, "MODE", { size: 9, weight: 400 });
  b += text(604, 78, "-", { size: 20, fill: C.lampOn, mono: true, id: "ind:cyc.mode", cls: "ind" });
  return { name: "cycling", markup: wrapSvg(W, H, b, standalone, "unit-cyc"), geom: g };
}

// ---------------------------------------------------------------- trunk rails

export const DATA_TRUNKS = ["1", "2", "3"];
export const PROGRAM_TRUNKS = ["1-1", "1-2", "1-3", "1-4", "1-5"];

function rail(name: string, w: number, h: number, title: string, trunks: string[], y0: number, pitch: number, standalone: boolean): Panel {
  const g = emptyGeom(w, h);
  let b = `<rect x="0" y="0" width="${w}" height="${h}" rx="6" fill="#0d0e10" stroke="#2c2f35"/>`;
  b += text(12, 13, title, { size: 10, anchor: "start", ls: 1.5 });
  trunks.forEach((t, i) => {
    const y = y0 + i * pitch;
    const id = `trunk:${t}`;
    b += `<g id="${esc(id)}" class="trunk"><rect x="64" y="${y - 3.5}" width="${w - 76}" height="7" rx="3.5" fill="url(#g-rail)" stroke="#1a1c20" stroke-width="1"/>`;
    b += `<rect x="12" y="${y - 6.5}" width="44" height="13" rx="3" fill="${C.jackBlock}" stroke="#8f8566"/>`;
    b += text(34, y + 4, t, { size: 11, fill: C.ink, mono: true });
    b += `</g>`;
    g.trunks[id] = { y, x0: 64, x1: w - 12 };
  });
  return { name, markup: wrapSvg(w, h, b, standalone, `trunkrail ${name}`), geom: g };
}

export const STAGE_W = 1360;
export function dataTrunkRail(standalone = false): Panel {
  return rail("trunks-data", STAGE_W, 70, "DATA TRUNKS", DATA_TRUNKS, 26, 16, standalone);
}
export function programTrunkRail(standalone = false): Panel {
  return rail("trunks-program", STAGE_W, 104, "PROGRAM TRUNKS", PROGRAM_TRUNKS, 27, 17, standalone);
}

// ---------------------------------------------------------------- run-view lamp grid (UX 6.2: 26 px lamps, 52x38 pitch)

export const RUN_GRID_W = 640;
export const RUN_GRID_H = 540;

export function accumulatorRunGrid(n: number, standalone = false): Panel {
  const W = RUN_GRID_W, H = RUN_GRID_H;
  const g = emptyGeom(W, H);
  let b = panelFace(W, H);
  b += recess(14, 14, W - 28, 420);
  const col = (d: number) => 128 + (d - 1) * 52;
  const row = (v: number) => 46 + v * 38;
  for (let v = 0; v <= 9; v++) b += text(32, row(v) + 8, String(v), { size: 24, weight: 400, fill: "#9aa0a8", mono: true });
  for (const [s, v] of [["P", 0], ["M", 1]] as const) {
    const id = `lamp:acc.${n}.sign.${s}`;
    b += lamp(id, 74, row(v), 13);
    g.lamps.push(id);
  }
  b += text(74, row(2) + 8, "±", { size: 24, weight: 400, fill: "#9aa0a8" });
  b += `<path d="M100 30V420" stroke="#2a2d33" stroke-width="2"/>`;
  for (let d = 1; d <= 10; d++) {
    for (let v = 0; v <= 9; v++) {
      const id = `lamp:acc.${n}.d.${d}.${v}`;
      b += lamp(id, col(d), row(v), 13);
      g.lamps.push(id);
    }
  }
  // Repeat counter and program flip-flops (smaller).
  b += text(28, 470, "REPEAT", { size: 16, anchor: "start", ls: 1 });
  for (let v = 0; v <= 9; v++) {
    const id = `lamp:acc.${n}.rep.${v}`;
    b += lamp(id, col(v + 1), 464, 8);
    g.lamps.push(id);
  }
  b += text(28, 512, "PROGRAM", { size: 16, anchor: "start", ls: 1 });
  for (let p = 1; p <= 12; p++) {
    const id = `lamp:acc.${n}.prog.${p}`;
    const x = 128 + (p - 1) * 41;
    b += lamp(id, x, 506, 8);
    g.lamps.push(id);
  }
  return { name: `accumulator-run-${n}`, markup: wrapSvg(W, H, b, standalone, `rungrid unit-a${n}`), geom: g };
}

/** Every panel in the kit, for the generator and the coverage test. */
export function allPanels(standalone = false): Panel[] {
  return [
    initiatingPanel(standalone),
    cyclingPanel(standalone),
    constantPanel(standalone),
    accumulatorPanel(1, standalone),
    accumulatorPanel(2, standalone),
    accumulatorRunGrid(1, standalone),
    accumulatorRunGrid(2, standalone),
    dataTrunkRail(standalone),
    programTrunkRail(standalone),
  ];
}
