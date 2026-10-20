// S7 Result (issue #21; UX 7.6, 8.1.4 result copy, 8.2.5 result copy).
// Squares: the notebook tape, built only from real settled readings.
// Card missions (Primes): the punched cards and the per-hundred bars, live:
// the screen keeps receiving cards while the machine works on, with a live
// line ("ENIAC is still working: 143 primes so far."). If the visitor
// skipped ahead, S7 first waits for the answer checkpoint with a real count
// and then shows the headline: nothing is made up (no demo fallback).
// Right: the explanation and takeaway from the mission content. The primary
// action names the next mission not yet done this visit, in the order 1, 2,
// 3, and reads Finish when none is left: Finish opens the S8 finale (UX
// 14.5.1). Without a mission list it is Menu.

import type { App, Screen } from "../app.ts";
import type { ServerMsg } from "../protocol.ts";
import { h } from "../ui/dom.ts";
import { button, tellMore } from "../ui/overlays.ts";
import { BarsPane, StackPane } from "../run/cardpane.ts";
import { ArcPlot } from "../run/filmstage.ts";
import { fillCard } from "../run/cards.ts";
import { compare, question, readRows } from "../yourturn/logic.ts";
import { COPY } from "../copy.ts";
import { HONOR } from "../content/honor.ts";
import { openHonor } from "./honor.ts";
import { EXPLORE } from "../explore/content.ts";

/** How many rows of the two tables sit side by side (Your turn). */
const COMPARE_ROWS = 8;

function reduceMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resultScreen(app: App): Screen {
  const mission = app.mission!;
  const r = mission.content.result;
  const labels = r.buttons ?? [];
  const available = (app.missions ?? []).filter((m) => m.available).sort((a, b) => a.order - b.order);
  // This mission counts as done (mount marks it); the next is the first one not done yet.
  const next = available.find((m) => m.id !== mission.id && !app.done.has(m.id));
  const allDone = available.length > 0 && !next;
  const cardMission = !!mission.run.cards;
  const live = r.live;
  // Your turn (Difference): after the first run, a button; after the visitor's own run, the two tables side by side.
  const yt = mission.content.yourTurn;
  const second = !!yt && app.yourTurn?.steady != null;
  const ytRows = () => readRows(app.cards.cards, mission.run.cards?.value ?? [], yt?.predict.change ?? []);

  // ------------------------------------------------------------------ left
  let left!: HTMLElement;
  let pane: StackPane | null = null;
  let bars: BarsPane | null = null;
  let arc: ArcPlot | null = null;
  const liveLine = h("p", { class: "live-line", "aria-live": "polite" });
  if (cardMission && mission.run.plot) {
    // Trajectory: the full arc from the real cards, landing tagged, and the count.
    arc = new ArcPlot(app, 848, 600);
    left = h("div", { class: "result-cards result-arc" }, arc.el, liveLine);
  } else if (cardMission) {
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
    // UX 14.3.7: where this mission's units stand in the room (the session is untouched).
    button(EXPLORE.resultLink, "explore-btn", () =>
      app.show({ name: "explore", explore: { from: "result", mission: mission.id, back: { name: "result" } } }),
    ),
    // UX 14.6.3: Trajectory links to the women who set up the 1946 shell path (S11 page 2).
    HONOR.resultLink.missions.includes(mission.id)
      ? button(`${HONOR.resultLink.text} ›`, "link honor-link", () => openHonor(app, HONOR.resultLink.page, { name: "result" }))
      : null,
  );
  // Your turn: the headline and body change after the visitor's own run; a table shows how the two runs differ.
  const answerHead = answer.querySelector("h2") as HTMLElement;
  const answerBody = answer.querySelector("p") as HTMLElement;
  const compareBox = h("div", { class: "yt-compare hidden", role: "table" });
  const yourTurnBtn = yt && !second ? button(`${yt.button} ›`, "yt-btn hidden", () => app.show({ name: "yourturn" })) : null;
  if (yt && second) answer.querySelector(".takeaway")?.classList.add("hidden");
  if (yt) answer.append(compareBox);
  if (yourTurnBtn) answer.append(yourTurnBtn);
  const right = h("div", { class: `result-right${yt && second ? " yt-second" : ""}` }, waiting, answer);

  // ------------------------------------------------------------------ actions
  // After the visitor's own run, "Try again" becomes "Try another number" (another run of Your turn).
  const tryAgain =
    yt && second
      ? button(yt.compare.button, "try-again", () => void app.startMission(mission.id, "yourturn"))
      : button(labels[1] ?? COPY.result.tryAgain, "try-again", () => void app.startMission(mission.id, "step1"));
  const menu = () => {
    app.endSession("menu");
    app.show({ name: "picker" });
  };
  const finish = () => {
    // Every mission reached its result this visit: the finale (UX 14.5.1).
    app.endSession("done");
    app.show({ name: "finale", beat: 1 });
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
  } else if (allDone) {
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
    arc?.update();
    refreshYourTurn();
  }

  /** The Your turn button and the comparison, from the visitor's real cards only. */
  function refreshYourTurn(): void {
    if (!yt) return;
    const rows = ytRows();
    if (!second) {
      // Offer it only once the real cards can support the question (never a made-up row).
      yourTurnBtn?.classList.toggle("hidden", !app.checkpoints.has(mission.result) || !question(rows, yt.predict.show));
      return;
    }
    const first = app.yourTurn!.first;
    const steady = app.yourTurn!.steady!;
    const cmp = compare(first, rows, COMPARE_ROWS);
    const same = steady === app.yourTurn!.firstSteady && cmp.identical;
    answerHead.textContent = yt.compare.headline;
    answerBody.textContent = fillCard(same ? yt.compare.same : yt.compare.body, { n: steady, k: cmp.matching });
    compareBox.classList.remove("hidden");
    compareBox.replaceChildren(
      h("div", { class: "yt-chead" }, h("div", { class: "yt-n" }, COPY.yourTurn.row), h("div", {}, yt.compare.first), h("div", {}, yt.compare.yours)),
      ...cmp.rows.map((r) =>
        h("div", { class: `yt-crow${r.differs ? " differs" : ""}` }, h("div", { class: "yt-n" }, String(r.n)), h("div", {}, String(r.first)), h("div", {}, r.yours === null ? "…" : String(r.yours))),
      ),
    );
  }

  return {
    el,
    idle: idleMode,
    mount: () => {
      // This visitor reached S7: the picker marks the mission Done (UX 8.4).
      app.done.add(mission.id);
      pane?.update(true);
      bars?.update();
      arc?.update(true);
      refresh();
    },
    onMessage: (m: ServerMsg) => {
      if (m.t === "punch" || m.t === "checkpoint") refresh();
    },
  };
}
