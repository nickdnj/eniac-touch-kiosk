// S14 Explore ENIAC (UX 14.3; PRD FR-90 to FR-95, FR-97, FR-98): walk the
// whole machine, a card for each unit, the units each mission uses, live
// lamps from a real core or none at all.
//
// Layout (1920 x 1080): header; the room (panorama) x24-1384 y112-752 with
// the arrows; the minimap y768-864, the wall labels, the readout and the
// mission chips; the rail x1408-1896 y112-1016 with the intro, a unit card
// or a mission card. Copy: explore/content.ts. Geometry: explore/room.ts.

import type { App, ExploreOpen, Screen, View } from "../app.ts";
import type { ServerMsg } from "../protocol.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { onTap, setDisabled, type TapPoint } from "../ui/tap.ts";
import { button } from "../ui/overlays.ts";
import { plate } from "../panels/art.ts";
import { fetchMission } from "../net/api.ts";
import { Panorama, type PanoTarget } from "../explore/panorama.ts";
import { planSvg, KIND_COLOUR } from "../explore/plan.ts";
import { ensureAttract, liveState } from "../explore/live.ts";
import { HONOR_PAGES, openHonor } from "./honor.ts";
import { CARDS, EXPLORE, MISSION_TAILS, PROGRAMMERS_LINK } from "../explore/content.ts";
import { TUBES } from "../tubes/content.ts";
import {
  MINIMAP,
  PANELS,
  PITCH,
  ROOM,
  STOPS,
  WALLS,
  andList,
  maxX,
  minimapBracket,
  minimapLetter,
  minimapToX,
  missionStops,
  missionTargets,
  missionUnitList,
  readout,
  stopOf,
  unitAtPanel,
  unitById,
  visibleRange,
  walkUnit,
  type Stop,
} from "../explore/room.ts";

function reduceMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The honor roll's page of the first programmers (1-based), or 0 if it is not shown (UX 14.3.7: card 12's link). */
function programmersPage(): number {
  return HONOR_PAGES.findIndex((p) => p.id === "programmers") + 1;
}

interface MissionInfo {
  id: string;
  order: number;
  title: string;
  targets: Set<string>;
  stops: Set<Stop>;
}

/** Compiled missions' units, fetched once (they come from the programs, never typed). */
const unitsCache = new Map<string, string[]>();

interface TourState {
  x: number;
  sel: Stop | null;
  selId: string | null;
  mission: string | null;
  allAcc: boolean;
  open: ExploreOpen;
}
/** Where the visitor was, kept while they look at the glossary. */
let saved: TourState | null = null;

/** Open Explore from anywhere (the picker, a briefing, a result, the glossary). */
export function openExplore(app: App, open: ExploreOpen): void {
  app.show({ name: "explore", explore: open });
}

export function exploreScreen(app: App, view: View): Screen {
  const open: ExploreOpen = view.explore?.restore && saved ? saved.open : view.explore ?? { from: "picker" };
  const st: TourState =
    view.explore?.restore && saved ? { ...saved } : { x: 0, sel: null, selId: null, mission: open.mission ?? null, allAcc: false, open };
  const missions = new Map<string, MissionInfo>();

  // ------------------------------------------------------------------ DOM
  const el = h("div", { class: "screen explore" });
  const backMission = open.mission ? (app.missions ?? []).find((m) => m.id === open.mission) : undefined;
  const backLabel =
    open.from === "picker" ? EXPLORE.back.picker : (open.from === "briefing" || open.from === "result") && backMission ? EXPLORE.back.mission(backMission.order) : EXPLORE.back.other;
  const header = h(
    "div",
    { class: "header" },
    button(`‹ ${backLabel}`, "light outline ex-back", () => goBack()),
    h("span", { class: "title" }, EXPLORE.title),
    h("span", { class: "spacer" }),
    // S16 "Keeping ENIAC alive" (docs/tubes.md 2.2): Back returns here, where the visitor was.
    button(TUBES.exploreButton, "light outline ex-tubes-btn", () => {
      saveState();
      app.openTubes({ from: "explore", back: { name: "explore", explore: { from: "tubes", restore: true } } });
    }),
    button(EXPLORE.glossary, "light outline ex-gloss-btn", () => openGlossary()),
  );

  const pano = new Panorama({
    lamps: { kind: "live", machine: () => app.mirror.machine },
    chips: true,
    onPick: (t) => pick(t),
    onMove: () => onMove(),
    reduceMotion,
  });
  const arrowL = h("div", { class: "ex-arrow l", role: "button", "aria-label": EXPLORE.arrows.left }, svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 72" width="48" height="72"><path d="M38 6 L10 36 L38 66" fill="none" stroke="#F4EFE3" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`));
  const arrowR = h("div", { class: "ex-arrow r", role: "button", "aria-label": EXPLORE.arrows.right }, svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 72" width="48" height="72"><path d="M10 6 L38 36 L10 66" fill="none" stroke="#F4EFE3" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`));
  onTap(arrowL, () => void pano.panBy(-1));
  onTap(arrowR, () => void pano.panBy(1));
  const pill = h("div", { class: "ex-pill hidden", role: "status" }, h("span", { class: "ex-pill-icon", "aria-hidden": "true" }, "◐"), h("span", {}, EXPLORE.resting));
  const liveChip = h("div", { class: "ex-live hidden", role: "status" }, h("span", { class: "ex-dot", "aria-hidden": "true" }), h("span", { class: "txt" }));
  const room = h("div", { class: "ex-room" }, pano.el, arrowL, arrowR, pill);

  // Minimap: 40 cells with letters, the on-screen bracket, the walls (UX 14.3.2).
  const cells = h("div", { class: "ex-cells" });
  for (let p = 0; p < PANELS; p++) {
    const u = unitAtPanel(p);
    const c = h("i", { class: `mc k-${u.kind}`, "data-p": String(p) }, minimapLetter(p));
    c.style.background = KIND_COLOUR[u.kind];
    cells.append(c);
  }
  const bracket = h("div", { class: "ex-bracket" });
  const minimap = h("div", { class: "ex-minimap", role: "button", "aria-label": EXPLORE.minimap }, cells, bracket);
  onTap(minimap, (p: TapPoint) => void pano.setX(minimapToX(p.x - 24 - MINIMAP.left)));
  const walls = h("div", { class: "ex-walls", "aria-hidden": "true" });
  for (const w of WALLS) {
    const d = h("div", { class: `wall ${w.id}` }, w.label);
    d.style.left = `${MINIMAP.left + w.from * MINIMAP.cell}px`;
    d.style.width = `${(w.to - w.from + 1) * MINIMAP.cell}px`;
    walls.append(d);
  }
  const readoutEl = h("div", { class: "ex-readout", "aria-live": "polite" });
  const mchips = h("div", { class: "ex-mchips" });
  const rail = h("div", { class: "ex-rail" });
  el.append(header, room, minimap, walls, readoutEl, liveChip, mchips, rail);

  // ------------------------------------------------------------------ state -> view
  function resting(): boolean {
    return liveState(app) === "resting";
  }

  function mission(): MissionInfo | null {
    return st.mission ? missions.get(st.mission) ?? null : null;
  }

  function onMove(): void {
    st.x = pano.x;
    const [a, b] = readout(pano.x);
    readoutEl.replaceChildren(`${EXPLORE.lookingAt} `, h("b", {}, a), ` ${EXPLORE.to} `, h("b", {}, b));
    const br = minimapBracket(pano.x);
    bracket.style.left = `${MINIMAP.left + br.left - 6}px`;
    bracket.style.width = `${br.width + 12}px`;
    setDisabled(arrowL, pano.x <= 0);
    setDisabled(arrowR, pano.x >= maxX());
    // The plan in the intro card follows what is on screen.
    const plan = rail.querySelector(".ex-plan-host[data-follow]");
    if (plan) plan.innerHTML = planSvg({ visible: visibleRange(pano.x) });
  }

  function rings(): void {
    const m = mission();
    pano.highlight(m ? m.targets : null, m ? String(m.order) : "");
    const sel: PanoTarget[] = [];
    if (st.sel === "acc") sel.push(...(st.allAcc ? ROOM.filter((u) => u.kind === "acc").map((u) => u.id) : st.selId ? [st.selId] : []));
    else if (st.sel === "ft" && st.selId) sel.push(st.selId);
    else if (st.sel === "pft" && st.selId) sel.push(`pft:${st.selId}`);
    else if (st.sel) sel.push(st.sel === "dt" || st.sel === "pt" ? st.sel : walkUnit(st.sel)?.id ?? st.sel);
    pano.select(sel.length ? sel : null);
    cells.querySelectorAll<HTMLElement>(".mc").forEach((c) => {
      const used = !!m && m.targets.has(unitAtPanel(Number(c.dataset.p)).id);
      c.classList.toggle("hl", used);
      c.classList.toggle("dim", !!m && !used);
    });
  }

  function missionChip(m: MissionInfo, cls: string, onTapFn: () => void): HTMLElement {
    const chip = h("div", { class: `mchip ${cls}${st.mission === m.id ? " on" : ""}`, role: "button", "data-mission": m.id }, h("i", {}, String(m.order)), m.title);
    onTap(chip, onTapFn);
    return chip;
  }

  function renderChips(): void {
    const list = [...missions.values()].sort((a, b) => a.order - b.order);
    mchips.replaceChildren();
    if (!list.length) return;
    mchips.append(h("span", { class: "lead" }, EXPLORE.showUnitsFor));
    for (const m of list) mchips.append(missionChip(m, "", () => setMission(st.mission === m.id ? null : m.id)));
    if (st.mission) {
      const clr = h("div", { class: "mchip clear", role: "button" }, EXPLORE.clear);
      onTap(clr, () => setMission(null));
      mchips.append(clr);
    }
  }

  function startButton(m: MissionInfo): HTMLElement {
    const down = resting();
    const b = button(down ? EXPLORE.restingButton : `${EXPLORE.startMission(m.order)} ›`, "primary ex-start", () => {
      if (resting()) return;
      void app.startMission(m.id, "briefing");
    });
    setDisabled(b, down);
    return b;
  }

  function renderRail(): void {
    rail.replaceChildren();
    rail.classList.toggle("card", !!st.sel);
    if (st.sel) return renderCard(st.sel);
    const m = mission();
    if (m) {
      const { names, count } = missionUnitList(m.targets);
      const body = `${EXPLORE.missionUses(m.title, count, andList(names))} ${MISSION_TAILS[m.id] ?? ""}`.trim();
      const marked = new Set<number>();
      for (const t of m.targets) {
        const u = unitById(t);
        if (u) for (let p = u.at; p < u.at + u.n; p++) marked.add(p);
      }
      rail.append(
        h("div", { class: "eyebrow" }, h("span", {}, EXPLORE.missionEyebrow(m.order))),
        h("h2", {}, m.title),
        h("p", { class: "body" }, body),
        h("p", { class: "rings-note" }, EXPLORE.missionRings),
        planBlock(planSvg({ marked }), null, false),
        h("div", { class: "rail-foot" }, startButton(m)),
      );
      return;
    }
    const walk = button(`${EXPLORE.intro.walk} ›`, "primary ex-walk", () => goStop(0));
    rail.append(
      h("div", { class: "eyebrow" }, h("span", {}, EXPLORE.intro.eyebrow)),
      h("h2", {}, EXPLORE.intro.title),
      h("p", { class: "body" }, EXPLORE.intro.body),
      planBlock(planSvg({ visible: visibleRange(pano.x) }), EXPLORE.planCaption, true),
      h("div", { class: "rail-foot" }, walk),
    );
  }

  /** The plan of the room; with no caption it is the mission card's smaller one. */
  function planBlock(svg: string, caption: string | null, follow: boolean): HTMLElement {
    const host = h("div", { class: "ex-plan-host", ...(follow ? { "data-follow": "" } : {}) });
    host.innerHTML = svg;
    return h("div", { class: `ex-plan-block${caption ? "" : " small"}` }, host, caption ? h("div", { class: "caption" }, caption) : null);
  }

  function banner(stop: Stop): HTMLElement {
    const host = h("div", { class: `banner${stop === "dt" || stop === "pt" ? " tray " + stop : ""}`, "aria-hidden": "true" });
    if (stop === "dt" || stop === "pt") {
      host.append(h("span", { class: "bar" }), h("span", { class: "wires" }));
      return host;
    }
    const lines = CARDS[stop].plate;
    host.append(svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 96" width="440" height="96">${plate(6, 6, 428, 84, lines, lines.length > 1 ? 30 : 34)}</svg>`));
    return host;
  }

  function cardTitle(stop: Stop): string {
    if ((stop === "acc" || stop === "ft") && st.selId) return unitById(st.selId)?.name ?? CARDS[stop].title;
    return CARDS[stop].title;
  }

  function liveLine(): string {
    if (st.sel !== "acc" || st.allAcc || !st.selId) return "";
    const n = st.selId.slice(1);
    const a = app.mirror.machine?.acc?.[n];
    if (!a) return "";
    const v = a.value < 0 ? `-${String(-a.value).padStart(10, "0")}` : String(a.value).padStart(10, "0");
    return EXPLORE.liveAcc(n, v);
  }

  function renderCard(stop: Stop): void {
    const i = STOPS.indexOf(stop);
    const card = CARDS[stop];
    const tag = stop === "acc" && st.selId && !st.allAcc ? EXPLORE.oneOf20 : card.tag;
    const close = h("div", { class: "close", role: "button", "aria-label": EXPLORE.close }, "✕");
    onTap(close, () => closeCard());
    const used = [...missions.values()].filter((m) => m.stops.has(stop)).sort((a, b) => a.order - b.order);
    const usedEl = h("div", { class: "used" }, h("span", { class: "used-h" }, EXPLORE.usedIn));
    if (used.length) usedEl.append(h("div", { class: "row" }, ...used.map((m) => missionChip(m, "dark", () => setMission(st.mission === m.id ? null : m.id)))));
    else if (missions.size) usedEl.append(h("span", { class: "used-none" }, stop === "cyc" ? EXPLORE.usedCycling : EXPLORE.usedNone));
    let link: HTMLElement | null = null;
    if (stop === "acc") {
      link = button(st.allAcc ? EXPLORE.allAccOff : EXPLORE.allAcc, "link ex-link all-acc", () => {
        st.allAcc = !st.allAcc;
        rings();
        renderRail();
      });
    } else if (stop === "pt" && programmersPage()) {
      link = button(`${PROGRAMMERS_LINK} ›`, "link ex-link programmers-link", () => {
        saveState();
        openHonor(app, programmersPage(), { name: "explore", explore: { from: "honor", restore: true } });
      });
    }
    const prev = button(`‹ ${EXPLORE.previous}`, "primary outline ex-prev", () => goStop(i - 1));
    setDisabled(prev, i === 0);
    const next = button(i === STOPS.length - 1 ? EXPLORE.finish : `${EXPLORE.next} ›`, "primary ex-next", () => {
      if (i === STOPS.length - 1) {
        app.metric({ t: "metric", ev: "explore_walk_completed" });
        closeCard();
      } else goStop(i + 1);
    });
    rail.append(
      h("div", { class: "eyebrow" }, h("span", {}, `${EXPLORE.of(i + 1, STOPS.length)} · ${tag.toUpperCase()}`), close),
      banner(stop),
      h("h2", {}, cardTitle(stop)),
      h("p", { class: "body" }, card.body),
      h("p", { class: "live-line", "aria-live": "polite" }, liveLine()),
      ...(link ? [link] : []),
      usedEl,
      h("div", { class: "nav" }, prev, next),
    );
  }

  function render(): void {
    rings();
    renderChips();
    renderRail();
    onMove();
    renderLive();
  }

  function renderLive(): void {
    const ls = liveState(app);
    pill.classList.toggle("hidden", ls !== "resting");
    const txt =
      ls === "attract" ? EXPLORE.live.attract : ls === "mission" ? EXPLORE.live.mission(missions.get(app.mirror.session?.mission ?? "")?.order ?? (app.mission?.order ?? 0)) : ls === "waking" ? EXPLORE.live.waking : ls === "between" ? EXPLORE.live.between : "";
    liveChip.classList.toggle("hidden", !txt);
    liveChip.classList.toggle("on", ls === "attract" || ls === "mission");
    (liveChip.querySelector(".txt") as HTMLElement).textContent = txt;
    rail.querySelectorAll<HTMLElement>(".ex-start").forEach((b) => {
      setDisabled(b, ls === "resting");
      const m = mission();
      if (m) b.textContent = ls === "resting" ? EXPLORE.restingButton : `${EXPLORE.startMission(m.order)} ›`;
    });
  }

  // ------------------------------------------------------------------ actions
  function pick(t: PanoTarget): void {
    const stop = stopOf(t);
    if (!stop) return;
    const id = stop === "acc" || stop === "ft" ? t : stop === "pft" ? t.slice(4) : null;
    if (st.sel === stop && st.selId === id) return; // the same unit again: no change (UX 14.3.5)
    openCard(stop, id);
    void pano.reveal(t);
  }

  function openCard(stop: Stop, id: string | null): void {
    st.sel = stop;
    st.selId = id;
    st.allAcc = false;
    app.metric({ t: "metric", ev: "explore_card", unit: stop });
    rings();
    renderRail();
  }

  /** Previous / Next / Walk the room: the stop, panned to (a long pan is capped). */
  function goStop(i: number): void {
    if (i < 0 || i >= STOPS.length) return;
    const stop = STOPS[i];
    const u = walkUnit(stop);
    openCard(stop, stop === "acc" || stop === "ft" || stop === "pft" ? u?.id ?? null : null);
    if (u) void pano.centreOn(stop === "pft" ? `pft:${u.id}` : u.id);
  }

  function closeCard(): void {
    st.sel = null;
    st.selId = null;
    st.allAcc = false;
    rings();
    renderRail();
  }

  function setMission(id: string | null): void {
    st.mission = id;
    if (id) app.metric({ t: "metric", ev: "explore_mission_chip", mission: id });
    rings();
    renderChips();
    renderRail();
    const m = mission();
    if (m && !st.sel) {
      // Pan to the first unit it uses (UX 14.3.3 state C).
      const first = ROOM.find((u) => m.targets.has(u.id));
      if (first) void pano.setX(Math.max(0, first.at * PITCH - 40));
    }
  }

  function saveState(): void {
    saved = { ...st, x: pano.x };
  }

  function openGlossary(): void {
    saveState();
    app.show({ name: "glossary", explore: { from: "explore", back: { name: "explore", explore: { from: "glossary", restore: true } } } });
  }

  function goBack(): void {
    saved = null;
    app.show(open.back ?? { name: "picker" });
  }

  async function loadMissions(): Promise<void> {
    const list = (app.missions ?? []).filter((m) => m.available);
    for (const m of list) {
      let units = unitsCache.get(m.id);
      if (!units && app.mission?.id === m.id) units = app.mission.units;
      if (!units) {
        try {
          units = (await fetchMission(m.id)).units;
        } catch {
          continue; // its chip is simply not offered
        }
      }
      unitsCache.set(m.id, units);
      const targets = missionTargets(units);
      missions.set(m.id, { id: m.id, order: m.order, title: m.title, targets, stops: missionStops(targets) });
    }
    if (disposed) return;
    rings();
    renderChips();
    renderRail();
    if (st.mission && !view.explore?.restore) setMission(st.mission);
  }

  let disposed = false;
  let liveTimer: ReturnType<typeof setInterval> | null = null;
  return {
    el,
    idle: "explore",
    coreOptional: true,
    mount: () => {
      pano.mount();
      void pano.setX(st.x, { ms: 0 });
      // A card asked for by the opener (the glossary's "Show me", the honor roll's link).
      const card = view.explore?.card as Stop | undefined;
      if (card && (STOPS as readonly string[]).includes(card)) goStop(STOPS.indexOf(card));
      render();
      if (!view.explore?.restore) app.metric({ t: "metric", ev: "explore_open", screen: open.from, ...(open.mission ? { mission: open.mission } : {}) });
      ensureAttract(app);
      // Keep asking (rate-limited) while open: after a core recovery there may be no other message.
      liveTimer = setInterval(() => {
        if (ensureAttract(app)) renderLive();
      }, 2000);
      void loadMissions();
    },
    unmount: () => {
      disposed = true;
      if (liveTimer) clearInterval(liveTimer);
      pano.dispose();
    },
    onMessage: (m: ServerMsg) => {
      if (m.t === "session" || m.t === "health" || m.t === "state" || m.t === "hello" || m.t === "attract") {
        ensureAttract(app);
        renderLive();
      }
    },
    onMachine: (units) => {
      pano.invalidate(units);
      if (units === null || units.some((u) => st.selId && u === `acc.${st.selId.slice(1)}`)) {
        const ll = rail.querySelector<HTMLElement>(".live-line");
        if (ll) ll.textContent = liveLine();
      }
      if (units === null) renderLive();
    },
  };
}
