// Runtime helpers for the panel kit.

import { DEFS, dialAngle } from "./art.ts";
import { svgFromString } from "../ui/dom.ts";
import { play } from "../ui/anim.ts";

/** Shared gradients, injected once (never display:none, or Chrome drops them). */
export function injectDefs(): void {
  if (document.getElementById("eniac-defs")) return;
  const svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" id="eniac-defs" width="0" height="0" aria-hidden="true">${DEFS}</svg>`);
  svg.style.position = "absolute";
  document.body.prepend(svg);
}

function currentAngle(g: Element): number {
  const t = g.querySelector(".dial-pointer")?.getAttribute("transform") ?? "";
  const m = /rotate\(([-\d.]+)/.exec(t);
  return m ? Number(m[1]) : 0;
}

/**
 * Turns a dial's pointer to `value`. The pointer's final angle is set
 * immediately; the 250 ms turn (UX 9.1) is a decorative counter-rotation of
 * the inner `.dial-spin` group, so the dial is right even if no frame ever
 * runs.
 */
export function setDial(root: Element, swId: string, value: string, animate = true, ms = 250): void {
  root.querySelectorAll(`[id="${swId}"]`).forEach((g) => {
    const positions = (g.getAttribute("data-positions") ?? "").split("|");
    const cx = g.getAttribute("data-cx"), cy = g.getAttribute("data-cy");
    const ptr = g.querySelector(".dial-pointer");
    if (!ptr || cx === null || cy === null) return;
    const to = dialAngle(positions, value);
    const from = currentAngle(g);
    g.setAttribute("data-value", value);
    ptr.setAttribute("transform", `rotate(${to} ${cx} ${cy})`);
    const spin = g.querySelector<SVGGElement>(".dial-spin");
    if (!animate || from === to || !spin) return;
    spin.style.transformBox = "view-box";
    spin.style.transformOrigin = `${cx}px ${cy}px`;
    void play(spin, [{ transform: `rotate(${from - to}deg)` }, { transform: "rotate(0deg)" }], { duration: ms, easing: "ease-out" });
  });
}
