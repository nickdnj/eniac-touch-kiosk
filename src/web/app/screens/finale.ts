// S8 Finale (UX 14.5, PRD FR-45): the payoff after all three missions.
// Five beats, at most 85 s, skippable at any moment:
//   F1 "You programmed ENIAC." with this visit's real results;
//   F2 the panorama with every unit the visitor used ringed (needs the room:
//      skipped when the core is down; its lamps are live or dark, never fake);
//   F3 Brian L. Stuart's credit; F4 the people who made ENIAC;
//   F5 thanks, Start over for the next visitor or Explore ENIAC; S1 after 20 s.
//
// Sequencing, figures and the units count: finale/beats.ts (pure, tested).
// Words: content/finale.ts and content/honor.ts. Styles: styles/finale.css.
//
// Static-capable (UX 14.7): with the core down F1, F3, F4 and F5 keep
// working (coreOptional); the bridge down for 5 s is S10 like everywhere.
// Idle: the beat timers are the idle rule (no "Still there?").
//
// S16 "Keeping ENIAC alive" is a separate screen: F2's chip opens it with
// app.openTubes, and leaving it (Finish, X) or Explore comes back to F5.

import type { App, Screen, View } from "../app.ts";
import type { ServerMsg } from "../protocol.ts";
import { h } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { button } from "../ui/overlays.ts";
import { fetchMission } from "../net/api.ts";
import { Panorama } from "../explore/panorama.ts";
import { ensureAttract, liveState } from "../explore/live.ts";
import { EXPLORE } from "../explore/content.ts";
import { HONOR, shown } from "../content/honor.ts";
import { FINALE } from "../content/finale.ts";
import { personPlate, programmerPlates, qrBlock, stuartPlate } from "../ui/plates.ts";
import { BEATS, BeatSequencer, f1Content, f2Caption, panelsUsed, unitsUsed, type Beat, type MissionInfo } from "../finale/beats.ts";

function reduceMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** F2's panorama: 1760 px wide at 90% of the Explore pitch (UX 14.3.2), no chips, inert. */
const PANO = { scale: 0.9, viewW: 1956 } as const;
/** The slow pass: a short look at the left wall, then one linear pan to the right end. */
const PASS = { holdMs: 900, panMs: 12_500 } as const;
/** Reduced motion: four fixed framings, cross-faded (UX 14.5.3). */
const FRAMINGS = 4;
const FRAMING_MS = 3500;
/** F4: one name every 400 ms (UX 14.5.2). */
const NAME_MS = 400;

/** Compiled missions' unit lists, fetched once (they come from the programs). */
const unitsCache = new Map<string, string[]>();

/** Opens the finale (from S7's Finish, the picker chip, or back from Explore / S16 on F5). */
export function openFinale(app: App, beat: Beat = 1): void {
  app.show({ name: "finale", beat });
}

export function finaleScreen(app: App, view: View): Screen {
  const reduced = reduceMotion();
  const first = ((view.beat ?? 1) as Beat) || 1;
  const missions: MissionInfo[] = (app.missions ?? []).filter((m) => m.available).map((m) => ({ id: m.id, order: m.order, title: m.title }));
  const summary = app.visit.summary();
  if (!missions.length) for (const [i, id] of summary.done.entries()) missions.push({ id, order: i + 1, title: id });

  // ------------------------------------------------------------------ frame
  const host = h("div", { class: "fin-host" });
  const dots = h(
    "div",
    { class: "fin-dots", role: "img" },
    ...BEATS.map((b) => h("i", { class: "fin-dot", "data-beat": String(b) })),
  );
  const skip = button(FINALE.skip, "light outline fin-skip", () => {
    if (seq.beat === null || seq.beat === 5) return;
    app.metric({ t: "metric", ev: "finale_skipped_at", n: seq.beat });
    seq.skip();
  });
  const next = button(`${FINALE.next} ›`, "primary light fin-next", () => seq.next());
  const el = h("div", { class: `screen finale${reduced ? " reduced" : ""}` }, host, dots, skip, next);
  // A touch anywhere on a beat (not on a button) advances; on F5 it holds.
  onTap(el, () => seq.next());
  el.addEventListener("pointerdown", () => seq.hold());

  // ------------------------------------------------------------------ units (F2)
  let targets = new Set<string>();
  let panels: number | null = null;
  let unitsReady = false;
  async function loadUnits(): Promise<void> {
    const lists: string[][] = [];
    let missing = false;
    for (const id of summary.done) {
      let u = unitsCache.get(id);
      if (!u && app.mission?.id === id) u = app.mission.units;
      if (!u) {
        try {
          u = (await fetchMission(id)).units;
        } catch {
          missing = true; // its units are not ringed and no count is shown (never a guess)
          continue;
        }
      }
      unitsCache.set(id, u);
      lists.push(u);
    }
    targets = unitsUsed(lists);
    panels = missing || !lists.length ? null : panelsUsed(targets);
    unitsReady = true;
    if (disposed) return;
    if (seq.beat === 2) f2Refresh();
  }

  // ------------------------------------------------------------------ beat state
  let timers: ReturnType<typeof setTimeout>[] = [];
  let pano: Panorama | null = null;
  let f2: { caption: HTMLElement; pill: HTMLElement; live: HTMLElement } | null = null;
  let disposed = false;

  function later(fn: () => void, ms: number): void {
    timers.push(setTimeout(fn, ms));
  }

  function clearBeat(): void {
    for (const t of timers) clearTimeout(t);
    timers = [];
    pano?.dispose();
    pano = null;
    f2 = null;
  }

  function roomUp(): boolean {
    return app.link.isOpen && app.mirror.health.core !== "down";
  }

  const seq = new BeatSequencer({
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
    canShowRoom: roomUp,
    show: (b) => showBeat(b),
    end: () => app.show({ name: "start" }),
  });

  function showBeat(b: Beat): void {
    clearBeat();
    const beat = BUILD[b]();
    beat.classList.add("fin-beat", `beat-f${b}`);
    beat.dataset.beat = String(b);
    host.replaceChildren(beat);
    el.dataset.beat = String(b);
    dots.querySelectorAll<HTMLElement>(".fin-dot").forEach((d) => d.classList.toggle("on", d.dataset.beat === String(b)));
    dots.setAttribute("aria-label", FINALE.progress(b, BEATS.length));
    const last = b === 5;
    skip.classList.toggle("hidden", last);
    next.classList.toggle("hidden", last);
    app.metric({ t: "metric", ev: "finale_beat", n: b });
    if (b === 2) f2Start();
    if (b === 4) f4Reveal(beat);
  }

  // ------------------------------------------------------------------ F1
  function beatF1(): HTMLElement {
    const c = f1Content(summary, missions);
    return h(
      "div",
      {},
      h("h1", { class: "fin-title big" }, FINALE.f1.title),
      h("p", { class: "fin-line" }, c.line),
      h(
        "div",
        { class: "fin-mplates" },
        ...c.plates.map((p) =>
          h(
            "div",
            { class: `plate fin-mplate${p.figure ? " figure" : ""}`, "data-mission": p.id },
            ...rivets(),
            h("div", { class: "fin-mhead" }, h("span", { class: "fin-badge" }, String(p.order)), h("span", { class: "plate-kicker" }, p.title)),
            h("div", { class: "fin-mtext" }, ...figureText(p.text)),
          ),
        ),
      ),
      c.hand ? h("p", { class: "fin-hand" }, c.hand) : null,
    );
  }

  // ------------------------------------------------------------------ F2
  function beatF2(): HTMLElement {
    const caption = h("p", { class: "fin-caption" });
    const pill = h("div", { class: "fin-pill hidden", role: "status" }, h("span", { "aria-hidden": "true" }, "◐"), h("span", {}, FINALE.f2.resting));
    const live = h("div", { class: "fin-live hidden", role: "status" }, h("span", { class: "fin-ldot", "aria-hidden": "true" }), h("span", { class: "txt" }));
    pano = new Panorama({ lamps: { kind: "live", machine: () => app.mirror.machine }, viewW: PANO.viewW, scale: PANO.scale, reduceMotion: () => reduced });
    f2 = { caption, pill, live };
    const exploreBtn = button(`${FINALE.f2.explore} ›`, "primary light fin-explore", () => toExplore());
    // docs/tubes.md 2.7: S16's Finish and X return to F5.
    const tubesBtn = button(`${FINALE.f2.tubesChip} ›`, "light outline fin-tubes", () => app.openTubes({ from: "finale", back: { name: "finale", beat: 5 } }));
    return h(
      "div",
      {},
      h("h1", { class: "fin-title" }, FINALE.f2.title),
      live,
      h(
        "div",
        { class: "fin-room" },
        pano.el,
        h("span", { class: "fin-tray-tag d", "aria-hidden": "true" }, FINALE.f2.digitTrays),
        h("span", { class: "fin-tray-tag p", "aria-hidden": "true" }, FINALE.f2.programTrays),
        pill,
      ),
      caption,
      h("p", { class: "fin-tubes-line" }, FINALE.f2.tubes),
      h("div", { class: "fin-actions f2" }, exploreBtn, tubesBtn),
    );
  }

  function f2Start(): void {
    const p = pano;
    if (!p) return;
    p.mount();
    void p.setX(0, { ms: 0 });
    f2Refresh();
    if (reduced) {
      // Four fixed framings with cross-fades instead of the slow pass.
      for (let i = 1; i < FRAMINGS; i++) later(() => void p.setX((p.maxX * i) / (FRAMINGS - 1), { ms: 200 }), i * FRAMING_MS);
    } else later(() => void p.setX(p.maxX, { ms: PASS.panMs, easing: "linear" }), PASS.holdMs);
  }

  function f2Refresh(): void {
    if (!f2 || !pano) return;
    if (unitsReady) {
      pano.highlight(targets);
      f2.caption.textContent = f2Caption(panels);
    }
    f2Live();
  }

  /** The lamps' honest label: live (attract flight), or resting with the core down. */
  function f2Live(): void {
    if (!f2) return;
    const ls = liveState(app);
    f2.pill.classList.toggle("hidden", ls !== "resting");
    const txt = ls === "attract" ? EXPLORE.live.attract : ls === "mission" ? FINALE.f2.live : "";
    f2.live.classList.toggle("hidden", !txt);
    (f2.live.querySelector(".txt") as HTMLElement).textContent = txt;
  }

  // ------------------------------------------------------------------ F3
  function beatF3(): HTMLElement {
    return h(
      "div",
      {},
      h("h1", { class: "fin-title" }, FINALE.f3.title),
      h("div", { class: "fin-stuart" }, stuartPlate("beat"), h("p", { class: "fin-stuart-line" }, HONOR.stuart.finaleLine)),
      h("div", { class: "fin-qr" }, qrBlock(HONOR.stuart.qr, 260, "main")),
    );
  }

  // ------------------------------------------------------------------ F4
  function beatF4(): HTMLElement {
    const b = HONOR.builders;
    const people = b.people.filter(shown).map((p) => personPlate(p, { cls: "builder" }));
    const bodies = b.bodies.filter(shown).map((p) => personPlate(p, { cls: "institution" }));
    const group = (title: string, cls: string, plates: HTMLElement[]) =>
      plates.length ? h("div", { class: `fin-group ${cls}` }, h("div", { class: "plate-kicker" }, title), h("div", { class: "fin-grid" }, ...plates)) : null;
    return h(
      "div",
      {},
      h("h1", { class: "fin-title" }, FINALE.f4.title),
      group(HONOR.programmers.role, "programmers", programmerPlates()),
      group(FINALE.f4.team, "team", people),
      group(FINALE.f4.bodies, "bodies", bodies),
      h("p", { class: "fin-thanks" }, HONOR.finaleThanks),
    );
  }

  /** The names fade in one by one: the programmers, then the team, then the institutions (all at once when motion is reduced). */
  function f4Reveal(beat: HTMLElement): void {
    const plates = [...beat.querySelectorAll<HTMLElement>(".person-plate")];
    for (const p of plates) p.classList.add("reveal");
    if (reduced) {
      for (const p of plates) p.classList.add("on");
      return;
    }
    plates.forEach((p, i) => later(() => p.classList.add("on"), 200 + i * NAME_MS));
  }

  // ------------------------------------------------------------------ F5
  function beatF5(): HTMLElement {
    return h(
      "div",
      {},
      h("h1", { class: "fin-title big" }, FINALE.f5.title),
      h("p", { class: "fin-line" }, FINALE.f5.line),
      h(
        "div",
        { class: "fin-actions f5" },
        button(FINALE.f5.startOver, "primary light fin-start-over", () => {
          app.metric({ t: "metric", ev: "finale_start_over" });
          app.show({ name: "start" });
        }),
        button(FINALE.f5.explore, "primary light outline fin-explore5", () => toExplore()),
      ),
    );
  }

  function toExplore(): void {
    app.metric({ t: "metric", ev: "finale_explore" });
    app.show({ name: "explore", explore: { from: "finale", back: { name: "finale", beat: 5 } } });
  }

  const BUILD: Record<Beat, () => HTMLElement> = { 1: beatF1, 2: beatF2, 3: beatF3, 4: beatF4, 5: beatF5 };

  let liveTimer: ReturnType<typeof setInterval> | null = null;
  return {
    el,
    idle: "none",
    coreOptional: true,
    mount: () => {
      if (first === 1) app.metric({ t: "metric", ev: "finale_reached" });
      // F2's live lamps come from the attract loop (as in Explore): ask now, so the room is lit by F2.
      ensureAttract(app);
      liveTimer = setInterval(() => ensureAttract(app), 2000);
      void loadUnits();
      seq.start(first);
    },
    unmount: () => {
      disposed = true;
      seq.stop();
      clearBeat();
      if (liveTimer) clearInterval(liveTimer);
    },
    onMessage: (m: ServerMsg) => {
      if (m.t === "session" || m.t === "health" || m.t === "state" || m.t === "hello" || m.t === "attract") {
        ensureAttract(app);
        f2Live();
      }
    },
    onMachine: (units) => {
      pano?.invalidate(units);
      if (units === null) f2Live();
    },
  };
}

/** The visit's real numbers in lamp colour; an equation never breaks across lines. */
function figureText(text: string): (string | HTMLElement)[] {
  return text
    .replace(/ (x|=) /g, " $1 ")
    .split(/(\d[\d,]*(?: [x=] \d[\d,]*)*)/)
    .filter(Boolean)
    .map((s) => (/^\d/.test(s) ? h("span", { class: "num" }, s) : s));
}

function rivets(): HTMLElement[] {
  return ["tl", "tr", "bl", "br"].map((c) => h("span", { class: `rivet ${c}`, "aria-hidden": "true" }));
}
