// The panorama: the whole ENIAC room unrolled into one strip of 40 panels
// (UX 14.1 rule 1, 14.3.2). One component for Explore ENIAC (S14), the live
// attract screen (S1) and the finale (S8 F2).
//
// It takes a lamp source and nothing else: `live` (a function returning the
// mirror's drawable machine state, which is null whenever there is no
// session, the core is down or the link is down) or `dark`. So it cannot
// show a lamp that the core did not report (FR-94, "no demo fallback").
//
// Geometry lives in explore/room.ts (pure, tested). Everything here is in
// room px at pitch 184; a smaller panorama (attract: pitch 166) sets
// `scale` and the whole strip is scaled as one.
//
// Usage:
//   const p = new Panorama({ lamps: { kind: "live", machine: () => app.mirror.machine }, onPick: (t) => ... });
//   host.append(p.el); p.mount();            // builds the strip, first lamp render
//   p.setX(1200, { ms: 450 });               // or p.centreOn("mult"), p.panBy(1)
//   p.highlight(new Set(["init", "a1"]), "1"); // yellow rings + numeral badge, the rest dim
//   p.select(["mp"]);                        // the cream "selected" ring
//   app screen onMachine(units) -> p.invalidate(units)
//   p.dispose();

import type { MachineState } from "../protocol.ts";
import { LampRenderer } from "../lamps/render.ts";
import { h } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { play } from "../ui/anim.ts";
import { accumulatorPanel, constantPanel, initiatingPanel, masterProgrammerPanel, printerPanel } from "../panels/art.ts";
import {
  continuedRoomPanel,
  cyclingRoomPanel,
  dividerRoomPanel,
  functionTableRoomPanel,
  ibmMachineSvg,
  multiplierRoomPanel,
  portableTableSvg,
} from "../panels/roomart.ts";
import { PANEL_W, PITCH, ROOM, STRIP_W, VIEW_W, centreOn, clampX, inMiddle, maxX, panMs, stepX, unitById, type RoomUnit } from "./room.ts";

export type LampSource = { kind: "live"; machine: () => MachineState | null } | { kind: "dark" };

/** What a tap picked: a unit id ("a7", "mp"), a cart ("pft:ft2") or a tray band ("dt", "pt"). */
export type PanoTarget = string;

export interface PanoramaOptions {
  lamps: LampSource;
  /** Viewport width in room px (Explore 1360). */
  viewW?: number;
  /** Drawn size / room size (1 = pitch 184; attract's pitch 166 is 166 / 184). */
  scale?: number;
  /** Draw the cream label chips under the panels (Explore). */
  chips?: boolean;
  /** Units, chips, carts and trays become tap targets that call this. */
  onPick?: (t: PanoTarget) => void;
  /** The optional one-finger horizontal drag (UX 14.3.5). Default: on when onPick is set. */
  swipe?: boolean;
  /** Called whenever the position changes (pan, drag). */
  onMove?: (x: number) => void;
  reduceMotion?: () => boolean;
}

/** Room px layout of the strip (UX 14.3.2, relative to the room viewport). */
export const LAYOUT = { trayH: 72, panelTop: 72, panelH: 400, progTop: 472, chipTop: 548, chipH: 80, withChips: 640, withoutChips: 544 } as const;

/** A drag shorter than this is a tap (UX 14.3.5: glove jitter). */
export const DRAG_PX = 24;

/** The panel art for one unit, one 300 x 680 SVG per panel. */
export function unitPanels(u: RoomUnit): string[] {
  switch (u.kind) {
    case "init":
      return [initiatingPanel().markup];
    case "cyc":
      return [cyclingRoomPanel()];
    case "mp":
      return [masterProgrammerPanel().markup, continuedRoomPanel(["MASTER PROGRAMMER", "(CONTINUED)"], 2)];
    case "ft": {
      const n = Number(u.id.slice(2));
      return [functionTableRoomPanel(n, 0), functionTableRoomPanel(n, 1)];
    }
    case "acc":
      return [accumulatorPanel(Number(u.id.slice(1))).markup];
    case "div":
      return [dividerRoomPanel()];
    case "mult":
      return [multiplierRoomPanel(0), multiplierRoomPanel(1), multiplierRoomPanel(2)];
    case "ct":
      return [constantPanel().markup, continuedRoomPanel(["CONSTANT", "TRANSMITTER (2)"], 6)];
    case "pr":
      return [printerPanel().markup, ...[2, 3, 4].map((k) => continuedRoomPanel(["PRINTER", `PANEL ${k} OF 4`], k + 7))];
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Accessible label for a unit (UX 14.3.9). */
export function unitLabel(u: RoomUnit): string {
  return u.kind === "acc" ? `${u.name}, one of 20. Opens its card.` : `${u.name}. Opens its card.`;
}

export class Panorama {
  readonly el: HTMLElement;
  readonly viewW: number;
  readonly scale: number;
  private strip: HTMLElement;
  private o: PanoramaOptions;
  private renderer: LampRenderer | null = null;
  private source: LampSource;
  private pos = 0;
  private gen = 0;
  private dragged = false;
  private drag: { id: number; x0: number; sx: number; moved: boolean } | null = null;
  private listeners: [EventTarget, string, EventListener][] = [];

  constructor(o: PanoramaOptions) {
    this.o = o;
    this.source = o.lamps;
    this.viewW = o.viewW ?? VIEW_W;
    this.scale = o.scale ?? 1;
    const hgt = o.chips ? LAYOUT.withChips : LAYOUT.withoutChips;
    this.strip = h("div", { class: "pano-strip" });
    this.strip.style.width = `${STRIP_W}px`;
    this.strip.style.height = `${hgt}px`;
    this.el = h("div", { class: "pano", role: "group", "aria-label": "The ENIAC room, unrolled" }, this.strip);
    this.el.style.width = `${this.viewW * this.scale}px`;
    this.el.style.height = `${hgt * this.scale}px`;
    this.el.classList.toggle("dark", this.source.kind === "dark");
    this.place(0);
  }

  /** Builds the strip and draws the lamps once. Call after `el` is in the document. */
  mount(): void {
    this.strip.innerHTML = this.markup();
    // Geometry through the CSSOM (the kiosk's CSP forbids style attributes in markup).
    this.strip.querySelectorAll<HTMLElement>("[data-l],[data-w],[data-t]").forEach((el) => {
      if (el.dataset.l) el.style.left = `${el.dataset.l}px`;
      if (el.dataset.w) el.style.width = `${el.dataset.w}px`;
      if (el.dataset.t) el.style.top = `${el.dataset.t}px`;
    });
    const pick = this.o.onPick;
    if (pick) {
      const tap = (t: PanoTarget) => () => {
        if (this.dragged) return; // the end of a drag is not a tap
        pick(t);
      };
      this.strip.querySelectorAll<HTMLElement>("[data-pick]").forEach((el) => onTap(el, tap(el.dataset.pick!)));
      if (this.o.swipe ?? true) this.installSwipe();
    }
    this.renderer = new LampRenderer(this.strip, () => this.machine());
    this.renderer.flush();
  }

  dispose(): void {
    this.gen++;
    this.renderer?.dispose();
    for (const [t, ev, fn] of this.listeners) t.removeEventListener(ev, fn);
    this.listeners = [];
  }

  // ---------------------------------------------------------------- lamps

  /** The lit state comes only from here: live machine state, or nothing. */
  private machine(): MachineState | null {
    return this.source.kind === "live" ? this.source.machine() : null;
  }

  /** Swap the lamp source (e.g. live once a session exists, dark when it ends). */
  setLamps(source: LampSource): void {
    this.source = source;
    this.el.classList.toggle("dark", source.kind === "dark");
    this.renderer?.invalidate(null);
  }

  /** Machine changed: the touched lamp units, or null to redraw every lamp. */
  invalidate(units: string[] | null): void {
    this.renderer?.invalidate(units);
  }

  /** Synchronous render (tests, screenshots). */
  flush(): void {
    this.renderer?.flush();
  }

  // ---------------------------------------------------------------- position

  get x(): number {
    return this.pos;
  }

  get maxX(): number {
    return maxX(this.viewW);
  }

  /** Panel span of a target ("a7", "pft:ft2"); null for the trays (they run the whole length). */
  span(t: PanoTarget): { at: number; n: number } | null {
    const u = unitById(t.startsWith("pft:") ? t.slice(4) : t);
    return u ? { at: u.at, n: u.n } : null;
  }

  /**
   * Moves the room to x (clamped). Animated with a slide (default 450 ms,
   * ease in and out), or a 200 ms cross-fade when motion is reduced; `ms: 0`
   * jumps. Resolves when done; never waits on an animation frame.
   */
  setX(x: number, opts: { ms?: number; easing?: string } = {}): Promise<void> {
    const to = clampX(x, this.viewW);
    const from = this.pos;
    const gen = ++this.gen;
    if (to === from) {
      this.place(to);
      return Promise.resolve();
    }
    const ms = opts.ms ?? 450;
    if (ms <= 0) {
      this.strip.style.transition = "none";
      this.place(to);
      this.o.onMove?.(to);
      return Promise.resolve();
    }
    if (this.o.reduceMotion?.()) {
      // Reduced motion: no slide; a quick cross-fade to the new spot.
      this.pos = to;
      this.o.onMove?.(to);
      return play(this.strip, [{ opacity: 1 }, { opacity: 0 }], { duration: 100, easing: "linear" }).then(() => {
        if (gen !== this.gen) return;
        this.strip.style.transition = "none";
        this.place(to);
        return play(this.strip, [{ opacity: 0 }, { opacity: 1 }], { duration: 100, easing: "linear" });
      });
    }
    this.strip.style.transition = `transform ${ms}ms ${opts.easing ?? "ease-in-out"}`;
    this.place(to);
    this.o.onMove?.(to);
    return new Promise((r) => setTimeout(r, ms + 30));
  }

  /** One arrow step: 6 panels left (-1) or right (+1). */
  panBy(dir: -1 | 1): Promise<void> {
    return this.setX(stepX(this.pos, dir, this.viewW));
  }

  /** Centres a target (nearest legal position), with the capped pan time. */
  centreOn(t: PanoTarget, opts: { ms?: number } = {}): Promise<void> {
    const s = this.span(t);
    if (!s) return Promise.resolve();
    const to = centreOn(s.at, s.n, this.viewW);
    return this.setX(to, { ms: opts.ms ?? panMs(this.pos, to) });
  }

  /** Pans only if the target is not in the middle 60% of the viewport (UX 14.3.5). */
  reveal(t: PanoTarget): Promise<void> {
    const s = this.span(t);
    if (!s || inMiddle(s, this.pos, this.viewW)) return Promise.resolve();
    return this.centreOn(t);
  }

  private place(x: number): void {
    this.pos = x;
    this.strip.style.transform = `scale(${this.scale}) translateX(${-x}px)`;
  }

  // ---------------------------------------------------------------- rings

  /**
   * Mission view (state C): every target in `targets` gets the yellow ring
   * and the numeral `badge`; everything else dims to 36%. null clears.
   */
  highlight(targets: Set<string> | null, badge = ""): void {
    this.strip.querySelectorAll<HTMLElement>("[data-ring]").forEach((el) => {
      const tray = el.dataset.ring!.startsWith("tray:");
      const id = tray ? el.dataset.ring!.slice(5) : el.dataset.ring!;
      // A cart counts as used when its function table is.
      const on = !!targets && (targets.has(id) || (id.startsWith("pft:") && targets.has(id.slice(4))));
      el.classList.toggle("hl", on);
      el.classList.toggle("dim", !!targets && !on && !tray);
      const b = el.querySelector<HTMLElement>(":scope > .panels > .badge");
      if (b) b.textContent = on ? badge : "";
    });
  }

  /** The cream "selected" ring on these targets (a unit, a cart, a tray, or all 20 accumulators); null clears. */
  select(targets: PanoTarget[] | null): void {
    const set = new Set(targets ?? []);
    this.strip.querySelectorAll<HTMLElement>("[data-ring]").forEach((el) => {
      const id = el.dataset.ring!;
      el.classList.toggle("sel", set.has(id.startsWith("tray:") ? id.slice(5) : id));
    });
  }

  // ---------------------------------------------------------------- swipe (optional, UX 14.3.5)

  private installSwipe(): void {
    const on = (t: EventTarget, ev: string, fn: (e: PointerEvent) => void) => {
      const l = fn as EventListener;
      t.addEventListener(ev, l);
      this.listeners.push([t, ev, l]);
    };
    // Client px per room px (the app is scaled to fit the screen).
    const k = () => {
      const r = this.el.getBoundingClientRect();
      return r.width / (this.viewW || 1) || 1;
    };
    on(this.el, "pointerdown", (e) => {
      if (!e.isPrimary || this.drag) return;
      this.dragged = false;
      this.drag = { id: e.pointerId, x0: e.clientX, sx: this.pos, moved: false };
    });
    on(window, "pointermove", (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      const dx = (e.clientX - d.x0) / k();
      if (!d.moved && Math.abs(dx) < DRAG_PX) return;
      if (!d.moved) {
        d.moved = true;
        this.dragged = true;
        this.gen++;
        this.strip.style.transition = "none";
      }
      const x = clampX(d.sx - dx, this.viewW);
      if (x !== this.pos) {
        this.place(x);
        this.o.onMove?.(x);
      }
    });
    const end = (e: PointerEvent) => {
      if (this.drag && e.pointerId === this.drag.id) this.drag = null;
    };
    on(window, "pointerup", end);
    on(window, "pointercancel", end);
  }

  // ---------------------------------------------------------------- markup

  private markup(): string {
    const pick = !!this.o.onPick;
    const tag = (id: string) => (pick ? ` data-pick="${esc(id)}" role="button"` : "");
    let b = "";
    // Trays: digit trays above the panels, program trays below (UX 14.3.2).
    for (const [k, cls, top, lab] of [["dt", "d", 0, "DIGIT TRAYS: numbers travel here"], ["pt", "p", LAYOUT.progTop, 'PROGRAM TRAYS: "go!" signals']] as const) {
      let tags = "";
      for (let x = 120 + (k === "pt" ? 600 : 0); x < STRIP_W - 400; x += 1500) tags += `<span class="tag" data-l="${x}">${esc(lab)}</span>`;
      b += `<div class="pano-tray ${cls}" data-ring="tray:${k}" data-t="${top}"${tag(k)} aria-label="${k === "dt" ? "Digit trays" : "Program trays"}"><span class="bar"></span><span class="wires"></span>${tags}</div>`;
    }
    // Stubs from the trays to each unit: a hint that units connect to trays (decoration, no wiring claim).
    for (const u of ROOM) {
      const cx = u.at * PITCH + (u.n * PITCH) / 2 - 4;
      b += `<i class="stub d" data-l="${cx}"></i><i class="stub p" data-l="${cx}"></i>`;
    }
    for (const u of ROOM) {
      const w = u.n * PITCH - (PITCH - PANEL_W);
      const panels = unitPanels(u)
        .map((svg) => `<span class="pw">${svg}</span>`)
        .join("");
      let extra = "";
      if (u.kind === "ft") extra += `<span class="pano-cart" data-ring="pft:${u.id}"${tag(`pft:${u.id}`)} aria-label="Portable function table">${portableTableSvg()}<i class="ring"></i></span>`;
      if (u.kind === "ct") extra += `<span class="aux reader">${ibmMachineSvg("reader")}</span>`;
      if (u.kind === "pr") extra += `<span class="aux punch">${ibmMachineSvg("punch")}</span>`;
      b +=
        `<div class="pano-unit k-${u.kind}" data-id="${u.id}" data-ring="${u.id}"${tag(u.id)} aria-label="${esc(unitLabel(u))}" data-l="${u.at * PITCH}" data-w="${u.n * PITCH}">` +
        `<div class="panels" data-w="${w}">${panels}${extra}<i class="ring"></i><b class="badge"></b></div></div>`;
      if (this.o.chips)
        b +=
          `<div class="pano-chip" data-id="${u.id}" data-ring="${u.id}"${tag(u.id)} aria-label="${esc(unitLabel(u))}" data-l="${u.at * PITCH + (PITCH - PANEL_W) / 2}" data-w="${w}">` +
          (u.chip[1] ? `<span>${esc(u.chip[0])}</span><strong>${esc(u.chip[1])}</strong>` : `<strong>${esc(u.chip[0])}</strong>`) +
          `</div>`;
    }
    return b;
  }
}
