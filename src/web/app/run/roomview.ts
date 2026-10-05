// The whole room during a run (S6, 2026-10-05): the visitor's own mission,
// seen on all 40 panels. It takes the run stage's place (x24-1384 y112-1016)
// and is laid out as Explore ENIAC's left column (same classes,
// styles/explore.css): the panorama with its arrows, the minimap, the wall
// labels and the readout. The run rail stays beside it, so READ, INIT and
// the captions keep working while the visitor looks around.
//
// Honest by construction, as everywhere: the lamps are `app.mirror.machine`,
// the visitor's session, or nothing. Looking only: no unit cards here (those
// are Explore's); the arrows, the map and a drag move the view.

import type { App } from "../app.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { onTap, setDisabled, type TapPoint } from "../ui/tap.ts";
import { Panorama } from "../explore/panorama.ts";
import { KIND_COLOUR } from "../explore/plan.ts";
import { EXPLORE } from "../explore/content.ts";
import { MINIMAP, PANELS, WALLS, maxX, minimapBracket, minimapLetter, minimapToX, missionTargets, readout, unitAtPanel } from "../explore/room.ts";
import { COPY } from "../copy.ts";

export interface RoomView {
  /** The room's elements, for the run screen (app coordinates). */
  els: HTMLElement[];
  /** Show or hide the room; showing redraws every lamp from the machine as it is now. */
  show(on: boolean): void;
  readonly shown: boolean;
  onMachine(units: string[] | null): void;
  dispose(): void;
}

const ARROW = (d: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 72" width="48" height="72"><path d="${d}" fill="none" stroke="#F4EFE3" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** `eUnits`: the compiled mission's units (mission.units), marked on the minimap. */
export function roomView(app: App, eUnits: string[], reduceMotion: () => boolean): RoomView {
  const targets = missionTargets(eUnits);
  const pano = new Panorama({ lamps: { kind: "live", machine: () => app.mirror.machine }, chips: true, swipe: true, onMove: () => onMove(), reduceMotion });
  const arrowL = h("div", { class: "ex-arrow l", role: "button", "aria-label": EXPLORE.arrows.left }, svgFromString(ARROW("M38 6 L10 36 L38 66")));
  const arrowR = h("div", { class: "ex-arrow r", role: "button", "aria-label": EXPLORE.arrows.right }, svgFromString(ARROW("M10 6 L38 36 L10 66")));
  onTap(arrowL, () => void pano.panBy(-1));
  onTap(arrowR, () => void pano.panBy(1));
  const room = h("div", { class: "ex-room run-room" }, pano.el, arrowL, arrowR);

  const cells = h("div", { class: "ex-cells" });
  for (let p = 0; p < PANELS; p++) {
    const u = unitAtPanel(p);
    const c = h("i", { class: `mc k-${u.kind}${targets.has(u.id) ? " hl" : ""}` }, minimapLetter(p));
    c.style.background = KIND_COLOUR[u.kind];
    cells.append(c);
  }
  const bracket = h("div", { class: "ex-bracket" });
  const minimap = h("div", { class: "ex-minimap", role: "button", "aria-label": EXPLORE.minimap }, cells, bracket);
  onTap(minimap, (p: TapPoint) => void pano.setX(minimapToX(p.x - 24 - MINIMAP.left)));
  const walls = h("div", { class: "ex-walls", "aria-hidden": "true" });
  for (const w of WALLS) {
    const d = h("div", { class: `wall ${w.id}` }, w.label);
    d.style.left = `${MINIMAP.left + w.from * MINIMAP.cell}px`;
    d.style.width = `${(w.to - w.from + 1) * MINIMAP.cell}px`;
    walls.append(d);
  }
  const readoutEl = h("div", { class: "ex-readout", "aria-live": "polite" });
  const note = h("div", { class: "run-room-note" }, h("span", { class: "run-room-dot", "aria-hidden": "true" }), COPY.run.roomNote);
  const els = [room, minimap, walls, readoutEl, note];
  for (const e of els) e.classList.add("room-off");

  function onMove(): void {
    const [a, b] = readout(pano.x);
    readoutEl.replaceChildren(`${EXPLORE.lookingAt} `, h("b", {}, a), ` ${EXPLORE.to} `, h("b", {}, b));
    const br = minimapBracket(pano.x);
    bracket.style.left = `${MINIMAP.left + br.left - 6}px`;
    bracket.style.width = `${br.width + 12}px`;
    setDisabled(arrowL, pano.x <= 0);
    setDisabled(arrowR, pano.x >= maxX());
  }

  let mounted = false;
  let shown = false;
  return {
    els,
    get shown() {
      return shown;
    },
    show(on: boolean): void {
      shown = on;
      for (const e of els) e.classList.toggle("room-off", !on);
      if (!on) return;
      if (!mounted) {
        mounted = true;
        pano.mount();
        void pano.setX(0, { ms: 0 });
        onMove();
      } else pano.invalidate(null); // lamps changed while the room was hidden
    },
    onMachine(units: string[] | null): void {
      if (shown) pano.invalidate(units);
    },
    dispose(): void {
      if (mounted) pano.dispose();
    },
  };
}
