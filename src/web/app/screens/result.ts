// S7 Result (issue #21; UX 7.6, 8.1.4 result copy, 8.2.5 result copy).
// Squares: the notebook tape, built only from real settled readings.
// Card missions (Primes): the punched cards and the per-hundred bars, live:
// the screen keeps receiving cards while the machine works on, with a live
// line ("ENIAC is still working: 143 primes so far."). If the visitor
// skipped ahead, S7 first waits for the answer checkpoint with a real count
// and then shows the headline: nothing is made up (no demo fallback).
// Right: the explanation and takeaway from the mission content. The primary
// action names the next mission in the suggested order (UX 8.4), else Menu
// (or Finish where the mission says so).

import type { App, Screen } from "../app.ts";
import type { ServerMsg } from "../protocol.ts";
import { h } from "../ui/dom.ts";
import { button, tellMore } from "../ui/overlays.ts";
import { BarsPane, StackPane } from "../run/cardpane.ts";
import { fillCard } from "../run/cards.ts";
import { COPY } from "../copy.ts";

function reduceMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resultScreen(app: App): Screen {
  const mission = app.mission!;
  const r = mission.content.result;
  const labels = r.buttons ?? [];
  const next = (app.missions ?? []).filter((m) => m.available && m.order > mission.order).sort((a, b) => a.order - b.order)[0];
  const cardMission = !!mission.run.cards;
  const live = r.live;

  // ------------------------------------------------------------------ left
  let left: HTMLElement;
  let pane: StackPane | null = null;
  let bars: BarsPane | null = null;
  const liveLine = h("p", { class: "live-line", "aria-live": "polite" });
  if (cardMission) {
    pane = new StackPane(app, { rows: 10, bigW: 480, bigH: 150, reduceMotion: reduceMotion() });
    const parts: HTMLElement[] = [h("div", { class: "result-cards-top" }, pane.el, h("div", { class: "live-col" }, liveLine))];
    if (app.cards.spec?.bars) {
      bars = new BarsPane(app, 840, 64);
      parts.push(bars.el);
    }
    left = h("div", { class: "result-cards" }, ...parts);
  } else {
    const rows = h("div", { class: "rows" }, ...app.tape.map((t) => h("div", { class: "row" }, t.text)));
    left = h("div", { class: "result-tape" }, h("h3", {}, COPY.run.tape), app.tape.length ? rows : h("p", { class: "empty" }, "–"));
  }

  // ------------------------------------------------------------------ right
  const waiting = h("div", { class: "result-waiting" }, h("span", { class: "spinner" }), h("span", { class: "waiting-text" }));
  const answer = h(
    "div",
    { class: "result-answer" },
    h("h2", { class: "screen-title" }, r.headline),
    h("p", {}, r.body),
    r.takeaway ? h("div", { class: "takeaway" }, h("strong", {}, r.takeaway), r.takeawaySub ? h("span", {}, r.takeawaySub) : null) : null,
    r.more ? button(COPY.rail.tellMore, "more-btn", () => tellMore(app, r.headline, r.more ?? "")) : null,
  );
  const right = h("div", { class: "result-right" }, waiting, answer);

  // ------------------------------------------------------------------ actions
  const tryAgain = button(labels[1] ?? COPY.result.tryAgain, "try-again", () => void app.startMission(mission.id, "step1"));
  const menu = () => {
    app.endSession("menu");
    app.show({ name: "picker" });
  };
  const finish = () => {
    // S8 finale is not built yet: Finish ends the visit at the start screen.
    app.endSession("done");
    app.show({ name: "start" });
  };
  const actions = h("div", { class: "result-actions" });
  if (next) {
    actions.append(
      button(COPY.result.next(next.title), "primary main next-btn", () => {
        app.metric({ t: "metric", ev: "picker_next_used", mission: next.id });
        void app.startMission(next.id, "briefing");
      }),
      tryAgain,
      button(labels[2] ?? COPY.result.menu, "menu-btn", menu),
    );
  } else if (labels[0] === COPY.result.finish) {
    actions.append(button(COPY.result.finish, "primary main finish-btn", finish), tryAgain, button(labels[2] ?? COPY.result.menu, "menu-btn", menu));
  } else {
    actions.append(button(labels[2] ?? COPY.result.menu, "primary main menu-btn", menu), tryAgain);
  }

  const header = h("div", { class: "header" }, h("span", { class: "title" }, COPY.header.mission(mission.order, mission.title)));
  const el = h("div", { class: `screen result${cardMission ? " cards" : ""}` }, header, left, right, actions);

  let idleMode: "run" | "setup" = cardMission && live?.doneAt && !app.checkpoints.has(live.doneAt) ? "run" : "setup";

  /** The answer shows once the result checkpoint fired; until then a real count. */
  function refresh(): void {
    const reached = app.checkpoints.has(mission.result) || !cardMission;
    const n = app.cards.count;
    waiting.classList.toggle("hidden", reached || !live?.waiting);
    answer.classList.toggle("hidden", !reached && !!live?.waiting);
    (waiting.querySelector(".waiting-text") as HTMLElement).textContent = live?.waiting ? fillCard(live.waiting, { n }) : "";
    if (!live) return;
    const done = !!live.doneAt && app.checkpoints.has(live.doneAt);
    // While the machine is still computing people watch: the run timeout
    // (FR-32, 3 min) applies; once it is done, S7's normal timer.
    if (done && idleMode === "run") {
      idleMode = "setup";
      app.idle.setMode("setup");
    }
    liveLine.textContent = !reached ? "" : done && live.done ? fillCard(live.done, { n }) : live.pending ? fillCard(live.pending, { n }) : "";
    liveLine.classList.toggle("done", done);
    pane?.update();
    bars?.update();
  }

  return {
    el,
    idle: idleMode,
    mount: () => {
      // This visitor reached S7: the picker marks the mission Done (UX 8.4).
      app.done.add(mission.id);
      pane?.update(true);
      bars?.update();
      refresh();
    },
    onMessage: (m: ServerMsg) => {
      if (m.t === "punch" || m.t === "checkpoint") refresh();
    },
  };
}
