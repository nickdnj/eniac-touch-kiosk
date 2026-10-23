// Gunnery, before the first cable: aim the gun. The target is a flag on a range
// ruler; the visitor chooses a charge (how fast the shell leaves the gun) and an
// elevation (how steeply it climbs). Locking in sends `aim`; the bridge dials
// the launch speeds into the Constant Transmitter and the mission screen takes
// over at step 1. Nothing about where the shell will land is shown or guessed:
// ENIAC works it out.

import type { App, Screen } from "../app.ts";
import type { ServerMsg } from "../protocol.ts";
import { h, s } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { COPY } from "../copy.ts";
import { fillCard, fmt } from "../run/cards.ts";
import { newRound } from "../game/logic.ts";

const W = 800;
const H = 360;
const PAD = 40;
const GROUND = 280;

export function aimScreen(app: App): Screen {
  const mission = app.mission!;
  const game = mission.content.game!;
  const copy = game.aim;
  const round = (app.game ??= newRound(game));
  let charge = round.charge;
  let elevation = round.elevation;
  let sent = false;

  const header = h("div", { class: "header" }, h("span", { class: "title" }, COPY.header.mission(mission.order, mission.title)));

  // ------------------------------------------------------------------ left: the range
  const reach = Math.max(...game.targets.map((t) => t.feet)) * 1.5;
  const X = (feet: number) => PAD + (feet / reach) * (W - 2 * PAD);
  const step = reach > 60000 ? 20000 : reach > 25000 ? 10000 : 5000;
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "aim-range", role: "img", "aria-label": fillCard(copy.target, { feet: fmt(round.target) }) });
  svg.append(s("line", { x1: PAD, y1: GROUND, x2: W - PAD, y2: GROUND, class: "aim-ground" }));
  for (let f = 0; f <= reach; f += step) {
    svg.append(s("line", { x1: X(f), y1: GROUND, x2: X(f), y2: GROUND + 12, class: "aim-tick" }));
    svg.append(s("text", { x: X(f), y: GROUND + 40, class: "aim-tick-text", "text-anchor": "middle" }, f === 0 ? "0" : `${fmt(f)}`));
  }
  const fx = X(round.target);
  svg.append(
    s("line", { x1: fx, y1: GROUND, x2: fx, y2: GROUND - 120, class: "aim-pole" }),
    s("path", { d: `M${fx} ${GROUND - 120} L${fx + 56} ${GROUND - 100} L${fx} ${GROUND - 80}Z`, class: "aim-flag" }),
  );
  const barrel = s("g", { class: "aim-gun", transform: `translate(${X(0) + 26} ${GROUND - 18})` });
  const tube = s("rect", { x: 0, y: -8, width: 78, height: 16, rx: 4, class: "aim-barrel" });
  barrel.append(tube);
  svg.append(s("circle", { cx: X(0) + 26, cy: GROUND - 18, r: 18, class: "aim-wheel" }), barrel);
  const turn = () => barrel.setAttribute("transform", `translate(${X(0) + 26} ${GROUND - 18}) rotate(${-(game.elevations.find((e) => e.id === elevation)?.deg ?? 0)})`);
  turn();
  const targetLine = h("div", { class: "aim-target" }, fillCard(copy.target, { feet: fmt(round.target) }));
  const left = h("div", { class: "aim-left" }, targetLine, svg, h("div", { class: "aim-unit" }, "feet from the gun"));

  // ------------------------------------------------------------------ right: the two choices
  const feedback = h("p", { class: "aim-feedback", "aria-live": "polite" });
  const chargeBtns = new Map<string, HTMLElement>();
  const elevBtns = new Map<string, HTMLElement>();
  const refresh = () => {
    chargeBtns.forEach((b, id) => b.classList.toggle("chosen", id === charge));
    elevBtns.forEach((b, id) => b.classList.toggle("chosen", id === elevation));
    turn();
    feedback.textContent = "";
  };
  for (const c of game.charges) {
    const b = button("", "aim-choice aim-charge", () => {
      if (sent) return;
      charge = c.id;
      refresh();
    });
    b.append(h("span", { class: "aim-big" }, c.label), h("span", { class: "aim-small" }, fillCard(copy.speed, { n: fmt(c.speed) })));
    chargeBtns.set(c.id, b);
  }
  for (const e of game.elevations) {
    const b = button(`${e.deg}°`, "aim-choice aim-elev", () => {
      if (sent) return;
      elevation = e.id;
      refresh();
    });
    elevBtns.set(e.id, b);
  }
  const right = h(
    "div",
    { class: "aim-right" },
    h("h2", { class: "screen-title" }, copy.headline),
    h("p", { class: "aim-body" }, copy.body),
    h("p", { class: "aim-label" }, copy.charge),
    h("div", { class: "aim-row" }, ...chargeBtns.values()),
    h("p", { class: "aim-hint" }, copy.chargeBy),
    h("p", { class: "aim-label" }, copy.elev),
    h("div", { class: "aim-row aim-row-wrap" }, ...elevBtns.values()),
    h("p", { class: "aim-hint" }, copy.elevBy),
    feedback,
  );

  const lock = button(copy.button, "primary main aim-lock", () => {
    if (sent) return;
    if (!charge || !elevation) {
      feedback.textContent = copy.pick;
      return;
    }
    sent = true;
    round.charge = charge;
    round.elevation = elevation;
    lock.classList.add("busy");
    app.send({ t: "aim", charge, elevation });
  });
  const actions = h("div", { class: "result-actions aim-actions" }, lock);

  const el = h("div", { class: "screen aim" }, header, left, right, actions);
  return {
    el,
    idle: "setup",
    onMessage: (m: ServerMsg) => {
      if (m.t === "aimed" && sent) app.show({ name: "mission", entry: "step1" });
      else if (m.t === "error" && sent) {
        sent = false;
        round.charge = null;
        lock.classList.remove("busy");
        feedback.textContent = copy.pick;
      }
    },
  };
}
