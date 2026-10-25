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
import { newRound, zones } from "../game/logic.ts";
import { drawFlag, drawShip, drawZones, outerFeet } from "../game/zones.ts";
import { gunIcon, shipIcon, warship, type Warship } from "../game/warship.ts";
import { fetchScores } from "../net/api.ts";
import { firingTable } from "../game/firingtable.ts";

const W = 800;
const H = 360;
const PAD = 40;
const GROUND = 280;

export function aimScreen(app: App): Screen {
  const mission = app.mission!;
  const game = mission.content.game!;
  const copy = game.aim;
  const forced = app.devTarget ? game.targets.find((t) => String(t.feet) === app.devTarget || t.id === app.devTarget) : undefined;
  const round = (app.game ??= newRound(game, Math.random, forced));
  let ship = round.ship;
  let charge = round.charge;
  let elevation = round.elevation;
  let sent = false;

  const header = h("div", { class: "header" }, h("span", { class: "title" }, COPY.header.mission(mission.order, mission.title)));

  // ------------------------------------------------------------------ left: the range
  const reach = outerFeet(game, round.target, round.hit) * 1.2;
  const targetText = (c: string) => fillCard(c, { feet: fmt(round.target), name: round.name || game.board.flag });
  const X = (feet: number) => PAD + (feet / reach) * (W - 2 * PAD);
  const step = reach > 60000 ? 20000 : reach > 25000 ? 10000 : 5000;
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "aim-range", role: "img", "aria-label": targetText(copy.target) });
  svg.append(s("line", { x1: PAD, y1: GROUND, x2: W - PAD, y2: GROUND, class: "aim-ground" }));
  for (let f = 0; f <= reach; f += step) {
    svg.append(s("line", { x1: X(f), y1: GROUND, x2: X(f), y2: GROUND + 12, class: "aim-tick" }));
    svg.append(s("text", { x: X(f), y: GROUND + 40, class: "aim-tick-text", "text-anchor": "middle" }, f === 0 ? "0" : `${fmt(f)}`));
  }
  drawZones(svg, game, round.target, X, GROUND, 60, GROUND + 68, round.hit);
  if (game.kind === "ship") drawShip(svg, X(round.target), GROUND, round.name || game.board.flag);
  else drawFlag(svg, X(round.target), GROUND, game.board.flag);
  const deg = () => game.elevations.find((e) => e.id === elevation)?.deg ?? 0;
  let turn: () => void;
  // The ship draws as the visitor's own ship once chosen (Battleship); otherwise a field gun on its wheel.
  const mine = s("g", { class: "aim-mine" });
  const myShip = game.ships?.length ? { ref: null as Warship | null, id: "" } : null;
  if (myShip) {
    svg.append(mine);
    const place = () => {
      mine.replaceChildren();
      if (!ship) {
        myShip.ref = null;
        myShip.id = "";
        return;
      }
      if (myShip.id !== ship) {
        myShip.ref = warship(ship);
        myShip.id = ship;
      }
      const k = 0.62;
      myShip.ref!.g.setAttribute("transform", `translate(${X(0) + 92} ${GROUND + 4}) scale(${k})`);
      mine.append(myShip.ref!.g);
      myShip.ref!.aim(deg());
    };
    turn = place;
  } else {
    const barrel = s("g", { class: "aim-gun", transform: `translate(${X(0) + 26} ${GROUND - 18})` });
    const tube = s("rect", { x: 0, y: -8, width: 78, height: 16, rx: 4, class: "aim-barrel" });
    barrel.append(tube);
    svg.append(s("circle", { cx: X(0) + 26, cy: GROUND - 18, r: 18, class: "aim-wheel" }), barrel);
    turn = () => barrel.setAttribute("transform", `translate(${X(0) + 26} ${GROUND - 18}) rotate(${-deg()})`);
  }
  turn();
  const targetLine = h("div", { class: "aim-target" }, targetText(copy.target));
  const beat = h("div", { class: "aim-beat" });
  const visit = app.gameVisit;
  const visitLine = h("div", { class: "aim-visit" }, visit.shots ? `${fillCard(game.board.shots, { n: visit.shots })}   ·   ${fillCard(game.board.best, { n: visit.best })}` : "");
  void fetchScores(mission.id).then((b) => {
    const top = b?.today[0];
    if (top) beat.textContent = fillCard(game.board.beat, { n: top.score });
  });
  const legend = h(
    "div",
    { class: "aim-legend" },
    ...zones(game, round.target, round.hit).slice().reverse().map((z) => h("span", { class: `aim-chip z-${z.cls}` }, z.label)),
  );
  const left = h("div", { class: "aim-left" }, targetLine, beat, visitLine, svg, h("div", { class: "aim-legend-text" }, copy.zones), legend, h("div", { class: "aim-unit" }, "feet from the gun"));

  // ------------------------------------------------------------------ right: the two choices
  const feedback = h("p", { class: "aim-feedback", "aria-live": "polite" });
  const chargeBtns = new Map<string, HTMLElement>();
  const elevBtns = new Map<string, HTMLElement>();
  const shipBtns = new Map<string, HTMLElement>();
  const gunRow = h("div", { class: "aim-row" });
  const gunsOf = (): string[] => (game.ships?.length ? game.ships.find((x) => x.id === ship)?.guns ?? [] : game.charges.map((c) => c.id));
  /** Shows the guns the chosen ship carries (all of them when the mission has no ships). */
  const showGuns = () => {
    const ids = gunsOf();
    if (charge && !ids.includes(charge)) charge = null;
    gunRow.replaceChildren(...(ids.length ? ids.map((id) => chargeBtns.get(id)!) : [h("div", { class: "aim-pick-ship" }, copy.pickShip ?? "")]));
  };
  const refresh = () => {
    shipBtns.forEach((b, id) => b.classList.toggle("chosen", id === ship));
    showGuns();
    chargeBtns.forEach((b, id) => b.classList.toggle("chosen", id === charge));
    elevBtns.forEach((b, id) => b.classList.toggle("chosen", id === elevation));
    turn();
    feedback.textContent = "";
  };
  for (const sh of game.ships ?? []) {
    const b = button("", "aim-choice aim-ship", () => {
      if (sent) return;
      ship = sh.id;
      refresh();
    });
    b.append(shipIcon(sh.id) as unknown as HTMLElement, h("span", { class: "aim-big" }, sh.label));
    shipBtns.set(sh.id, b);
  }
  for (const c of game.charges) {
    const b = button("", "aim-choice aim-charge", () => {
      if (sent) return;
      charge = c.id;
      refresh();
    });
    if (game.ships?.length) b.append(gunIcon(c.speed) as unknown as HTMLElement);
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
    ...(game.ships?.length ? [h("p", { class: "aim-label" }, copy.ship ?? ""), h("div", { class: "aim-row" }, ...shipBtns.values())] : []),
    h("p", { class: "aim-label" }, copy.charge),
    gunRow,
    h("p", { class: "aim-hint" }, copy.chargeBy),
    h("p", { class: "aim-label" }, copy.elev),
    h("div", { class: "aim-row aim-row-wrap" }, ...elevBtns.values()),
    h("p", { class: "aim-hint" }, copy.elevBy),
    feedback,
  );

  const lock = button(copy.button, "primary main aim-lock", () => {
    if (sent) return;
    if (!charge || !elevation || (game.ships?.length && !ship)) {
      feedback.textContent = copy.pick;
      return;
    }
    sent = true;
    round.ship = ship;
    round.charge = charge;
    round.elevation = elevation;
    lock.classList.add("busy");
    app.send({ t: "aim", charge, elevation });
  });
  // The firing table: a docent's page (docent mode only); a visitor tries the game without it.
  const tableBtn =
    app.docent && game.table?.length
      ? button(game.firing?.button ?? "Firing table", "aim-table", () => {
          const page = firingTable({
            game,
            target: round.target,
            name: round.name,
            hit: round.hit,
            ship,
            onClose: () => page.remove(),
            onUse: (gun, elev) => {
              ship = game.ships?.find((sh) => sh.guns.includes(gun))?.id ?? ship;
              charge = gun;
              elevation = elev;
              refresh();
              page.remove();
            },
          });
          el.append(page);
        })
      : null;
  const actions = h("div", { class: "result-actions aim-actions" }, ...(tableBtn ? [tableBtn] : []), lock);
  showGuns();

  const el = h("div", { class: "screen aim" }, header, left, right, actions);
  return {
    el,
    idle: "setup",
    onMessage: (m: ServerMsg) => {
      // The wiring is not the game: once the gun is aimed the bridge places every cable and switch,
      // then the walk through the room (screens/build.ts) shows what ENIAC uses.
      if (m.t === "aimed" && sent) app.send({ t: "skip_setup" });
      else if (m.t === "setup_complete" && sent) app.show({ name: "build" });
      else if (m.t === "error" && sent) {
        sent = false;
        round.charge = null;
        lock.classList.remove("busy");
        feedback.textContent = copy.pick;
      }
    },
  };
}
