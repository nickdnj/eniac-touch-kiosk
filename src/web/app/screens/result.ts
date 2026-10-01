// S7 Result (issue #21; UX 7.6, 8.1.4 result copy).
// Left: the notebook tape, built only from real settled readings. Right: the
// explanation and takeaway from the mission content. Next is offered only
// when the following mission exists and is available (none in M1), so Menu
// is the primary action.

import type { App, Screen } from "../app.ts";
import { h } from "../ui/dom.ts";
import { button, tellMore } from "../ui/overlays.ts";
import { COPY } from "../copy.ts";

export function resultScreen(app: App): Screen {
  const mission = app.mission!;
  const r = mission.content.result;
  const labels = r.buttons ?? [];
  const next = (app.missions ?? []).filter((m) => m.available && m.order > mission.order).sort((a, b) => a.order - b.order)[0];

  const rows = h("div", { class: "rows" }, ...app.tape.map((t) => h("div", { class: "row" }, t.text)));
  const tape = h(
    "div",
    { class: "result-tape" },
    h("h3", {}, COPY.run.tape),
    app.tape.length ? rows : h("p", { class: "empty" }, "–"),
  );

  const right = h(
    "div",
    { class: "result-right" },
    h("h2", { class: "screen-title" }, r.headline),
    h("p", {}, r.body),
    r.takeaway ? h("div", { class: "takeaway" }, h("strong", {}, r.takeaway), r.takeawaySub ? h("span", {}, r.takeawaySub) : null) : null,
    r.more ? button(COPY.rail.tellMore, "more-btn", () => tellMore(app, r.headline, r.more ?? "")) : null,
  );

  const tryAgain = button(labels[1] ?? COPY.result.tryAgain, "try-again", () => void app.startMission(mission.id, "step1"));
  const menu = () => {
    app.endSession("menu");
    app.show({ name: "picker" });
  };
  const actions = h("div", { class: "result-actions" });
  if (next) {
    actions.append(
      button(COPY.result.next(next.title), "primary main next-btn", () => void app.startMission(next.id, "briefing")),
      tryAgain,
      button(labels[2] ?? COPY.result.menu, "menu-btn", menu),
    );
  } else {
    actions.append(button(labels[2] ?? COPY.result.menu, "primary main menu-btn", menu), tryAgain);
  }

  const header = h(
    "div",
    { class: "header" },
    h("span", { class: "title" }, COPY.header.mission(mission.order, mission.title)),
  );
  const el = h("div", { class: "screen result" }, header, tape, right, actions);
  return { el, idle: "setup" };
}
