// Your turn, part 1: guess the next row (Difference). Shown from the result
// screen. The rows are the visitor's own punched cards, and the right answer
// is the card ENIAC really punched next: nothing is made up. After the answer
// (right or wrong, the sum is shown) "Now bend the table" starts a fresh run
// in which the visitor picks the steady number (screens/mission.ts, entry
// "yourturn") and the result screen compares the two tables.

import type { App, Screen } from "../app.ts";
import { h } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { COPY } from "../copy.ts";
import { fmt, fillCard } from "../run/cards.ts";
import { question, readRows } from "../yourturn/logic.ts";

/** How many of the first run's rows are remembered for the comparison. */
const KEEP_ROWS = 20;

export function yourTurnScreen(app: App): Screen {
  const mission = app.mission!;
  const yt = mission.content.yourTurn!;
  const p = yt.predict;
  const spec = mission.run.cards!;
  const rows = readRows(app.cards.cards, spec.value, p.change);
  const q = question(rows, p.show);

  const header = h("div", { class: "header" }, h("span", { class: "title" }, COPY.header.mission(mission.order, mission.title)));
  const back = button(COPY.yourTurn.back, "back-btn", () => app.show({ name: "result" }));
  const actions = h("div", { class: "result-actions yt-actions" }, back);

  if (!q) {
    // The cards cannot support the question: say so; never invent rows.
    const el = h(
      "div",
      { class: "screen yourturn" },
      header,
      h("div", { class: "yt-right" }, h("h2", { class: "screen-title" }, p.headline), h("p", {}, COPY.yourTurn.notReady)),
      actions,
    );
    return { el, idle: "setup", coreOptional: true };
  }

  // ------------------------------------------------------------------ left: the rows
  const cell = (cls: string, text: string) => h("div", { class: cls }, text);
  const askedValue = cell("yt-v yt-asked", "?");
  const askedChange = cell("yt-d yt-asked", "");
  const table = h(
    "div",
    { class: "yt-table", role: "table" },
    h("div", { class: "yt-head" }, cell("yt-n", COPY.yourTurn.row), cell("yt-v", COPY.yourTurn.value), cell("yt-d", COPY.yourTurn.change)),
    ...q.shown.map((r) => h("div", { class: "yt-row" }, cell("yt-n", String(r.n)), cell("yt-v", fmt(r.v)), cell("yt-d", fmt(r.d)))),
    h("div", { class: "yt-row yt-ask-row" }, cell("yt-n", String(q.row)), askedValue, askedChange),
  );
  const left = h("div", { class: "yt-left" }, table);

  // ------------------------------------------------------------------ right: the question
  const vars = { row: q.row, v: fmt(q.v), from: fmt(q.from), d: fmt(q.d) };
  const feedback = h("p", { class: "yt-feedback hidden", "aria-live": "polite" });
  let answered = false;
  const go = button(p.go, "primary main yt-go hidden", () => {
    // Remember the first table (the visitor's real cards), then start a fresh run that lets them choose.
    const step = mission.steps.find((s) => s.id === yt.step);
    const firstSteady = step && step.kind === "switch" ? step.value : "";
    app.yourTurn = { first: rows.slice(0, KEEP_ROWS), firstSteady, steady: null };
    void app.startMission(mission.id, "yourturn");
  });
  const optionButtons: HTMLElement[] = q.options.map((v) =>
    button(fmt(v), "yt-option", () => {
      if (answered) return;
      answered = true;
      const right = v === q.v;
      optionButtons.forEach((b, i) => {
        b.classList.add("locked");
        if (q.options[i] === q.v) b.classList.add("right");
        else if (q.options[i] === v) b.classList.add("wrong");
      });
      askedValue.textContent = fmt(q.v);
      askedValue.classList.add("revealed");
      feedback.textContent = fillCard(right ? p.right : p.wrong, vars);
      feedback.classList.toggle("is-right", right);
      feedback.classList.remove("hidden");
      go.classList.remove("hidden");
    }),
  );
  const right = h(
    "div",
    { class: "yt-right" },
    h("h2", { class: "screen-title" }, p.headline),
    h("p", { class: "yt-body" }, p.body),
    h("p", { class: "yt-ask" }, fillCard(p.ask, vars)),
    h("div", { class: "yt-options" }, ...optionButtons),
    feedback,
  );
  actions.append(go);

  const el = h("div", { class: "screen yourturn" }, header, left, right, actions);
  return { el, idle: "setup", coreOptional: true };
}
