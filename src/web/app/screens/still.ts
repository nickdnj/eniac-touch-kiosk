// S9 "Still there?" (issue #23; UX 7.8, FR-32/FR-33).
// Driven by the App's IdleTimer. ANY touch on the overlay dismisses it (the
// tap dispatcher reports activity on finger down) and the touch never leaks
// to the screen below. Expiry is handled by App.idleExpired (end_session
// {reason: idle}, idle_reset metric, back to S1).

import type { App } from "../app.ts";
import { h, s } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { COPY } from "../copy.ts";

const R = 44;
const CIRC = 2 * Math.PI * R;

export function installStillThere(app: App): void {
  let el: HTMLElement | null = null;
  let num: HTMLElement | null = null;
  let arc: SVGElement | null = null;
  let total = 15;

  const set = (left: number) => {
    if (num) num.textContent = String(left);
    arc?.setAttribute("stroke-dashoffset", String(CIRC * (1 - left / total)));
  };

  app.setOverlayHooks({
    onIdleWarn: (left) => {
      total = left;
      el?.remove();
      num = h("span", { class: "count-num" }, String(left));
      arc = s("circle", { cx: 60, cy: 60, r: R, class: "count-arc", "stroke-dasharray": CIRC, "stroke-dashoffset": 0, transform: "rotate(-90 60 60)" });
      const ring = s("svg", { class: "count-ring", viewBox: "0 0 120 120", width: 120, height: 120 }, s("circle", { cx: 60, cy: 60, r: R, class: "count-track" }), arc);
      const here = h("div", { class: "btn primary still-here", role: "button" }, COPY.still.here);
      onTap(here, () => {});
      el = h(
        "div",
        { class: "scrim still-scrim", role: "dialog", "aria-label": COPY.still.title },
        h(
          "div",
          { class: "still" },
          h("h2", { class: "screen-title" }, COPY.still.title),
          h("div", { class: "still-count" }, h("span", {}, COPY.still.body), h("span", { class: "count" }, ring as unknown as HTMLElement, num)),
          here,
        ),
      );
      // The dispatcher dismisses on finger down; this handler only makes
      // sure the release never falls through to the screen below.
      onTap(el, () => {});
      app.overlay.append(el);
    },
    onIdleTick: (left) => set(left),
    onIdleDismiss: () => {
      el?.remove();
      el = num = null;
      arc = null;
    },
  });
}
