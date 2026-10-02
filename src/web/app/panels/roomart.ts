// Panel art for the whole room (Explore ENIAC panorama, UX 14.3.2), at the
// kit's 300 x 680 card size, drawn at 176 x 400 in the room. Pure string
// builders like panels/art.ts and in its style (charcoal cabinet, engraved
// plate, amber neon, cream jack block).
//
// The kit's own cards are reused where they exist (Initiating Unit,
// Accumulators, Master Programmer, Constant Transmitter, Printer). This file
// adds the units the missions never needed close up: the Cycling Unit as a
// full panel, the Divider and Square-Rooter, the three-panel Multiplier, the
// two-panel Function Tables and their portable carts, the continuation
// panels, and the IBM card reader and punch.
//
// Lamps carry the same IDs as everywhere (lamps/derive.ts), so a live core
// lights them and nothing else can. Knobs and sockets here are decoration:
// they have no IDs and claim no particular setting or wiring.

import { lamp, panelFace, plate, recess, jackBlock, text, C, DEFS } from "./art.ts";

const n1 = (v: number) => Math.round(v * 10) / 10;

/** A decorative knob (no ID, no claim about its setting). */
export function knob(x: number, y: number, r: number, angle: number): string {
  const t = ((angle - 90) * Math.PI) / 180;
  return (
    `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 1.08)}" fill="#050506"/>` +
    `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="url(#g-knob)" stroke="#000" stroke-width="1"/>` +
    `<path d="M${n1(x + r * 0.2 * Math.cos(t))} ${n1(y + r * 0.2 * Math.sin(t))}L${n1(x + r * 0.9 * Math.cos(t))} ${n1(y + r * 0.9 * Math.sin(t))}" stroke="#F4EFE3" stroke-width="${n1(Math.max(1.6, r * 0.16))}" stroke-linecap="round"/>`
  );
}

/** A decorative socket on a jack block (no ID: nothing is plugged here). */
export function socket(x: number, y: number, r: number): string {
  return (
    `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 1.35)}" fill="#BDB28C" stroke="#8a8062" stroke-width="1"/>` +
    `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="url(#g-socket)" stroke="#2c271c" stroke-width="1.2"/>`
  );
}

/** Angles that look set by hand, but are the same every time (no randomness). */
function angleAt(i: number): number {
  return [-120, -60, 0, 45, 90, 135, -30, 30, -90, 120][i % 10];
}

function knobGrid(x0: number, y0: number, cols: number, rows: number, dx: number, dy: number, r: number, seed = 0): string {
  let b = "";
  for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) b += knob(x0 + c * dx, y0 + rr * dy, r, angleAt(seed + rr * cols + c));
  return b;
}

function socketGrid(x0: number, y0: number, cols: number, rows: number, dx: number, dy: number, r: number): string {
  let b = "";
  for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) b += socket(x0 + c * dx, y0 + rr * dy, r);
  return b;
}

function lampRow(ids: string[], x0: number, y: number, dx: number, r: number, labels?: string[]): string {
  let b = "";
  ids.forEach((id, i) => {
    b += lamp(id, x0 + i * dx, y, r);
    if (labels) b += text(x0 + i * dx, y + r + 11, labels[i], { size: 8, weight: 400 });
  });
  return b;
}

const label = (x: number, y: number, s: string) => text(x, y, s, { size: 10, anchor: "start", ls: 1 });

function wrap(body: string, cls: string, standalone = false): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="panel room ${cls}" viewBox="0 0 300 680" width="300" height="680">${standalone ? DEFS : ""}${body}</svg>`;
}

/** The lower jack block every unit has (decoration). */
function jackFooter(rows = 3, cols = 10): string {
  return jackBlock(12, 504, 276, 164) + socketGrid(34, 540, cols, rows, 25.5, 44, 6.5);
}

// ---------------------------------------------------------------- units

/** Cycling Unit as a full panel: the 20 pulse lamps, CCG, 10P and the mode. */
export function cyclingRoomPanel(standalone = false): string {
  let b = panelFace(300, 680) + plate(14, 14, 272, 52, ["CYCLING", "UNIT"], 19);
  b += recess(12, 76, 276, 210);
  b += label(24, 94, "PULSES");
  for (let k = 0; k < 20; k++) {
    const r = Math.floor(k / 10), c = k % 10;
    b += lamp(`lamp:cyc.pulse.${k}`, 42 + c * 24, 118 + r * 40, 7);
    b += text(42 + c * 24, 140 + r * 40, String(k), { size: 8, weight: 400 });
  }
  b += lamp("lamp:cyc.ccg", 48, 216, 7) + text(64, 220, "CCG", { size: 10, anchor: "start", weight: 400 });
  b += lamp("lamp:cyc.tenp", 138, 216, 7) + text(154, 220, "10P", { size: 10, anchor: "start", weight: 400 });
  b += text(200, 262, "MODE", { size: 10, weight: 400 });
  b += `<rect x="226" y="236" width="44" height="36" rx="4" fill="#060607" stroke="#2a2d33"/>`;
  b += text(248, 262, "-", { size: 22, fill: C.lampOn, mono: true, id: "ind:cyc.mode", cls: "ind" });
  b += label(24, 318, "OPERATION");
  b += knob(84, 380, 34, -45) + knob(210, 380, 34, 30);
  b += knob(84, 462, 24, 90) + knob(210, 462, 24, -90);
  b += jackFooter(2, 10);
  return wrap(b, "unit-cy", standalone);
}

/** Divider and Square-Rooter: place and program rings, program flip-flops, flags. */
export function dividerRoomPanel(standalone = false): string {
  let b = panelFace(300, 680) + plate(14, 14, 272, 52, ["DIVIDER AND", "SQUARE ROOTER"], 18);
  b += recess(12, 76, 276, 250);
  b += label(24, 94, "PLACE");
  b += lampRow(Array.from({ length: 12 }, (_, k) => `lamp:div.place.${k}`), 34, 110, 21.5, 6, Array.from({ length: 12 }, (_, k) => String(k)));
  b += label(24, 146, "PROGRAM");
  b += lampRow(Array.from({ length: 10 }, (_, k) => `lamp:div.prog.${k}`), 34, 162, 21.5, 6, Array.from({ length: 10 }, (_, k) => String(k)));
  b += label(24, 198, "PROGRAM FLIP-FLOPS");
  b += lampRow(Array.from({ length: 8 }, (_, k) => `lamp:div.ff.${k + 1}`), 34, 214, 26, 6.5);
  b += label(24, 244, "CONTROL");
  for (let k = 0; k < 30; k++) {
    const r = Math.floor(k / 15), c = k % 15;
    b += lamp(`lamp:div.flag.${k + 1}`, 30 + c * 17, 262 + r * 22, 5);
  }
  b += knobGrid(44, 372, 6, 2, 42, 64, 14, 3);
  b += jackFooter(3, 10);
  return wrap(b, "unit-d", standalone);
}

/** The High-Speed Multiplier's three panels: stage and reset (1), program flip-flops 1-12 (2) and 13-24 (3). */
export function multiplierRoomPanel(i: 0 | 1 | 2, standalone = false): string {
  const titles = [["HIGH-SPEED", "MULTIPLIER"], ["MULTIPLIER", "2 OF 3"], ["MULTIPLIER", "3 OF 3"]][i];
  let b = panelFace(300, 680) + plate(14, 14, 272, 52, titles, 19);
  b += recess(12, 76, 276, 170);
  if (i === 0) {
    b += label(24, 94, "STAGE");
    for (let k = 0; k <= 13; k++) {
      const r = Math.floor(k / 7), c = k % 7;
      b += lamp(`lamp:mult.stage.${k}`, 44 + c * 36, 118 + r * 44, 8);
      b += text(44 + c * 36, 142 + r * 44, String(k), { size: 8, weight: 400 });
    }
    b += label(24, 212, "RESET");
    b += lamp("lamp:mult.r1", 110, 222, 7) + text(124, 226, "R1", { size: 9, anchor: "start", weight: 400 });
    b += lamp("lamp:mult.r3", 190, 222, 7) + text(204, 226, "R3", { size: 9, anchor: "start", weight: 400 });
  } else {
    b += label(24, 94, "PROGRAM");
    const first = i === 1 ? 1 : 13;
    for (let k = 0; k < 12; k++) {
      const r = Math.floor(k / 6), c = k % 6;
      b += lamp(`lamp:mult.prog.${first + k}`, 50 + c * 40, 124 + r * 56, 8);
      b += text(50 + c * 40, 150 + r * 56, String(first + k), { size: 9, weight: 400 });
    }
  }
  b += knobGrid(42, 290, 6, 3, 43, 66, 13, i * 5);
  b += jackFooter(3, 10);
  return wrap(b, `unit-m unit-m${i + 1}`, standalone);
}

/** Function Table u, panel 1: the ring, add/sub/argument lamps and the argument; panel 2: switch banks. */
export function functionTableRoomPanel(u: number, i: 0 | 1, standalone = false): string {
  let b = panelFace(300, 680) + plate(14, 14, 272, 52, i === 0 ? ["FUNCTION", `TABLE ${u}`] : ["FUNCTION TABLE", "(CONTINUED)"], 19);
  if (i === 0) {
    b += recess(12, 76, 276, 236);
    b += label(24, 94, "RING");
    for (let k = 0; k <= 12; k++) {
      const r = Math.floor(k / 7), c = k % 7;
      b += lamp(`lamp:ft.${u}.ring.${k}`, 44 + c * 36, 114 + r * 40, 7);
      b += text(44 + c * 36, 136 + r * 40, String(k - 3), { size: 8, weight: 400 });
    }
    ([["add", "ADD"], ["sub", "SUB"], ["argset", "ARG"]] as const).forEach(([k, l], j) => {
      b += lamp(`lamp:ft.${u}.${k}`, 60 + j * 80, 194, 7) + text(74 + j * 80, 198, l, { size: 9, anchor: "start", weight: 400 });
    });
    b += label(24, 226, "ARGUMENT");
    b += lampRow(Array.from({ length: 10 }, (_, v) => `lamp:ft.${u}.arg10.${v}`), 42, 246, 24, 5.5);
    b += lampRow(Array.from({ length: 10 }, (_, v) => `lamp:ft.${u}.arg1.${v}`), 42, 276, 24, 5.5, Array.from({ length: 10 }, (_, v) => String(v)));
    b += knobGrid(42, 350, 6, 2, 43, 66, 13, u);
  } else {
    b += knobGrid(32, 98, 8, 6, 34, 64, 11, u + 4);
  }
  b += jackFooter(3, 10);
  return wrap(b, `unit-f${u}`, standalone);
}

/** A continuation panel: switch banks and jacks (Master Programmer, Constant Transmitter, Printer). */
export function continuedRoomPanel(lines: string[], seed: number, standalone = false): string {
  let b = panelFace(300, 680) + plate(14, 14, 272, 52, lines, 18);
  b += recess(12, 76, 276, 412);
  b += knobGrid(36, 108, 7, 6, 38, 66, 11, seed);
  b += jackFooter(3, 10);
  return wrap(b, "continued", standalone);
}

// ---------------------------------------------------------------- furniture (decoration)

/** A blank cream punch card (cut corner). */
function card(x: number, y: number, w: number, h: number): string {
  const c = Math.min(8, h * 0.25);
  return `<path d="M${x + c} ${y}H${x + w}V${y + h}H${x}V${y + c}Z" fill="#EFE6CC" stroke="#8f8566" stroke-width="1"/>`;
}

/** A portable function table: switches on a wheeled cart (220 x 132). */
export function portableTableSvg(): string {
  let b = `<path d="M18 24H202L192 104H28Z" fill="#26292e" stroke="#4a4e57" stroke-width="2"/>`;
  b += `<rect x="10" y="12" width="200" height="16" rx="3" fill="#1b1d21" stroke="#5b606a" stroke-width="1.5"/>`;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) b += knob(36 + c * 18.5, 44 + r * 20, 6.5, angleAt(r * 9 + c));
  b += text(110, 24, "PORTABLE TABLE", { size: 10, fill: C.plateInk, ls: 1 });
  b += `<path d="M40 104V114M180 104V114" stroke="#5b606a" stroke-width="4"/>`;
  b += `<circle cx="44" cy="118" r="12" fill="#0b0c0e" stroke="#9aa0a8" stroke-width="3"/><circle cx="176" cy="118" r="12" fill="#0b0c0e" stroke="#9aa0a8" stroke-width="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="cart-art" viewBox="0 0 220 132" width="220" height="132" aria-hidden="true">${b}</svg>`;
}

/** The IBM card reader (at the foot of the Constant Transmitter) or card punch (at the foot of the Printer), 190 x 124. */
export function ibmMachineSvg(kind: "reader" | "punch"): string {
  let b = `<rect x="6" y="30" width="178" height="90" rx="8" fill="#2a2d33" stroke="#5b606a" stroke-width="2"/>`;
  b += `<rect x="16" y="40" width="158" height="30" rx="4" fill="#15171a" stroke="#4a4e57"/>`;
  b += text(95, 61, kind === "reader" ? "IBM CARD READER" : "IBM CARD PUNCH", { size: 12, fill: C.plateInk, ls: 1 });
  if (kind === "reader") {
    b += `<path d="M120 30L134 6H176L170 30Z" fill="#1d1f24" stroke="#5b606a" stroke-width="1.5"/>`;
    for (let i = 0; i < 4; i++) b += card(130 + i * 2, 10 + i * 4, 40, 14);
  } else {
    for (let i = 0; i < 5; i++) b += card(24, 82 + i * 6, 56, 14);
    for (let i = 0; i < 5; i++) b += `<rect x="${104 + i * 12}" y="84" width="7" height="22" rx="2" fill="#0B0C0E" stroke="#4a4e57"/>`;
  }
  b += `<rect x="20" y="112" width="150" height="8" rx="2" fill="#15171a"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="ibm-art" viewBox="0 0 190 124" width="190" height="124" aria-hidden="true">${b}</svg>`;
}
