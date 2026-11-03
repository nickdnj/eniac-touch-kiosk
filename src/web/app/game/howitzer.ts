// Fire Mission: the visitor's three guns, drawn in profile (muzzle to the right), each visibly
// bigger than the last: a light howitzer with a small shield, a field howitzer, a heavy
// howitzer with a long barrel and a big box trail. Used on the choice buttons and, tipping
// its barrel with the elevation, on the range. Flat SVG; colours come from CSS (`unit-*`).
// No calibre is named anywhere: the simulator's drag table is Brian Stuart's own, so the guns
// are sizes, not real weapons (docs/gunnery-mission.md G2).

import { s } from "../ui/dom.ts";

interface GunStyle {
  barrel: number;
  wheel: number;
  shield: number;
  trail: number;
  /** A muzzle brake on the heavy gun. */
  brake: boolean;
}

const STYLES: Record<string, GunStyle> = {
  light: { barrel: 96, wheel: 20, shield: 30, trail: 70, brake: false },
  field: { barrel: 142, wheel: 27, shield: 44, trail: 100, brake: false },
  heavy: { barrel: 196, wheel: 34, shield: 58, trail: 128, brake: true },
};

function style(id: string): GunStyle {
  return STYLES[id] ?? STYLES.field;
}

export interface Howitzer {
  g: SVGElement;
  /** Tips the barrel to this elevation in degrees. */
  aim(deg: number): void;
}

/** A howitzer about the origin (wheel centre on x = 0, ground on y = 0), about 300 units long. */
export function howitzer(id: string): Howitzer {
  const st = style(id);
  const g = s("g", { class: `howitzer unit-${id}` });
  const hub = -st.wheel; // wheel centre height
  // The trail: two spades dug in behind the wheel.
  g.append(s("path", { d: `M0 ${hub}L${-st.trail} -4L${-st.trail - 22} 0L${-st.trail + 6} 0L8 ${hub + 10}Z`, class: "unit-trail" }));
  // The barrel pivots about the breech, just above the wheel centre.
  const pivotY = hub - st.shield * 0.55;
  const tube = s("g", { transform: `translate(0 ${pivotY})` });
  const barrel = s("g", { class: "unit-barrel-g" });
  barrel.append(s("rect", { x: -18, y: -9, width: st.barrel + 18, height: 18, rx: 4, class: "unit-barrel" }));
  barrel.append(s("rect", { x: st.barrel * 0.38, y: -13, width: 16, height: 26, rx: 3, class: "unit-recoil" }));
  if (st.brake) barrel.append(s("rect", { x: st.barrel - 20, y: -14, width: 24, height: 28, rx: 3, class: "unit-recoil" }));
  tube.append(barrel);
  g.append(tube);
  // The shield, then the wheel on top.
  g.append(s("path", { d: `M-6 ${pivotY - st.shield * 0.8}L24 ${pivotY - st.shield * 0.6}L24 ${hub + 4}L-6 ${hub + 4}Z`, class: "unit-shield" }));
  g.append(s("circle", { cx: 0, cy: hub, r: st.wheel, class: "unit-wheel" }), s("circle", { cx: 0, cy: hub, r: st.wheel * 0.28, class: "unit-hub" }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    g.append(s("line", { x1: Math.cos(a) * st.wheel * 0.28, y1: hub + Math.sin(a) * st.wheel * 0.28, x2: Math.cos(a) * st.wheel * 0.9, y2: hub + Math.sin(a) * st.wheel * 0.9, class: "unit-spoke" }));
  }
  return {
    g,
    aim: (deg: number) => barrel.setAttribute("transform", `rotate(${-deg})`),
  };
}

/** A standalone picture of a gun for a button: `w` x `h` px, the gun filling it. */
export function howitzerIcon(id: string, w = 280, h = 124): SVGElement {
  const svg = s("svg", { viewBox: "-175 -150 360 166", width: w, height: h, class: "unit-icon", "aria-hidden": "true" });
  const gun = howitzer(id);
  gun.aim(22);
  svg.append(gun.g);
  return svg;
}
