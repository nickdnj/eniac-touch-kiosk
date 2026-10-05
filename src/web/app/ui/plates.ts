// Engraved-plate components (UX 14.1, 14.2.1, 14.6): the Stuart plate, the
// honor plates, the rotating attract honor plate and the offline QR block.
// Shared by S11 (screens/honor.ts), and meant for S1 attract and the S8
// finale beats F3 and F4. Text comes from content/honor.ts. Styles:
// styles/honor.css (.plate and friends). No photographs (UX 14.6.3).

import { h, svgFromString } from "./dom.ts";
import { qrSvg } from "./qr.ts";
import { HONOR, shown, type Link, type PersonPlate } from "../content/honor.ts";

export type PlateSize = "attract" | "page" | "beat";

function rivets(): HTMLElement[] {
  return ["tl", "tr", "bl", "br"].map((c) => h("span", { class: `rivet ${c}`, "aria-hidden": "true" }));
}

/**
 * The Stuart plate (FR-43): "THE SIMULATOR BEHIND THIS SCREEN / Brian L.
 * Stuart / Drexel University". Sizes: `attract` (512 x 156, name 56 px:
 * UX 14.2.1, always on screen, never rotates), `page` (S11 page 1, name
 * 96 px), `beat` (finale F3, name 72 px).
 */
export function stuartPlate(size: PlateSize = "attract"): HTMLElement {
  const s = HONOR.stuart;
  return h(
    "div",
    { class: `plate stuart-plate size-${size}`, role: "note", "aria-label": `${s.plateKicker}: ${s.name}, ${s.where}` },
    ...rivets(),
    h("div", { class: "plate-kicker" }, s.plateKicker),
    h("div", { class: "plate-name" }, s.name),
    h("div", { class: "plate-sub" }, s.where),
  );
}

/**
 * The designers plate (S1, beside the ENIAC title): "ENIAC WAS DESIGNED BY /
 * J. Presper Eckert / John W. Mauchly", names at the Stuart plate's 56 px.
 */
export function designersPlate(): HTMLElement {
  const d = HONOR.designers;
  return h(
    "div",
    { class: "plate designers-plate", role: "note", "aria-label": `${d.plateKicker} ${d.names.join(" and ")}` },
    ...rivets(),
    h("div", { class: "plate-kicker" }, d.plateKicker),
    ...d.names.map((n) => h("div", { class: "plate-name" }, n)),
  );
}

/** One person (or institution) plate: name, the later name, one line. */
export function personPlate(p: PersonPlate, opts: { laterPrefix?: string; cls?: string } = {}): HTMLElement {
  return h(
    "div",
    { class: `plate person-plate${opts.cls ? ` ${opts.cls}` : ""}` },
    ...rivets(),
    h("div", { class: "plate-name" }, p.name),
    p.later ? h("div", { class: "plate-later" }, opts.laterPrefix ? `${opts.laterPrefix} ${p.later}` : p.later) : null,
    h("div", { class: "plate-line" }, p.line),
  );
}

/** The six programmer plates, in Nick's order (S11 page 2, finale F4). */
export function programmerPlates(): HTMLElement[] {
  return HONOR.programmers.plates.filter(shown).map((p) => personPlate(p, { laterPrefix: "Later", cls: "programmer" }));
}

/** The four builder plates, then the two institutions (S11 page 3, finale F4). */
export function builderPlates(): HTMLElement[] {
  return [
    ...HONOR.builders.people.filter(shown).map((p) => personPlate(p, { cls: "builder" })),
    ...HONOR.builders.bodies.filter(shown).map((p) => personPlate(p, { cls: "institution" })),
  ];
}

/**
 * A QR code drawn from the URL (offline; ui/qr.ts) on a light tile, with
 * its label and the printed address, so glare or a glove cannot defeat it.
 */
export function qrBlock(link: Link, px: number, cls = ""): HTMLElement {
  const svg = svgFromString(qrSvg(link.url, { px, label: `${link.label}: ${link.print}`, dark: "#1B1D21", light: "#FFFFFF" }));
  return h(
    "div",
    { class: `qr-block${cls ? ` ${cls}` : ""}`, "data-url": link.url },
    h("div", { class: "qr-tile" }, svg as unknown as HTMLElement),
    h("div", { class: "qr-text" }, h("div", { class: "qr-label" }, link.label), h("div", { class: "qr-print" }, ...breakable(link.print))),
  );
}

/** Lets a long printed URL wrap after its slashes and dots. */
function breakable(text: string): (string | HTMLElement)[] {
  const out: (string | HTMLElement)[] = [];
  for (const part of text.split(/(?<=[/.])/)) out.push(part, h("wbr"));
  return out;
}

export interface Rotator {
  el: HTMLElement;
  /** Starts the 8 s rotation (call on mount). */
  start(): void;
  /** Stops it (call on unmount). */
  stop(): void;
}

/**
 * The rotating honor plate for attract (UX 14.2.1): the first programmers,
 * the builders, the institutions; 8 s each with a 400 ms cross-fade (a cut
 * with reduced motion). Draws nothing if every slide is held.
 */
export function honorRotator(opts: { intervalMs?: number; reduceMotion?: boolean } = {}): Rotator {
  const slides = HONOR.attractSlides.filter((x) => !x.hold);
  const els = slides.map((sl, i) =>
    h(
      "div",
      { class: `rot-slide${i === 0 ? " on" : ""}`, "aria-hidden": i === 0 ? "false" : "true" },
      h("div", { class: "plate-kicker" }, sl.heading),
      h("div", { class: `rot-names n${sl.names.length}` }, ...sl.names.map((n) => h("span", {}, n))),
    ),
  );
  const el = h("div", { class: `plate honor-rotator${opts.reduceMotion ? " cut" : ""}`, role: "note" }, ...rivets(), ...els);
  if (!els.length) el.classList.add("hidden");
  let i = 0;
  let t: ReturnType<typeof setInterval> | null = null;
  return {
    el,
    start() {
      if (t || els.length < 2) return;
      t = setInterval(() => {
        els[i].classList.remove("on");
        els[i].setAttribute("aria-hidden", "true");
        i = (i + 1) % els.length;
        els[i].classList.add("on");
        els[i].setAttribute("aria-hidden", "false");
      }, opts.intervalMs ?? 8000);
    },
    stop() {
      if (t) clearInterval(t);
      t = null;
    },
  };
}
