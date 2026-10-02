// S6 run stage for a card mission with a stack pane (Primes, UX 8.2.5):
//   left:  TESTING (Acc 19's helper readout and its lamps), the 14 GROUP
//          CHECKERS (compact Accumulators 1-14; a checker calls "fits!" when
//          its program-12 lamp lights), PRIMES PER HUNDRED, and the three
//          function tables' ring lamps;
//   right: the punched cards (newest large, 19 older, count and latest).
// Every lamp, number and card is real (state/frame/punch), never a timer.

import type { App } from "../app.ts";
import { accumulatorCompact, ftRingStrip } from "../panels/art.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { LampRenderer } from "../lamps/render.ts";
import { bell } from "../stage/primesfig.ts";
import { BarsPane, StackPane } from "./cardpane.ts";
import { fmt } from "./cards.ts";
import { COPY } from "../copy.ts";

/** A run stage: the left part of S6 for one kind of mission. */
export interface RunStage {
  el: HTMLElement;
  mount(): void;
  onMachine(units: string[] | null): void;
  onCards(): void;
  dispose(): void;
}

/**
 * sieve.e's group checkers: Accumulator n watches the nth odd prime (UX
 * 8.2.1, decoded from the function tables, confirmed in a slow run).
 */
export const CHECKER_SIZES = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

/** How long a checker's "fits!" stays up after its lamp went out (a lamp decay, not data). */
export const FITS_HOLD_MS = 400;

export function stackStage(app: App, reduceMotion: boolean): RunStage {
  const mission = app.mission!;
  const watch = mission.run.watch[0] ?? "19";
  const P = COPY.primesRun;

  // ---- TESTING: the number being tested, live from Acc 19.
  const readout = h("span", { class: "testing-value", "data-acc": watch }, "–");
  const testing = h(
    "div",
    { class: "testing" },
    h("div", { class: "testing-text" }, h("div", { class: "pane-title" }, P.testing), h("div", { class: "testing-sub" }, P.helper(watch))),
    readout,
    svgFromString(accumulatorCompact(Number(watch), false, 9).markup) as unknown as HTMLElement,
  );

  // ---- GROUP CHECKERS: Acc 1-14 compact, with the "fits!" call.
  const chips: { n: string; el: HTMLElement; until: number }[] = [];
  const grid = h("div", { class: "checker-grid" });
  CHECKER_SIZES.forEach((k, i) => {
    const n = String(i + 1);
    const call = h("div", { class: "gcheck-call" }, bell(), P.fits);
    const el = h(
      "div",
      { class: "gcheck", "data-acc": n, "data-k": k },
      h("div", { class: "gcheck-k" }, String(k)),
      svgFromString(accumulatorCompact(i + 1, false, 8).markup) as unknown as HTMLElement,
      h("div", { class: "gcheck-acc" }, P.acc(n)),
      call,
    );
    grid.append(el);
    chips.push({ n, el, until: 0 });
  });
  const checkers = h("div", { class: "checkers-pane" }, h("div", { class: "pane-title" }, P.checkers), grid);

  // ---- PRIMES PER HUNDRED and the function tables' ring lamps.
  const bars = new BarsPane(app, 840, 84);
  const fts = h(
    "div",
    { class: "ft-strips" },
    ...[1, 2, 3].map((u) => svgFromString(ftRingStrip(u).markup) as unknown as HTMLElement),
  );

  const left = h("div", { class: "stack-left" }, testing, checkers, bars.el, fts);
  const pane = new StackPane(app, { rows: 19, bigW: 480, bigH: 150, reduceMotion });
  const el = h("div", { class: "stack-stage" }, left, pane.el);
  const renderer = new LampRenderer(el, () => app.mirror.machine);
  let holdTimer: ReturnType<typeof setTimeout> | null = null;

  function refreshReadout(): void {
    const v = app.mirror.machine?.acc?.[watch]?.value;
    readout.textContent = typeof v === "number" ? fmt(v) : "–";
  }

  /** A checker shows "fits!" while its program-12 lamp is lit, plus a short decay. */
  function refreshChips(): void {
    const m = app.mirror.machine;
    const now = performance.now();
    let pending = false;
    for (const c of chips) {
      const lit = m?.acc?.[c.n]?.prog?.[11] === "1";
      if (lit) c.until = now + FITS_HOLD_MS;
      const on = !!m && (lit || now < c.until);
      c.el.classList.toggle("fits", on);
      if (on && !lit) pending = true;
    }
    if (pending && !holdTimer) holdTimer = setTimeout(() => ((holdTimer = null), refreshChips()), FITS_HOLD_MS);
  }

  return {
    el,
    mount: () => {
      refreshReadout();
      refreshChips();
      bars.update();
      pane.update(true);
      renderer.invalidate(null);
    },
    onMachine: (units) => {
      renderer.invalidate(units);
      if (units === null || units.some((u) => u.startsWith("acc."))) {
        refreshReadout();
        refreshChips();
      }
    },
    onCards: () => {
      bars.update();
      pane.update();
    },
    dispose: () => {
      renderer.dispose();
      if (holdTimer) clearTimeout(holdTimer);
    },
  };
}
