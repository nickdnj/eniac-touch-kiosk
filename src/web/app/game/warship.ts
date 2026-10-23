// Battleship: the visitor's three ships, drawn in profile (bow to the right), each
// visibly bigger than the last: a destroyer is long and low with one gun turret, a
// cruiser has two, a battleship stands tall with three double-barrelled turrets.
// Used on the choice buttons and, tipping its guns with the elevation, on the range.

import { s } from "../ui/dom.ts";

interface ShipStyle {
  /** Turret positions along the hull, in hull units (-150 stern to 150 bow). */
  turrets: number[];
  /** Barrels per turret. */
  barrels: 1 | 2;
  /** Funnels along the hull. */
  funnels: number[];
  /** How tall the bridge stands above the deck. */
  tower: number;
  /** Hull height, below the waterline mark to the deck. */
  hull: number;
}

const STYLES: Record<string, ShipStyle> = {
  destroyer: { turrets: [100], barrels: 1, funnels: [-30, 10], tower: 26, hull: 26 },
  cruiser: { turrets: [-95, 95], barrels: 1, funnels: [-36, 12, 56], tower: 44, hull: 34 },
  battleship: { turrets: [-105, -20, 100], barrels: 2, funnels: [-60, 30], tower: 72, hull: 44 },
};

function style(id: string): ShipStyle {
  return STYLES[id] ?? STYLES.cruiser;
}

export interface Warship {
  g: SVGElement;
  /** Tips every turret's guns to this elevation in degrees. */
  aim(deg: number): void;
}

/** A ship drawn about the origin (keel on y = 0, centred along x), 300 units long. */
export function warship(id: string): Warship {
  const st = style(id);
  const g = s("g", { class: `warship ship-${id}` });
  const top = -st.hull;
  g.append(s("path", { d: `M-150 ${top}H152L118 6H-124Z`, class: "ship-hull" }));
  g.append(s("rect", { x: -50, y: top - st.tower * 0.55, width: 100, height: st.tower * 0.55, rx: 4, class: "ship-deck" }));
  g.append(s("rect", { x: -18, y: top - st.tower, width: 40, height: st.tower * 0.5 + 2, rx: 4, class: "ship-deck" }));
  g.append(s("line", { x1: 2, y1: top - st.tower, x2: 2, y2: top - st.tower - 34, class: "ship-mast" }));
  for (const fx of st.funnels) g.append(s("rect", { x: fx, y: top - st.tower * 0.55 - 20, width: 12, height: 22, class: "ship-funnel" }));
  const barrels: SVGElement[] = [];
  for (const tx of st.turrets) {
    const t = s("g", { transform: `translate(${tx} ${top - 4})` });
    const gun = s("g", { class: "ship-guns" });
    gun.append(s("rect", { x: 0, y: -5, width: 74, height: 10, rx: 3, class: "ship-barrel" }));
    if (st.barrels === 2) gun.append(s("rect", { x: 0, y: -17, width: 74, height: 10, rx: 3, class: "ship-barrel" }));
    t.append(gun, s("circle", { r: 20, class: "ship-turret" }));
    g.append(t);
    barrels.push(gun);
  }
  return {
    g,
    aim: (deg: number) => barrels.forEach((b) => b.setAttribute("transform", `rotate(${-deg})`)),
  };
}

/** A standalone picture of a ship for a button: `w` x `h` px, the ship filling it. */
export function shipIcon(id: string, w = 280, h = 124): SVGElement {
  const svg = s("svg", { viewBox: "-165 -160 330 176", width: w, height: h, class: "ship-icon", "aria-hidden": "true" });
  const ship = warship(id);
  ship.aim(24);
  svg.append(ship.g);
  return svg;
}

/** A gun's picture for a button: a barrel as long as the gun is fast (600 to 1300 ft/s). */
export function gunIcon(speed: number, w = 150, h = 34): SVGElement {
  const len = 40 + ((speed - 600) / 700) * 90;
  const svg = s("svg", { viewBox: "0 0 150 34", width: w, height: h, class: "gun-icon", "aria-hidden": "true" });
  svg.append(
    s("circle", { cx: 16, cy: 20, r: 12, class: "ship-turret" }),
    s("rect", { x: 16, y: 13, width: len, height: 12, rx: 4, class: "ship-barrel", transform: "rotate(-14 16 20)" }),
  );
  return svg;
}
