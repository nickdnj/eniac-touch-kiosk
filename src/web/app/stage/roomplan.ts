// L0 room plan (UX 4.1, 8.1.4 step 0a): the U-shaped room seen from above,
// with the mission's units flagged by numbered markers. Static: no machine
// state is drawn here (no fake lamps).

import { text } from "../panels/art.ts";
import { STAGE } from "./layout.ts";
import { unitOfE } from "../explore/room.ts";

export interface PlanUnit {
  id: string;
  label: string;
  panel: number; // 0..39 around the U (0-based, explore/room.ts)
}

/** The middle panel of a unit (0-based), from the one room table (explore/room.ts, F12). */
function panelOf(e: string): number {
  const u = unitOfE(e)!;
  return u.at + Math.floor((u.n - 1) / 2);
}

/**
 * Where each unit stands in the room and its name on the plan. Positions
 * come from explore/room.ts (UX 14.3.1, 0-based like the upstream offsets);
 * the labels are the plan's own (UX F4: the constant transmitter is about
 * 30 panels from accumulators 1 and 2).
 */
export const UNIT_PANELS: Record<string, { label: string; panel: number }> = Object.fromEntries(
  (
    [
      ["i", "Initiating Unit"],
      ["p", "Master Programmer"],
      ["f1", "Function Table 1"],
      ["a1", "Accumulator 1"],
      ["a2", "Accumulator 2"],
      ["m", "Multiplier"],
      ["f2", "Function Table 2"],
      ["f3", "Function Table 3"],
      ["c", "Constant Transmitter"],
      ["pr", "Card Reader and Punch"],
    ] as const
  ).map(([e, label]) => [e, { label, panel: panelOf(e) }]),
);

/** Accumulator n's panel (0-based). */
function accPanel(n: number): number {
  return panelOf(`a${n}`);
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

/** Panel p (0..39): left wall bottom->top (0-15), back wall (16-23), right wall top->bottom (24-39). */
function panelRect(p: number): { x: number; y: number; w: number; h: number } {
  if (p <= 15) return { x: X0, y: Y0 + (15 - p) * SIDE + DEPTH, w: DEPTH, h: SIDE - 4 };
  if (p <= 23) return { x: X0 + DEPTH + 10 + (p - 16) * BACK, y: Y0, w: BACK - 4, h: DEPTH };
  return { x: RIGHT_X, y: Y0 + (p - 24) * SIDE + DEPTH, w: DEPTH, h: SIDE - 4 };
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
  for (let n = 0; n < 40; n++) {
    const r = panelRect(n);
    const flagged = units.some((u) => u.panel === n);
    b += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="${flagged ? "#2a2d33" : "#1f2226"}" stroke="${flagged ? "#F0E442" : "#34383f"}" stroke-width="${flagged ? 3 : 1}"/>`;
  }
  // Marker positions, spread apart where panels are neighbours.
  const marks = units.map((u, i) => {
    const r = panelRect(u.panel);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const side = u.panel <= 15 ? "left" : u.panel >= 24 ? "right" : "back";
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
