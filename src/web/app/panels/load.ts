// Runtime helpers for the panel kit.

import { DEFS, dialAngle } from "./art.ts";
import { svgFromString } from "../ui/dom.ts";

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

/** Turns a dial's pointer to `value` (UX 9.1: 250 ms). animate=false jumps. */
export function setDial(root: Element, swId: string, value: string, animate = true, ms = 250): void {
  root.querySelectorAll(`[id="${swId}"]`).forEach((g) => {
    const positions = (g.getAttribute("data-positions") ?? "").split("|");
    const cx = g.getAttribute("data-cx"), cy = g.getAttribute("data-cy");
    const ptr = g.querySelector(".dial-pointer");
    if (!ptr || cx === null || cy === null) return;
    const to = dialAngle(positions, value);
    const from = currentAngle(g);
    g.setAttribute("data-value", value);
    if (!animate || from === to) {
      ptr.setAttribute("transform", `rotate(${to} ${cx} ${cy})`);
      return;
    }
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      ptr.setAttribute("transform", `rotate(${from + (to - from) * e} ${cx} ${cy})`);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
