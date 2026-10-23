// Gunnery: the flag and the score zones around it, drawn on the aim ruler, the live
// arc and the result, so the visitor always sees where the shell is going and what
// each patch of ground is worth. Pure drawing; the numbers come from game/logic.ts.

import type { Game } from "../../../bridge/internal/mission/mission.gen.ts";
import { s } from "../ui/dom.ts";
import { zones } from "./logic.ts";

/** The farthest ground any zone of this target reaches. */
export function outerFeet(game: Game, target: number): number {
  return zones(game, target)[0].hi;
}

/**
 * Draws the zones as nested bands on the ground (a solid strip, a faint tint
 * up through the plot, and the points under the strip). `X` maps feet from the
 * gun to a pixel; `gy` is the ground line, `top` the top of the plot.
 */
export function drawZones(parent: SVGElement, game: Game, target: number, X: (feet: number) => number, gy: number, top: number, labelY: number): void {
  const Z = zones(game, target);
  for (const z of Z) {
    let x0 = X(z.lo);
    let x1 = X(z.hi);
    if (x1 - x0 < 12) {
      const mid = (x0 + x1) / 2;
      x0 = mid - 6;
      x1 = mid + 6;
    }
    parent.append(s("rect", { x: x0, y: top, width: x1 - x0, height: gy - top, class: `zone-tint z-${z.cls}` }));
    parent.append(s("rect", { x: x0, y: gy - 16, width: x1 - x0, height: 16, class: `zone-bar z-${z.cls}` }));
  }
  // The points sit under the right-hand half of each ring, where there is room.
  Z.forEach((z, i) => {
    const inner = i < Z.length - 1 ? Z[i + 1].hi : target;
    const x0 = X(inner);
    const x1 = X(z.hi);
    if (x1 - x0 < 40) return;
    parent.append(s("text", { x: (x0 + x1) / 2, y: labelY, "text-anchor": "middle", class: `zone-label z-${z.cls}` }, z.label));
  });
}

/** The flag on its pole, standing on the ground at x. */
export function drawFlag(parent: SVGElement, x: number, gy: number, label: string): void {
  const g = s("g", { class: "flag" });
  g.append(
    s("line", { x1: x, y1: gy, x2: x, y2: gy - 92, class: "flag-pole" }),
    s("path", { d: `M${x} ${gy - 92} L${x + 52} ${gy - 72} L${x} ${gy - 52}Z`, class: "flag-cloth" }),
    s("text", { x: x + 6, y: gy - 100, class: "flag-text" }, label),
  );
  parent.append(g);
}

/** A burst of rays from a point: the bullseye celebration (the motion is CSS and respects reduced motion). */
export function drawBurst(parent: SVGElement, cx: number, cy: number): void {
  const place = s("g", { transform: `translate(${cx} ${cy})` });
  const g = s("g", { class: "arc-burst" });
  place.append(g);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.append(s("line", { x1: Math.cos(a) * 26, y1: Math.sin(a) * 26, x2: Math.cos(a) * 58, y2: Math.sin(a) * 58, class: "burst-ray" }));
  }
  parent.append(place);
}
