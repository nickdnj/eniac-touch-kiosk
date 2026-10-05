// The room seen from above, for the Explore rail (UX 14.3.3 states A and C):
// the U of 40 panels coloured by unit kind, with what is on screen outlined
// (state A) or the mission's units marked (state C). Static: no lamps.
// The three portable function tables stand inside the U beside their
// Function Tables: they "extend into the center of the floor" (Report on
// the ENIAC, Part I, 7.1; fact-check A17).
// Panel positions come from room.ts (0-based, F12).

import { PANELS, ROOM, unitAtPanel, type UnitKind } from "./room.ts";

/** Minimap and plan colours by unit kind (letters carry the meaning too, UX-09). */
export const KIND_COLOUR: Record<UnitKind, string> = {
  init: "#E6DEC1",
  cyc: "#E6DEC1",
  mp: "#E6DEC1",
  acc: "#FFB000",
  mult: "#CC79A7",
  div: "#CC79A7",
  ft: "#56B4E9",
  ct: "#009E73",
  pr: "#009E73",
};

/** Panel p's rectangle in the 344 x 240 plan: left wall bottom to top, back wall, right wall top to bottom. */
export function planRect(p: number): { x: number; y: number; w: number; h: number } {
  const K = 11, W0 = 60;
  if (p < 16) return { x: 6, y: W0 + (15 - p) * K, w: 36, h: K - 1.5 };
  if (p < 24) return { x: 46 + (p - 16) * 30.5, y: 8, w: 29, h: 40 };
  return { x: 296, y: W0 + (p - 24) * K, w: 36, h: K - 1.5 };
}

/** A portable table's cart on the plan: just inside the U, level with its Function Table's two panels. */
export function cartRect(at: number): { x: number; y: number; w: number; h: number } {
  const a = planRect(at), b = planRect(at + 1);
  const w = 22, h = 16;
  const y = (Math.min(a.y, b.y) + Math.max(a.y + a.h, b.y + b.h)) / 2 - h / 2;
  return { x: at < 16 ? a.x + a.w + 6 : a.x - 6 - w, y, w, h };
}

export interface PlanOptions {
  /** Panels on screen [first, last]: outlined, the rest faded (state A). */
  visible?: [number, number];
  /** Panels a mission uses: outlined in yellow, the rest faded (state C). */
  marked?: Set<number>;
}

export function planSvg(o: PlanOptions): string {
  let s = "";
  for (let p = 0; p < PANELS; p++) {
    const r = planRect(p);
    const col = KIND_COLOUR[unitAtPanel(p).kind];
    const on = o.marked ? o.marked.has(p) : o.visible ? p >= o.visible[0] && p <= o.visible[1] : true;
    const stroke = on ? ` stroke="#000" stroke-width="3"` : "";
    s += `<rect class="${on ? "on" : "off"}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${col}" opacity="${on ? 1 : 0.35}"${stroke}/>`;
  }
  // The portable tables: on and off with their Function Table.
  for (const u of ROOM) {
    if (u.kind !== "ft") continue;
    const r = cartRect(u.at);
    const on = o.marked ? o.marked.has(u.at) : o.visible ? u.at + 1 >= o.visible[0] && u.at <= o.visible[1] : true;
    const stroke = on ? ` stroke="#000" stroke-width="2"` : "";
    s += `<rect class="cart ${on ? "on" : "off"}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="${KIND_COLOUR.ft}" opacity="${on ? 1 : 0.35}"${stroke}/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="ex-plan" viewBox="0 0 344 240" width="344" height="240" role="img" aria-label="The room seen from above">${s}</svg>`;
}
