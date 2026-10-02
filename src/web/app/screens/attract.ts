// S1 Attract, live (UX 14.2; PRD FR-30, FR-31, FR-34 to FR-36, FR-43, FR-44).
//
// The real attract flight, drawn as it happens: the whole room on the
// shared panorama (explore/panorama.ts) with its lamps from the attract
// core, a slow drift along the U (cuts with reduced motion), the shell's
// path plotted dot by dot from the real punched cards (the Trajectory
// mission's ArcPlot), the live caption, the landing hold with the landing
// card's numbers, "Starting another flight." with the last real frame dimmed
// between flights, the Stuart plate and the rotating honor plate.
//
// Honest by construction (FR-36, no demo fallback): the lamps are the
// mirror's machine of the attract session only (or, between flights, the
// last frame it really sent); the dots are the attract store's cards; the
// caption and the landing numbers come from the bridge's attract status. No
// live status for 5 s hands over to S10 (App.attractLost).
//
// The whole screen is one touch target: the first touch goes to the picker
// and does nothing else (FR-31); App.show sends attract_stop {reason:"touch"}.

import type { App, Screen } from "../app.ts";
import type { MachineState, ServerMsg } from "../protocol.ts";
import { Panorama } from "../explore/panorama.ts";
import { ArcPlot } from "../run/filmstage.ts";
import { h } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { play } from "../ui/anim.ts";
import { honorRotator, stuartPlate } from "../ui/plates.ts";
import { COPY } from "../copy.ts";
import {
  ATTRACT_SCALE,
  ATTRACT_VIEW_W,
  CUT_EVERY_MS,
  CUT_FADE_MS,
  FRAMINGS,
  attractDown,
  chipOf,
  driftEnds,
  driftMs,
  landingLines,
  lampUnitsAt,
  sceneOf,
  type Scene,
} from "../attract/view.ts";

/** How often the LIVE chip and the FR-36 rule are re-checked (frames may stop: nothing else would tick). */
const TICK_MS = 250;
/** The room repaints its lamps at most this often (UX 14.2.3, NFR-04: S1 runs all day). */
const LAMP_MS = 100;
/** The last landed flight's real duration (the bridge's landing.flightMs): paces the next drift. Kept across visits to S1. */
let lastFlightMs: number | null = null;

const REDUCE_MOTION = false; // UX 9.5: the staff setting; wired to config in M3 (as screens/run.ts)
function reduceMotion(): boolean {
  return REDUCE_MOTION || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export function attractScreen(app: App): Screen {
  const st = app.attract;
  const reduce = reduceMotion();

  // ------------------------------------------------------------ lamps
  // Live: the attract session's own frames. Between flights: the last frame
  // the finished flight really sent (UX 14.2.4), dimmed. Otherwise dark.
  let lastReal: MachineState | null = null;
  let held: MachineState | null = null;
  const liveMachine = (): MachineState | null => {
    const s = app.mirror.session;
    if (!s || s.mode !== "attract") return null;
    const p = st.phase;
    return p === "reading" || p === "flying" || p === "landed" ? app.mirror.machine : null;
  };
  const machine = (): MachineState | null => (st.dimmed ? held : liveMachine());
  const pano = new Panorama({ lamps: { kind: "live", machine }, viewW: ATTRACT_VIEW_W, scale: ATTRACT_SCALE });

  // UX 14.2.3: only the panels on screen update (about 12 of 40). Units off
  // screen are marked stale and drawn when the camera brings them in.
  const strip = pano.el.querySelector<HTMLElement>(".pano-strip")!;
  /** Where the camera is now, mid-drift included (the CSS transition's current value). */
  const camX = (): number => {
    const t = getComputedStyle(strip).transform;
    if (!t || t === "none") return pano.x;
    return Math.max(0, -new DOMMatrixReadOnly(t).m41 / ATTRACT_SCALE);
  };
  let onScreen = lampUnitsAt(0, 2);
  const stale = new Set<string>();
  const refreshVisible = () => {
    onScreen = lampUnitsAt(camX(), 2);
    const due = [...stale].filter((u) => onScreen.has(u));
    for (const u of due) stale.delete(u);
    if (due.length) pano.invalidate(due);
  };
  // The room repaints its lamps at most every LAMP_MS (the latest real frame
  // each time; nothing is interpolated): at Full speed the core changes
  // hundreds of lamps between two screen frames, and S1 runs all day.
  const pending = new Set<string>();
  let lampTimer: ReturnType<typeof setTimeout> | null = null;
  const flushLamps = () => {
    lampTimer = null;
    if (pending.size) pano.invalidate([...pending]);
    pending.clear();
  };
  const lampsChanged = (units: string[] | null) => {
    if (units === null) {
      stale.clear();
      pending.clear();
      pano.invalidate(null);
      return;
    }
    for (const u of units) {
      if (onScreen.has(u)) pending.add(u);
      else stale.add(u);
    }
    if (pending.size && !lampTimer) lampTimer = setTimeout(flushLamps, LAMP_MS);
  };

  // ------------------------------------------------------------ parts
  const chipText = h("span", { class: "att-chip-text" }, COPY.attract.live);
  const chip = h("div", { class: "att-chip hidden", role: "status" }, h("span", { class: "att-chip-dot", "aria-hidden": "true" }), chipText);
  const room = h("div", { class: "att-room" }, pano.el, h("div", { class: "att-room-shade", "aria-hidden": "true" }), chip);

  const caption = h("span", { class: "att-caption-text" });
  const captionRow = h("div", { class: "att-caption", "aria-live": "polite" }, h("span", { class: "spinner att-spin", "aria-hidden": "true" }), caption);

  const hopTag = h("span", { class: "att-plot-hop" });
  const plotHost = h("div", { class: "att-plot-host" });
  const plotEmpty = h("div", { class: "att-plot-empty" }, COPY.attract.plotEmpty);
  const land1 = h("span", { class: "att-land-hop" });
  const land2 = h("span", { class: "att-land-cards" });
  const landing = h("div", { class: "att-landing hidden" }, land1, land2);
  const plotCard = h(
    "div",
    { class: "att-plot", role: "img", "aria-label": COPY.attract.plotTitle },
    h("div", { class: "att-plot-head" }, h("span", { class: "att-plot-title" }, COPY.attract.plotTitle), hopTag),
    plotHost,
    plotEmpty,
  );
  let plot: ArcPlot | null = null;

  const rotator = honorRotator({ reduceMotion: reduce });
  const pill = h("div", { class: `start-pill att-pill${reduce ? " still" : ""}` }, COPY.start.pill);

  const el = h(
    "div",
    { class: "screen start attract", role: "button", "aria-label": COPY.start.pill, "data-scene": "waking" },
    h("div", { class: "start-title" }, COPY.start.title),
    h("div", { class: "start-sub" }, COPY.start.subtitle),
    plotCard,
    room,
    captionRow,
    landing,
    h("div", { class: "att-stuart" }, stuartPlate("attract")),
    pill,
    h("div", { class: "att-honor" }, rotator.el),
  );
  // The whole screen is the target; the first touch only leaves S1 (FR-31).
  onTap(el, () => app.show({ name: "picker" }));

  // ------------------------------------------------------------ camera
  // UX 14.2.2: one slow drift per flight along the whole U, ease in and out
  // at each end, alternating direction. Reduced motion: cuts (below).
  let drifting = -1;
  const camera = () => {
    if (reduce) return;
    const f = st.flight;
    if (st.phase === "flying" && f !== drifting) {
      drifting = f;
      const { to } = driftEnds(f);
      if (to !== pano.x) void pano.setX(to, { ms: driftMs(pano.x, to, lastFlightMs), easing: "ease-in-out" });
    }
  };
  let cut = 0;
  const cutNext = () => {
    cut = (cut + 1) % FRAMINGS.length;
    const host = pano.el;
    void play(host, [{ opacity: 1 }, { opacity: 0 }], { duration: CUT_FADE_MS / 2, easing: "linear" }).then(() => {
      if (disposed) return;
      void pano.setX(FRAMINGS[cut], { ms: 0 });
      refreshVisible();
      void play(host, [{ opacity: 0 }, { opacity: 1 }], { duration: CUT_FADE_MS / 2, easing: "linear" });
    });
  };

  // ------------------------------------------------------------ render
  let scene: Scene | null = null;
  let shownCaption = "";
  const render = () => {
    const p = st.phase;
    const sc = sceneOf(p);
    // Keep the last frame the flight really sent, to hold it dimmed between flights.
    const live = liveMachine();
    if (live) lastReal = live;
    if (sc !== scene) {
      if (sc === "between") held = lastReal;
      else if (sc === "live") held = null;
      scene = sc;
      el.dataset.scene = sc;
      lampsChanged(null);
      if (ticking) tick(); // the chip follows the phase at once
    }
    const text = st.caption() || COPY.attract.waking;
    if (text !== shownCaption) {
      shownCaption = text;
      caption.textContent = text;
    }
    // The shell's path: dots from the attract flight's real cards only.
    if (!plot && st.plotCopy) {
      plot = new ArcPlot(app, 608, 208, { log: () => st.cards, copy: st.plotCopy }, { l: 24, r: 20, t: 56, b: 34 });
      plotHost.append(plot.el);
    }
    plot?.update();
    const n = st.cards.count;
    plotEmpty.classList.toggle("hidden", n > 0);
    hopTag.textContent = n > 0 ? COPY.attract.hop(st.hop) : "";
    // The landing numbers: the bridge's decoded landing card, else the same
    // card from this flight's own log (the first below ground; the clock froze on it).
    const dl = st.cards.landed;
    const land = st.landing ?? (dl && st.cards.last?.n === dl.n ? { card: dl.n, hop: st.hop, along: dl.x, up: dl.y, text: st.cards.last.text, flightMs: 0 } : null);
    if (st.landing && st.landing.flightMs > 0) lastFlightMs = st.landing.flightMs;
    const ll = sc === "landed" || sc === "between" ? landingLines(land) : null;
    landing.classList.toggle("hidden", !ll);
    if (ll) {
      land1.textContent = ll[0];
      land2.textContent = ll[1];
    }
    camera();
  };

  // LIVE / WAITING, and FR-36: no live status for 5 s is S10.
  let notRunningSince = app.now();
  const tick = () => {
    refreshVisible();
    const now = app.now();
    const l = st.liveness(now);
    const c = chipOf(l);
    chip.classList.toggle("hidden", c === "hidden");
    chip.classList.toggle("waiting", c === "waiting");
    const word = c === "waiting" ? COPY.attract.waiting : COPY.attract.live;
    if (chipText.textContent !== word) chipText.textContent = word;
    if (l !== "off" && l !== "error") notRunningSince = now;
    if (attractDown(l, now - notRunningSince)) app.attractLost();
  };

  let disposed = false;
  let ticking = false;
  let ticker: ReturnType<typeof setInterval> | null = null;
  let cutter: ReturnType<typeof setInterval> | null = null;
  return {
    el,
    idle: "none", // attract has no timeout (FR-32)
    mount: () => {
      app.root.querySelector("#admin-zone")?.classList.add("hide-mark");
      pano.mount();
      // Start where this flight's drift starts (or the first framing).
      void pano.setX(reduce ? FRAMINGS[0] : driftEnds(st.flight).from, { ms: 0 });
      render();
      tick();
      rotator.start();
      ticker = setInterval(tick, TICK_MS);
      ticking = true;
      if (reduce) cutter = setInterval(cutNext, CUT_EVERY_MS);
    },
    unmount: () => {
      disposed = true;
      app.root.querySelector("#admin-zone")?.classList.remove("hide-mark");
      if (ticker) clearInterval(ticker);
      if (cutter) clearInterval(cutter);
      if (lampTimer) clearTimeout(lampTimer);
      rotator.stop();
      pano.dispose();
    },
    onMessage: (m: ServerMsg) => {
      if (m.t === "frame") return; // lamps come through onMachine; the chip through the ticker
      render();
    },
    onMachine: (units) => {
      const live = liveMachine();
      if (live) lastReal = live;
      if (!st.dimmed) lampsChanged(units);
    },
  };
}
