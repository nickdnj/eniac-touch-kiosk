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
  a1: { label: "Accumulator 1", panel: 6 },
  a2: { label: "Accumulator 2", panel: 7 },
  c: { label: "Constant Transmitter", panel: 34 },
};

/** Plan markers for a mission's `units` (in the order listed). */
export function unitsForPlan(units: string[]): PlanUnit[] {
  return units.filter((u) => UNIT_PANELS[u]).map((u) => ({ id: u, ...UNIT_PANELS[u] }));
}

const X0 = 300, Y0 = 150, SIDE = 36, BACK = 56, DEPTH = 50;
const RIGHT_X = X0 + DEPTH + 10 + 8 * BACK + 10;

/** Panel n (1..40): left wall bottom->top (1-16), back wall (17-24), right wall top->bottom (25-40). */
function panelRect(n: number): { x: number; y: number; w: number; h: number } {
  if (n <= 16) return { x: X0, y: Y0 + (16 - n) * SIDE + DEPTH, w: DEPTH, h: SIDE - 4 };
  if (n <= 24) return { x: X0 + DEPTH + 10 + (n - 17) * BACK, y: Y0, w: BACK - 4, h: DEPTH };
  return { x: RIGHT_X, y: Y0 + (n - 25) * SIDE + DEPTH, w: DEPTH, h: SIDE - 4 };
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
    const dim = highlight && !highlight.includes(m.u.id) ? ` opacity=".35"` : "";
    b += `<g${dim}><path d="M${m.cx} ${m.cy}L${m.lx} ${m.ly}" stroke="#F0E442" stroke-width="3"/>`;
    b += `<circle cx="${m.lx}" cy="${m.ly}" r="28" fill="#1B1D21" stroke="#F4EFE3" stroke-width="3"/>`;
    b += text(m.lx, m.ly + 10, String(m.i + 1), { size: 28, fill: "#F4EFE3" });
    b += text(m.lx + 44, m.ly + 9, m.u.label, { size: 28, fill: "#F4EFE3", anchor: "start" });
    b += `</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="roomplan" viewBox="0 0 ${STAGE.w} ${STAGE.h}" width="${STAGE.w}" height="${STAGE.h}">${b}</svg>`;
}
