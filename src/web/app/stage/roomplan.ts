// L0 room plan (UX 4.1, 8.1.4 step 0a): the U-shaped room seen from above,
// with the mission's units flagged by numbered markers. Static: no machine
// state is drawn here (no fake lamps).

import { text } from "../panels/art.ts";
import { STAGE } from "./layout.ts";

export interface PlanUnit {
  id: string;
  label: string;
  panel: number; // 1..40 around the U
}

/**
 * Where each unit stands in the room (panel 1..40 around the U) and its
 * name. This is machine layout knowledge, not mission copy (UX F4: the
 * constant transmitter is about 30 panels from accumulators 1 and 2).
 */
export const UNIT_PANELS: Record<string, { label: string; panel: number }> = {
  i: { label: "Initiating Unit", panel: 1 },
  p: { label: "Master Programmer", panel: 3 },
  f1: { label: "Function Table 1", panel: 4 },
  a1: { label: "Accumulator 1", panel: 6 },
  a2: { label: "Accumulator 2", panel: 7 },
  m: { label: "Multiplier", panel: 18 },
  f2: { label: "Function Table 2", panel: 29 },
  f3: { label: "Function Table 3", panel: 31 },
  c: { label: "Constant Transmitter", panel: 34 },
  pr: { label: "Card Reader and Punch", panel: 38 },
};

/** Accumulator n's panel (the rest of the U: left wall, back wall, right wall). */
function accPanel(n: number): number {
  return n <= 2 ? 5 + n : n <= 10 ? 6 + n : n <= 15 ? 9 + n : n + 9;
}

/**
 * Plan markers for a mission's `units` (in the order listed). Missions that
 * use more than two accumulators get one grouped marker ("Accumulators 1 to
 * 14", UX 8.2.5 0a) instead of one per accumulator; the function tables
 * group the same way.
 */
export function unitsForPlan(units: string[]): PlanUnit[] {
  const accs = units.filter((u) => /^a\d+$/.test(u)).map((u) => Number(u.slice(1)));
  const fts = units.filter((u) => /^f\d$/.test(u));
  const out: PlanUnit[] = [];
  const groupAcc = accs.length > 2;
  for (const u of units) {
    if (/^a\d+$/.test(u)) {
      if (!groupAcc) out.push({ id: u, label: `Accumulator ${u.slice(1)}`, panel: accPanel(Number(u.slice(1))) });
      else if (Number(u.slice(1)) === accs[0]) out.push(...accGroups(accs));
      continue;
    }
    if (/^f\d$/.test(u) && fts.length > 1) {
      if (u === fts[0]) out.push({ id: "ft", label: "Function Tables", panel: UNIT_PANELS.f2.panel });
      continue;
    }
    if (UNIT_PANELS[u]) out.push({ id: u, ...UNIT_PANELS[u] });
  }
  return out;
}

/** Runs of consecutive accumulators, one marker each ("Accumulators 1 to 14", "Accumulator 19"). */
function accGroups(accs: number[]): PlanUnit[] {
  const out: PlanUnit[] = [];
  let a = accs[0], prev = accs[0];
  const push = (x: number, y: number) =>
    out.push({ id: x === y ? `a${x}` : `a${x}-${y}`, label: x === y ? `Accumulator ${x}` : `Accumulators ${x} to ${y}`, panel: accPanel(Math.round((x + y) / 2)) });
  for (const n of accs.slice(1)) {
    if (n !== prev + 1) {
      push(a, prev);
      a = n;
    }
    prev = n;
  }
  push(a, prev);
  return out;
}

const X0 = 300, Y0 = 150, SIDE = 36, BACK = 56, DEPTH = 50;
const RIGHT_X = X0 + DEPTH + 10 + 8 * BACK + 10;

/** Panel n (1..40): left wall bottom->top (1-16), back wall (17-24), right wall top->bottom (25-40). */
function panelRect(n: number): { x: number; y: number; w: number; h: number } {
  if (n <= 16) return { x: X0, y: Y0 + (16 - n) * SIDE + DEPTH, w: DEPTH, h: SIDE - 4 };
  if (n <= 24) return { x: X0 + DEPTH + 10 + (n - 17) * BACK, y: Y0, w: BACK - 4, h: DEPTH };
  return { x: RIGHT_X, y: Y0 + (n - 25) * SIDE + DEPTH, w: DEPTH, h: SIDE - 4 };
}

/** Does a marker ("a1-14", "ft", "c") stand for unit u ("a7", "f2", "c")? */
export function markerHas(marker: string, u: string): boolean {
  if (marker === u) return true;
  const g = /^a(\d+)-(\d+)$/.exec(marker), a = /^a(\d+)$/.exec(u);
  if (g && a) return Number(a[1]) >= Number(g[1]) && Number(a[1]) <= Number(g[2]);
  return marker === "ft" && /^f\d$/.test(u);
}

export function roomPlanSvg(units: PlanUnit[], highlight: string[] | null = null): string {
  const roomW = RIGHT_X + DEPTH + 50 - (X0 - 50);
  let b = `<rect x="0" y="0" width="${STAGE.w}" height="${STAGE.h}" fill="#0d0f12"/>`;
  b += `<rect x="${X0 - 50}" y="100" width="${roomW}" height="720" rx="8" fill="#15181c" stroke="#2c3036" stroke-width="2"/>`;
  b += text(X0 - 50 + roomW / 2, 800, "ENTRANCE", { size: 16, ls: 3 });
  for (let n = 1; n <= 40; n++) {
    const r = panelRect(n);
    const flagged = units.some((u) => u.panel === n);
    b += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="${flagged ? "#2a2d33" : "#1f2226"}" stroke="${flagged ? "#F0E442" : "#34383f"}" stroke-width="${flagged ? 3 : 1}"/>`;
  }
  // Marker positions, spread apart where panels are neighbours.
  const marks = units.map((u, i) => {
    const r = panelRect(u.panel);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const side = u.panel <= 16 ? "left" : u.panel >= 25 ? "right" : "back";
    const lx = side === "left" ? cx + 100 : side === "right" ? cx + 110 : cx;
    const ly = side === "back" ? cy - 80 : cy;
    return { u, i, cx, cy, lx, ly, side };
  });
  for (const side of ["left", "right"]) {
    const list = marks.filter((m) => m.side === side).sort((a, b) => a.ly - b.ly);
    for (let k = 1; k < list.length; k++) {
      const gap = list[k].ly - list[k - 1].ly;
      if (gap < 72) {
        list[k - 1].ly -= (72 - gap) / 2;
        list[k].ly += (72 - gap) / 2;
      }
    }
  }
  for (const m of marks) {
    const dim = highlight && !highlight.some((h) => markerHas(m.u.id, h)) ? ` opacity=".35"` : "";
    b += `<g${dim}><path d="M${m.cx} ${m.cy}L${m.lx} ${m.ly}" stroke="#F0E442" stroke-width="3"/>`;
    b += `<circle cx="${m.lx}" cy="${m.ly}" r="28" fill="#1B1D21" stroke="#F4EFE3" stroke-width="3"/>`;
    b += text(m.lx, m.ly + 10, String(m.i + 1), { size: 28, fill: "#F4EFE3" });
    b += text(m.lx + 44, m.ly + 9, m.u.label, { size: 28, fill: "#F4EFE3", anchor: "start" });
    b += `</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="roomplan" viewBox="0 0 ${STAGE.w} ${STAGE.h}" width="${STAGE.w}" height="${STAGE.h}">${b}</svg>`;
}
