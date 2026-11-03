// Gunnery: the flag and the score zones around it, drawn on the aim ruler, the live
// arc and the result, so the visitor always sees where the shell is going and what
// each patch of ground is worth. Pure drawing; the numbers come from game/logic.ts.

import type { Game } from "../../../bridge/internal/mission/mission.gen.ts";
import { s } from "../ui/dom.ts";
import { zones } from "./logic.ts";

/** The farthest ground any zone of this target reaches. */
export function outerFeet(game: Game, target: number, hitFeet?: number): number {
  return zones(game, target, hitFeet)[0].hi;
}

/**
 * Draws the zones as nested bands on the ground (a solid strip, a faint tint
 * up through the plot, and the points under the strip). `X` maps feet from the
 * gun to a pixel; `gy` is the ground line, `top` the top of the plot.
 */
export function drawZones(parent: SVGElement, game: Game, target: number, X: (feet: number) => number, gy: number, top: number, labelY: number, hitFeet?: number): void {
  const Z = zones(game, target, hitFeet);
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

/** The enemy ship, afloat at x with its keel on the waterline gy (Battleship's target). */
export function drawShip(parent: SVGElement, x: number, gy: number, label: string): void {
  const g = s("g", { class: "enemy-ship" });
  g.append(
    s("path", { d: `M${x - 84} ${gy - 20}H${x + 84}L${x + 62} ${gy + 2}H${x - 70}Z`, class: "ship-hull" }),
    s("rect", { x: x - 38, y: gy - 46, width: 76, height: 26, rx: 3, class: "ship-deck" }),
    s("rect", { x: x - 14, y: gy - 70, width: 30, height: 24, rx: 3, class: "ship-deck" }),
    s("rect", { x: x - 30, y: gy - 64, width: 10, height: 18, class: "ship-funnel" }),
    s("rect", { x: x + 22, y: gy - 64, width: 10, height: 18, class: "ship-funnel" }),
    s("line", { x1: x + 2, y1: gy - 70, x2: x + 2, y2: gy - 98, class: "ship-mast" }),
    s("path", { d: `M${x + 2} ${gy - 98}L${x + 30} ${gy - 90}L${x + 2} ${gy - 82}Z`, class: "ship-flag" }),
    s("text", { x: x - 84, y: gy - 108, class: "flag-text" }, label),
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

/**
 * An Army target standing on the ground at x (Fire Mission). `art` picks the picture; the text is
 * the target's name. Colours are CSS (`army-*`) so the dark and light themes can each have them.
 */
export function drawArmyTarget(parent: SVGElement, x: number, gy: number, label: string, art: string): void {
  const g = s("g", { class: `army-target army-${art || "depot"}` });
  const r = (rx: number, ry: number, w: number, h: number, cls: string, round = 3) => s("rect", { x: x + rx, y: gy + ry, width: w, height: h, rx: round, class: cls });
  switch (art) {
    case "nest": // sandbag mound with a machine gun
      g.append(s("path", { d: `M${x - 64} ${gy}Q${x - 40} ${gy - 46} ${x} ${gy - 48}Q${x + 40} ${gy - 46} ${x + 64} ${gy}Z`, class: "army-sand" }), r(0, -42, 54, 8, "army-dark", 3), r(-8, -52, 12, 22, "army-dark", 2));
      break;
    case "truck":
      g.append(r(-58, -42, 70, 30, "army-metal"), r(12, -34, 34, 22, "army-metal"), r(18, -30, 18, 12, "army-glass", 2), s("circle", { cx: x - 36, cy: gy - 10, r: 11, class: "army-tyre" }), s("circle", { cx: x + 2, cy: gy - 10, r: 11, class: "army-tyre" }), s("circle", { cx: x + 32, cy: gy - 10, r: 11, class: "army-tyre" }));
      break;
    case "bridge":
      g.append(r(-96, -34, 192, 12, "army-metal", 2), r(-76, -22, 14, 22, "army-dark", 1), r(62, -22, 14, 22, "army-dark", 1), s("path", { d: `M${x - 96} ${gy - 34}L${x - 60} ${gy - 68}H${x + 60}L${x + 96} ${gy - 34}`, class: "army-truss" }), s("path", { d: `M${x - 60} ${gy - 34}L${x - 30} ${gy - 68}L${x} ${gy - 34}L${x + 30} ${gy - 68}L${x + 60} ${gy - 34}`, class: "army-truss" }));
      break;
    case "bunker":
      g.append(s("path", { d: `M${x - 72} ${gy}V${gy - 26}Q${x - 60} ${gy - 54} ${x} ${gy - 54}Q${x + 60} ${gy - 54} ${x + 72} ${gy - 26}V${gy}Z`, class: "army-concrete" }), r(-34, -34, 68, 8, "army-dark", 2));
      break;
    case "tanks":
      for (const dx of [-54, 54]) {
        g.append(r(dx - 44, -22, 88, 20, "army-metal", 8), r(dx - 24, -40, 46, 20, "army-metal", 5), r(dx + 18, -34, 52, 7, "army-dark", 3));
        for (let i = -3; i <= 3; i++) g.append(s("circle", { cx: x + dx + i * 12, cy: gy - 9, r: 6, class: "army-tyre" }));
      }
      break;
    case "battery":
      for (const dx of [-60, 60]) g.append(s("circle", { cx: x + dx, cy: gy - 16, r: 16, class: "army-tyre" }), r(dx - 8, -50, 70, 10, "army-dark", 3), r(dx - 14, -36, 30, 16, "army-metal", 3));
      break;
    case "railyard":
      g.append(r(-100, -4, 200, 4, "army-dark", 1));
      for (const dx of [-86, -18, 50]) g.append(r(dx, -40, 58, 34, "army-metal", 3), r(dx + 8, -32, 12, 14, "army-glass", 1), s("circle", { cx: x + dx + 12, cy: gy - 4, r: 6, class: "army-tyre" }), s("circle", { cx: x + dx + 46, cy: gy - 4, r: 6, class: "army-tyre" }));
      break;
    default: // depot: stacked crates
      for (const [dx, dy] of [[-46, 0], [-4, 0], [38, 0], [-25, -40], [17, -40]]) g.append(r(dx, dy - 40, 40, 40, "army-crate", 2), s("path", { d: `M${x + dx} ${gy + dy - 40}l40 40M${x + dx + 40} ${gy + dy - 40}l-40 40`, class: "army-crate-x" }));
  }
  g.append(s("text", { x: x - 84, y: gy - 84, class: "flag-text" }, label));
  parent.append(g);
}
