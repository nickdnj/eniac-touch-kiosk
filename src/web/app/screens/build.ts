// Gunnery, after the shot is aimed: ENIAC sets itself up and walks the visitor
// through the room. The cables and switches were placed by the bridge (the
// wiring is not the game), so this screen shows what the mission uses instead:
// the whole room on its 40 panels, panned to one unit after another with a
// plain line on why it is there. The lamps are the visitor's own session.
// The tour moves on by itself; Next, Back and Skip are always there.

import type { App, Screen } from "../app.ts";
import { h } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { Panorama } from "../explore/panorama.ts";
import { ROOM, centreOn, missionTargets, unitById } from "../explore/room.ts";
import { COPY } from "../copy.ts";
import { fillCard, fmt } from "../run/cards.ts";

/** How long each stop stays before the tour moves on by itself. */
const STOP_MS = 5000;

function reduceMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function buildScreen(app: App): Screen {
  const mission = app.mission!;
  const game = mission.content.game!;
  const copy = game.build;
  const tour = game.tour;
  const cables = mission.config.filter((c) => c.kind === "plug").length;
  const switches = mission.config.filter((c) => c.kind === "switch").length;

  const used = missionTargets(mission.units); // only the units this program really uses are ringed
  const pano = new Panorama({ lamps: { kind: "live", machine: () => app.mirror.machine }, chips: true, reduceMotion });
  const room = h("div", { class: "ex-room build-room" }, pano.el);

  const title = h("h3", { class: "build-stop-title" });
  const text = h("p", { class: "build-stop-text" });
  const count = h("div", { class: "build-count" });
  const back = button(copy.back, "outline build-back", () => go(i - 1, true));
  const next = button(copy.next, "primary main build-next", () => (i >= tour.length - 1 ? finish() : go(i + 1, true)));
  const skip = button(copy.skip, "link build-skip", () => finish());
  const rail = h(
    "div",
    { class: "build-rail" },
    h("h2", { class: "screen-title" }, copy.headline),
    h("p", { class: "build-intro" }, fillCard(copy.intro, { cables: fmt(cables), switches: fmt(switches) })),
    h("div", { class: "build-card" }, count, title, text),
    h("div", { class: "build-buttons" }, back, next),
    skip,
  );
  const header = h("div", { class: "header" }, h("span", { class: "title" }, COPY.header.mission(mission.order, mission.title)));
  const el = h("div", { class: "screen build" }, header, room, rail);

  let i = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let gone = false;

  function finish(): void {
    app.show({ name: "run" });
  }

  /** Looks at stop k: pans there, rings its units, says why it is used, and starts the clock for the next. */
  function go(k: number, manual = false, instant = false): void {
    if (k < 0 || k >= tour.length || gone) return;
    i = k;
    const stop = tour[k];
    const a = unitById(stop.from);
    const b = unitById(stop.to);
    if (a && b) {
      const at = Math.min(a.at, b.at);
      const end = Math.max(a.at + a.n, b.at + b.n);
      pano.highlight(new Set(ROOM.filter((u) => used.has(u.id) && u.at >= at && u.at + u.n <= end).map((u) => u.id)));
      void pano.setX(centreOn(at, end - at), { ms: instant ? 0 : 900 });
    }
    title.textContent = stop.title;
    text.textContent = stop.text;
    count.textContent = fillCard(copy.count, { n: k + 1, total: tour.length });
    next.textContent = k >= tour.length - 1 ? copy.go : copy.next;
    back.classList.toggle("hidden", k === 0);
    if (timer) clearTimeout(timer);
    timer = k >= tour.length - 1 ? null : setTimeout(() => go(k + 1), STOP_MS);
    void manual;
  }

  return {
    el,
    idle: "setup",
    mount: () => {
      pano.mount();
      go(0, false, true);
    },
    unmount: () => {
      gone = true;
      if (timer) clearTimeout(timer);
      pano.dispose();
    },
    onMachine: (units) => pano.invalidate(units),
  };
}
